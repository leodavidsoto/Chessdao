# ChessDAO — Inspección y Plan de Mejora Total

> Auditoría técnica del repositorio (Next.js 14 + Socket.io + TON/Solana + bot de Telegram + app Android/Capacitor).
> Fecha: 2026-07-03. Rama: `claude/inspection-improvement-plan-vs9oz3`.

## 1. Resumen ejecutivo

ChessDAO es una plataforma de ajedrez con apuestas en tokens, integrada en Telegram (Mini App + bot), con
frontend Next.js, servidor de partidas en tiempo real (Socket.io) y una capa cripto que está **a medio migrar
de Solana a TON**. El producto funciona como demo, pero **no es seguro para manejar dinero real** en su estado
actual. Los problemas más graves son de **integridad económica** (autenticación ausente, estado en memoria,
verificación de pagos incompleta) más que de estilo.

**Semáforo de áreas:**

| Área | Estado | Nota |
|------|--------|------|
| Autenticación / autorización | 🔴 Crítico | No hay verificación de identidad en las APIs; el balance se indexa por `walletAddress` sin firma |
| Integridad de pagos / tokens | 🔴 Crítico | Verificación TON deja el crédito como `TODO`; almacenes en memoria pierden dinero al reiniciar |
| Motor de partida (anti-trampa) | 🟠 Alto | Toda la lógica vive en el cliente y en `global`; resultado reportado por el propio jugador |
| Migración Solana→TON | 🟠 Alto | Código muerto de Solana convive con TON; dependencias pesadas duplicadas |
| Persistencia / arquitatura de datos | 🟠 Alto | `global.*` como base de datos; 4 helpers `getDb()` duplicados |
| Rate limiting / abuso | 🟡 Medio | Limitador en memoria, se resetea por instancia; no sirve en multi-réplica |
| Higiene del repo | 🟡 Medio | `logo.png` de 3 MB versionado; contratos Rust/Tact/FunC solapados |
| Tests / CI | 🟡 Medio | No hay CI; solo un test de contrato TON y un `__init__.py` vacío |

## 2. Hallazgos críticos (bloqueantes para producción con dinero real)

### C1 — Las APIs no autentican al usuario
Rutas como `app/api/balance/route.js`, `app/api/payments/credit-tokens/route.js` y las de `user/*` confían en
un `walletAddress`/`userId` enviado en el body o query **sin ninguna prueba de propiedad**. Cualquiera puede:
- Consultar/mutar el balance de otra wallet pasando su dirección.
- Acreditar tokens a una wallet arbitraria.

Además, `app/api/balance/route.js` **regala 1000 CHESS + 500 GAME a cada wallet nueva** en un simple `GET`, sin
límite: un bucle sobre direcciones inventadas mina saldo infinito.

**Arreglo:** introducir autenticación real. En contexto Telegram, validar `initData` con HMAC-SHA256 usando el
`BOT_TOKEN` (algoritmo oficial de Telegram WebApp) y derivar el `userId` del payload firmado, nunca del cliente.
Para wallets, exigir firma de un *nonce* (challenge) antes de asociar/usar una dirección. Centralizar en un
único middleware/util `requireAuth()`.

### C2 — La verificación de pago TON no acredita y es falsificable
`app/api/payments/ton/verify/route.js`:
- El crédito real es un comentario `// TODO: Credit CHESS tokens` (línea 88); el "verified: true" se emite sin
  que el saldo se haya movido de forma consistente.
- `verifiedPayments` es un `Set` en memoria → se pierde en cada redeploy/instancia, permitiendo doble cobro o
  pérdida de pagos legítimos.
- El emparejamiento de transacción se basa en que el `comment` on-chain *contenga* el `paymentId`
  (`comment.includes(paymentId)`), sin exigir igualdad ni unicidad → colisión/replay triviales.
- La tolerancia de importe (`< expectedAmount * 0.99`) permite pagar de menos.

**Arreglo:** mover el registro de pagos verificados a la base de datos con índice único sobre `paymentId` y sobre
el hash de transacción; exigir coincidencia exacta de comentario y del importe con la tolerancia hacia arriba;
hacer el crédito **atómico** con la verificación (misma transacción lógica, idempotente por `txHash`).

