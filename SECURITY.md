# ChessDAO — Modelo de Seguridad

Este documento describe la capa de seguridad del backend introducida para
proteger las acciones que mueven valor (partidas con apuesta, resolución del
bote y verificación de pagos on-chain).

## 1. Autenticación por firma de wallet

Las acciones de jugador (`crear`, `unirse`, `cancelar`, `reclamar timeout`)
requieren que el cliente firme un mensaje con su wallet de Solana y envíe:

| Header            | Contenido                                           |
| ----------------- | --------------------------------------------------- |
| `x-wallet`        | Dirección pública (base58) del firmante             |
| `x-signature`     | Firma ed25519 del mensaje, en base64                |
| `x-auth-message`  | El mensaje exacto que se firmó                      |

El servidor (`lib/auth.js`) verifica:

1. **Firma válida** — `nacl.sign.detached.verify` sobre el mensaje con la clave
   pública de la wallet.
2. **Binding a la wallet** — el mensaje debe contener la dirección completa, de
   modo que una firma no pueda reutilizarse para otra wallet.
3. **Frescura (anti-replay)** — el mensaje incluye una marca de tiempo ISO que
   debe estar dentro de `AUTH_MAX_AGE_MS` (5 min por defecto).
4. **Coincidencia de actor** — la wallet firmante debe coincidir con la wallet
   sobre la que actúa la petición (`walletAddress` del body).

El cliente genera estas firmas con `hooks/useWalletSignature.js` y las adjunta
con `lib/authClient.js` (`signedFetch`).

### Modos de enforcement (`AUTH_MODE`)

- `strict` — rechaza peticiones sin firma o con firma inválida. **Obligatorio en
  producción.**
- `warn` — verifica cuando hay credenciales, si no las hay permite pero registra
  un aviso. Sirve para desplegar el firmado en los clientes de forma gradual sin
  romper la app. Es el valor por defecto fuera de producción.

## 2. Autorización del oráculo (resolución de partidas)

`POST /api/game/resolve` liquida el bote y **no** puede depender de quién llama:
antes cualquiera podía declararse ganador. Ahora exige el secreto compartido
`GAME_ORACLE_SECRET` en el header `x-oracle-key`, comparado en tiempo constante.
El resultado real de la partida lo determina el motor de juego / servidor de
sockets, que es quien debe invocar este endpoint.

- En **producción**, si no hay secreto configurado el endpoint queda
  deshabilitado (503) — nunca abierto.
- La transición de estado es **idempotente**: una partida solo puede salir de
  `active` una vez, así que una resolución duplicada no paga dos veces.

## 3. Persistencia y atomicidad

`lib/gameStore.js` reemplaza los objetos `global.gamesStorage` en memoria (que
se perdían en cada reinicio y estaban fragmentados entre rutas). Con MongoDB:

- Cada transición usa `findOneAndUpdate` con guarda de estado, evitando carreras
  (p. ej. que dos jugadores se unan a la misma partida).
- Si Mongo no está disponible, se usa un único almacén en memoria compartido
  (con circuito de respaldo en `lib/db.js`) para no bloquear el desarrollo.

## 4. Idempotencia de pagos TON

`POST /api/payments/ton/verify` deduplica por **hash de transacción on-chain** en
la colección `ton_payments` (índice único). El `Set` en memoria anterior se
reiniciaba con cada deploy, permitiendo re-acreditar el mismo pago.

## 5. CORS

El `Access-Control-Allow-Origin: *` anterior permitía que cualquier web llamara
a la API en nombre de un usuario. Ahora `middleware.js` refleja el origin solo
si está en `ALLOWED_ORIGINS` (más localhost/Capacitor por defecto), añade
`Vary: Origin` y responde correctamente al preflight `OPTIONS`.

## 6. Contrato TON (`contracts/ton/ChessEscrow.tact`)

Correcciones aplicadas:

- **Validación de ganador**: el ganador debe ser uno de los dos jugadores.
- **`SendIgnoreErrors` eliminado**: los pagos ya no se pierden en silencio si el
  envío falla.
- **`cancel` y `timeout` implementados** con guardas de estado y de autor.
- **Anti doble-pago**: la partida se marca completada antes de transferir.
- **IDs de partida únicos**: no se puede sobrescribir una partida financiada.

> ⚠️ El contrato `.tact` requiere una **auditoría profesional de terceros** antes
> de custodiar valor real en mainnet, en particular el cálculo de gas de los
> pagos y el manejo de bounces.

## Variables de entorno de seguridad

Ver `.env.production.example`. Las críticas para producción:

```
AUTH_MODE=strict
GAME_ORACLE_SECRET=<openssl rand -hex 32>
ALLOWED_ORIGINS=https://tu-dominio
MONGO_URL=<cadena de conexión real>
```

## Checklist antes de mainnet

- [ ] `AUTH_MODE=strict` y clientes enviando firmas en todas las acciones.
- [ ] `GAME_ORACLE_SECRET` configurado; solo el backend de juego lo conoce.
- [ ] `ALLOWED_ORIGINS` restringido a los dominios reales.
- [ ] Índices creados: `node scripts/setup-db-indexes.js`.
- [ ] Rate limiting respaldado por Redis (el actual es por-proceso).
- [ ] Auditoría profesional de los contratos Solana y TON.
- [ ] Penetration testing del backend.