### C3 — El estado del juego y los saldos viven en `global` / memoria
`server.js` (GameManager en RAM) y múltiples rutas (`global.gamesStorage`, `global.balancesStorage`,
`global.paymentsStorage`) usan memoria del proceso como si fuese la base de datos. Consecuencias:
- Un reinicio (Railway despliega a menudo) **borra partidas activas y saldos** no persistidos.
- No escala horizontalmente: con >1 réplica cada una tiene su propio "mundo".
- El "fallback a memoria" de `getDb()` significa que **si Mongo falla, el dinero se procesa igual** contra RAM y
  luego desaparece — el peor resultado posible para pagos.

**Arreglo:** MongoDB (o Redis para estado efímero de partidas) como única fuente de verdad; eliminar el fallback
silencioso a memoria en cualquier ruta que toque dinero — ahí debe fallar de forma dura (500) en vez de fingir
éxito.

### C4 — Resultado de partida auto-reportado
`app/api/game/resolve/route.js` acepta `winnerAddress`/`isDraw` del cliente y reparte el bote (con 2,5% de fee).
Como no hay validación de que la partida realmente terminó así (el servidor de Socket.io tiene la verdad, pero
esta ruta HTTP no la consulta), **un jugador puede declararse ganador** y cobrar el bote.

**Arreglo:** la resolución debe derivarse del `GameEngine` autoritativo del lado servidor (el mismo que valida
los movimientos en `server.js`), no de un body arbitrario. Unificar el motor de partida (ver M2).

## 3. Hallazgos de arquitectura (alto impacto)

### A1 — Motor de partida triplicado y no autoritativo
Existe la clase `GameEngine` en `server.js` **y** en `lib/gameEngine.js` (marcada `'use client'`), casi idénticas.
La lógica de ajedrez corre en cliente y servidor por separado y no hay una única fuente de verdad para apuestas.
→ Extraer un módulo compartido `lib/game/engine.js` (isomórfico, sin `'use client'`), usado por el servidor como
autoridad y por el cliente solo para previsualización/UX.

### A2 — Migración Solana→TON a medias
El historial reciente ("RADICAL: Remove ALL Solana") indica una migración en curso, pero:
- `package.json` aún arrastra **todo el stack Solana** (`@solana/*`, `@metaplex-foundation/*`, `bs58`,
  `tweetnacl`) además del stack TON (`@tonconnect/*`, `ton-core`, `ton-crypto`). Son megabytes de dependencias
  y superficie de ataque duplicada.
- `app/api/payments/credit-tokens/route.js` sigue verificando transacciones **en Solana** (`@solana/web3.js`,
  `TREASURY_WALLET` de Solana), mientras el flujo de producto ahora es TON. Los dos caminos de pago conviven y
  se contradicen.
- `lib/solana.js`, `lib/nft.js`, `scripts/*solana*` son código muerto si el objetivo es TON-only.

→ Decidir explícitamente el objetivo (por los commits: **TON-only**) y eliminar Solana por completo: deps,
libs, rutas y scripts. Reduce bundle, riesgo y confusión.

### A3 — Contratos on-chain solapados y sin pipeline
Coexisten tres tecnologías de contrato para lo mismo:
- `ton/contracts/*.fc` (FunC) + wrappers/tests TON.
- `contracts/ton/ChessEscrow.tact` (Tact).
- `programs/chessdao/src/lib.rs` (Anchor/Solana, código muerto).

→ Quedarse con una sola cadena de build de contratos (FunC **o** Tact) y borrar el resto. Documentar direcciones
desplegadas y el proceso de deploy en un único README de contratos.

### A4 — `getDb()` duplicado 4+ veces
El mismo bloque `async function getDb()` con fallback a memoria está copiado en varias rutas. → Centralizar en
`lib/db.js` con un cliente Mongo **singleton** (reutilizar conexión entre invocaciones, hoy se abre y cierra una
conexión por request, lo que es lento y agota el pool).

## 4. Hallazgos medios

- **M1 — Rate limiter en memoria** (`middleware.js`): correcto como diseño pero se resetea por instancia y no
  cubre multi-réplica. Migrar a Redis (p. ej. `@upstash/ratelimit`) si se despliega con réplicas.
- **M2 — CORS abierto** en Socket.io (`origin: '*'` por defecto en `server.js`). Restringir a orígenes conocidos
  vía `CORS_ORIGINS` obligatorio en producción.
- **M3 — Fallo silencioso**: los `catch` que hacen `console.error` y siguen (p. ej. el crédito de tokens tras
  verificar) enmascaran pérdidas de dinero. Deben propagar error o encolar reintento idempotente.
- **M4 — Higiene de repo**: `logo.png` de 3 MB y varios iconos de ~500 KB versionados; conviene optimizar/mover a
  un CDN o `public/` comprimido. `test_result.md`, `IMPLEMENTATION_SUMMARY.md`, `PRODUCCION_README.md`,
  `DEPLOY.md`+`DEPLOYMENT.md` son documentación solapada que conviene consolidar.
- **M5 — Sin tests ni CI**: `tests/` solo tiene `__init__.py`. El único test real es `ton/tests/ChessToken.spec.ts`.
  No hay GitHub Actions. Riesgo alto para un producto que mueve dinero.
- **M6 — Validación de entrada**: `zod` está instalado pero las rutas API validan a mano (o no validan). Aplicar
  esquemas `zod` en el borde de cada ruta.

## 5. Plan de mejora priorizado

### Fase 0 — Seguridad económica (bloqueante, 1–2 semanas)
1. Implementar `requireAuth()`: verificación HMAC de `initData` de Telegram + challenge de firma para wallets. (C1)
2. Eliminar el "regalo" incondicional de saldo en `GET /api/balance`; el bono inicial debe ser idempotente por
   usuario autenticado y una sola vez. (C1)
3. Persistir pagos verificados en Mongo con índices únicos e idempotencia por `txHash`; completar el crédito
   atómico y borrar el `TODO`. (C2)
4. Quitar el fallback a memoria en toda ruta que toque dinero: fallar duro si no hay DB. (C3)
5. Derivar `game/resolve` del motor autoritativo del servidor, no del body. (C4)

### Fase 1 — Consolidación de arquitectura (2–3 semanas)
6. Decidir TON-only y **eliminar Solana** (deps, `lib/solana.js`, `lib/nft.js`, rutas y scripts Solana). (A2)
7. Unificar el `GameEngine` en un módulo isomórfico compartido. (A1)
8. Elegir una sola tecnología de contrato y borrar las otras dos; documentar deploys. (A3)
9. Centralizar `getDb()` en `lib/db.js` con cliente singleton. (A4)

### Fase 2 — Robustez y escala (2 semanas)
10. Estado de partidas en Redis; rate limiting en Redis. (M1, C3)
11. Validación `zod` en todas las rutas; CORS restringido. (M6, M2)
12. Manejo de errores que no pierda dinero (colas/reintentos idempotentes). (M3)

### Fase 3 — Calidad y mantenimiento (continuo)
13. Suite de tests (motor de ajedrez, verificación de pagos, idempotencia) + GitHub Actions (lint + test + build).
14. Consolidar documentación y optimizar assets versionados. (M4)

## 6. Riesgos y quick wins

**Quick wins (bajo esfuerzo, alto valor):**
- Borrar el bono incondicional de `GET /api/balance` (unas líneas, cierra una fuga directa de saldo).
- Restringir CORS de Socket.io por env.
- Añadir un workflow de CI mínimo (`next build` + lint) para evitar romper `main`.
- Centralizar `getDb()` (elimina duplicación y arregla el pool de conexiones).

**Riesgo principal:** el producto está posicionado para manejar valor real (apuestas, compra de tokens con TON)
pero la capa de confianza (auth, persistencia, verificación de pago) todavía no existe de forma robusta. **No
debería habilitarse mainnet con dinero real hasta cerrar la Fase 0.**
