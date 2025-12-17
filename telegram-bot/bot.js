// Load .env only if running locally (Railway provides env vars directly)
if (!process.env.BOT_TOKEN) {
  require('dotenv').config();
}

console.log('Starting ChessDAO Bot...');
console.log('BOT_TOKEN present:', !!process.env.BOT_TOKEN);
console.log('WEBAPP_URL:', process.env.WEBAPP_URL);
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://chessdao-production.up.railway.app';
const API_URL = process.env.API_URL || WEBAPP_URL;

// Helper function to make API calls
async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error.message);
    return null;
  }
}

// Store for linking Telegram users to wallets
const userWallets = new Map();

// Start command - shows main menu with Mini App button
// Handles referral deep links: /start REF_XXXXX
bot.start(async (ctx) => {
  const user = ctx.from;
  const isPremium = user.is_premium || false;
  const startPayload = ctx.startPayload || ''; // From deep link

  let referralCode = null;
  let referralMessage = '';

  // Check if this is a referral deep link
  if (startPayload.startsWith('REF_')) {
    referralCode = startPayload.substring(4);
    console.log(`🎁 Referral detected: ${referralCode} from user ${user.id} (Premium: ${isPremium})`);

    referralMessage = `
🎁 *¡Bienvenida Especial!*
Has sido invitado por un amigo.
Si es tu primera vez, recibirás *1,000 $GAME* de bonus!
${isPremium ? '⭐ Como usuario Premium, tu amigo recibirá *10,000 $GAME*!' : ''}
`;
  }

  const welcomeMessage = `
🏆 *Bienvenido a ChessDAO!*

Hola ${user.first_name}! 👋
${referralMessage}
♟️ *ChessDAO* es la plataforma de ajedrez descentralizada en Telegram.

*Características:*
• 🤖 Juega contra IA (4 niveles)
• ⚔️ Desafía jugadores PVP
• 💰 Apuesta tokens CHESS
• 🎁 Gana NFT Loot Boxes
• 🏆 Sube en el ranking
• 💎 Ingreso pasivo cada hora

*Token CHESS:*
• Red: TON Blockchain
• Wallet: TON Connect

Presiona el botón para jugar:
`;

  // Build webapp URL with referral if present
  const appUrl = referralCode
    ? `${WEBAPP_URL}?startapp=REF_${referralCode}`
    : WEBAPP_URL;

  await ctx.replyWithMarkdown(welcomeMessage,
    Markup.inlineKeyboard([
      [Markup.button.webApp('🎮 Jugar ChessDAO', appUrl)],
      [Markup.button.callback('🔗 Invitar Amigos', 'invite_friends')],
      [Markup.button.callback('📊 Mi Perfil', 'profile')],
      [Markup.button.callback('🏆 Leaderboard', 'leaderboard')],
    ])
  );
});

// Help command
bot.help((ctx) => {
  ctx.replyWithMarkdown(`
*Comandos disponibles:*

/start - Menú principal
/play - Abrir ChessDAO
/invite - Invitar amigos y ganar GAME
/balance - Ver tu balance
/stats - Tus estadísticas
/leaderboard - Top jugadores
/link \`wallet\` - Vincular wallet
/help - Esta ayuda

*Sistema de Referidos:*
• Gana 500 $GAME por cada amigo
• ⭐ 10,000 $GAME si tiene Premium!
• Tu amigo recibe 1,000 $GAME

*Soporte:* @chessdao_support
`);
});

// Play command - opens Mini App
bot.command('play', (ctx) => {
  ctx.reply('🎮 Abre ChessDAO para jugar:',
    Markup.inlineKeyboard([
      [Markup.button.webApp('♟️ Jugar Ahora', WEBAPP_URL)]
    ])
  );
});

// Buy command - Telegram Stars purchase
bot.command('buy', async (ctx) => {
  try {
    // Create invoice for 100 Stars = 200 CHESS
    const invoice = await ctx.telegram.createInvoiceLink({
      title: '200 CHESS Tokens',
      description: 'Compra 200 CHESS para jugar y apostar en ChessDAO',
      payload: JSON.stringify({
        type: 'chess_purchase',
        amount: 200,
        userId: ctx.from.id
      }),
      provider_token: '', // Empty for Telegram Stars
      currency: 'XTR', // XTR = Telegram Stars
      prices: [{ label: 'CHESS Tokens', amount: 100 }]
    });

    await ctx.replyWithMarkdown(`
💎 *Comprar CHESS Tokens*

Usa Telegram Stars ⭐ para comprar CHESS:

*Paquetes disponibles:*
• ⭐100 = 200 CHESS
• ⭐250 = 550 CHESS (+50 bonus)
• ⭐500 = 1,200 CHESS (+200 bonus)
• ⭐1000 = 2,500 CHESS (+500 bonus)

*$CHESS se usa para:*
• Apuestas en PvP
• Staking y governance
• Trading en DEX (STON.fi)
`, Markup.inlineKeyboard([
      [Markup.button.url('⭐ Comprar 200 CHESS', invoice)],
      [Markup.button.webApp('💎 Más opciones', `${WEBAPP_URL}?page=buy`)]
    ]));
  } catch (error) {
    console.error('Buy command error:', error);
    // Fallback if Stars not available
    await ctx.replyWithMarkdown(`
💎 *Comprar CHESS*

Abre la app para comprar CHESS con TON:
`, Markup.inlineKeyboard([
      [Markup.button.webApp('💎 Comprar CHESS', `${WEBAPP_URL}?page=buy`)]
    ]));
  }
});

// Handle successful payments
bot.on('pre_checkout_query', (ctx) => {
  // Always approve for now
  ctx.answerPreCheckoutQuery(true);
});

bot.on('successful_payment', async (ctx) => {
  const payment = ctx.message.successful_payment;
  const payload = JSON.parse(payment.invoice_payload);

  console.log('💰 Successful payment:', payment);

  // Credit tokens via API
  try {
    await fetch(`${API_URL}/api/payments/stars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramUserId: ctx.from.id,
        walletAddress: userWallets.get(ctx.from.id) || `tg_${ctx.from.id}`,
        starsAmount: payment.total_amount,
        invoicePayload: payment.invoice_payload
      })
    });
  } catch (err) {
    console.error('Payment API error:', err);
  }

  await ctx.replyWithMarkdown(`
✅ *¡Pago exitoso!*

Recibiste *${payload.amount} CHESS* 🎉

Abre la app para usar tus tokens:
`, Markup.inlineKeyboard([
    [Markup.button.webApp('🎮 Jugar ahora', WEBAPP_URL)]
  ]));
});

// Invite command - share referral link
bot.command('invite', async (ctx) => {
  const user = ctx.from;
  const walletAddress = userWallets.get(user.id);

  // Generate a simple referral code based on user ID
  // In production, fetch the real code from API
  let referralCode = `TG${user.id.toString(36).toUpperCase()}`;

  // Try to get real referral code if wallet is linked
  if (walletAddress) {
    const refData = await fetchAPI(`/api/user/referral?wallet=${walletAddress}`);
    if (refData?.referralCode) {
      referralCode = refData.referralCode;
    }
  }

  const referralLink = `https://t.me/ChessDAObot?start=REF_${referralCode}`;

  await ctx.replyWithMarkdown(`
🎁 *¡Invita Amigos y Gana!*

Tu código de referido: \`${referralCode}\`

*Recompensas:*
• Amigo se registra: +500 $GAME
• ⭐ Amigo Premium: +10,000 $GAME
• Tu amigo recibe: +1,000 $GAME

*Tu link personal:*
${referralLink}

Compártelo con tus amigos!
`, Markup.inlineKeyboard([
    [Markup.button.url('📤 Compartir en Telegram', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('¡Únete a ChessDAO y recibe 1,000 $GAME de bienvenida! ♟️🎁')}`)],
    [Markup.button.webApp('📊 Ver mis Referidos', WEBAPP_URL)]
  ]));
});

// Callback: invite_friends button
bot.action('invite_friends', async (ctx) => {
  await ctx.answerCbQuery();

  const user = ctx.from;
  const walletAddress = userWallets.get(user.id);

  let referralCode = `TG${user.id.toString(36).toUpperCase()}`;

  if (walletAddress) {
    const refData = await fetchAPI(`/api/user/referral?wallet=${walletAddress}`);
    if (refData?.referralCode) {
      referralCode = refData.referralCode;
    }
  }

  const referralLink = `https://t.me/ChessDAObot?start=REF_${referralCode}`;

  await ctx.replyWithMarkdown(`
🎁 *Sistema de Referidos*

Tu código: \`${referralCode}\`

*Recompensas:*
• Amigo normal: +500 $GAME
• ⭐ Amigo Premium: +10,000 $GAME
• Tu amigo: +1,000 $GAME

${referralLink}
`, Markup.inlineKeyboard([
    [Markup.button.url('📤 Compartir', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('¡Únete a ChessDAO! 🎁')}`)]
  ]));
});


// Link wallet command
bot.command('link', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.replyWithMarkdown(`
🔗 *Vincular Wallet TON*

Uso: \`/link <tu_wallet_ton>\`

Ejemplo:
\`/link EQBv...abc\`

Esto vincula tu cuenta de Telegram con tu wallet TON para ver estadísticas.
`);
  }

  const walletAddress = args[1];

  // Basic validation (TON addresses start with EQ or UQ and are ~48 chars)
  if (!walletAddress.match(/^(EQ|UQ|0:)[a-zA-Z0-9_-]{40,50}$/)) {
    return ctx.reply('❌ Dirección de wallet inválida. Debe ser una dirección TON válida (EQ... o UQ...).');
  }

  // Store the link
  userWallets.set(ctx.from.id, walletAddress);

  // Try to fetch profile
  const profile = await fetchAPI(`/api/user/profile?wallet=${walletAddress}`);

  if (profile && !profile.error) {
    const username = profile.profile?.username || 'Usuario';
    ctx.replyWithMarkdown(`
✅ *Wallet vinculada exitosamente!*

👤 Usuario: ${username}
💼 Wallet: \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}\`
⭐ Rating: ${profile.stats?.rating || 1200}
🎮 Partidas: ${profile.stats?.gamesPlayed || 0}

Usa /balance para ver tu balance de tokens.
`);
  } else {
    ctx.replyWithMarkdown(`
✅ *Wallet vinculada!*

💼 Wallet: \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}\`

⚠️ No encontramos un perfil asociado. 
Abre la app para crear tu perfil:
`, Markup.inlineKeyboard([
      [Markup.button.webApp('📝 Crear Perfil', WEBAPP_URL)]
    ]));
  }
});

// Balance command - fetches real balance from API
bot.command('balance', async (ctx) => {
  const walletAddress = userWallets.get(ctx.from.id);

  if (!walletAddress) {
    return ctx.replyWithMarkdown(`
💰 *Ver Balance*

Primero vincula tu wallet:
\`/link <tu_wallet_ton>\`

O abre la app directamente:
`, Markup.inlineKeyboard([
      [Markup.button.webApp('🔗 Conectar Wallet', WEBAPP_URL)]
    ]));
  }

  ctx.reply('⏳ Consultando balance...');

  const gameBalance = await fetchAPI(`/api/game-balance?wallet=${walletAddress}`);
  const profile = await fetchAPI(`/api/user/profile?wallet=${walletAddress}`);

  const gameTokens = gameBalance?.balance || gameBalance?.gameBalance || 0;
  const chessTokens = gameBalance?.chessBalance || 0;

  ctx.replyWithMarkdown(`
💰 *Tu Balance*

• 🎮 $GAME: ${gameTokens.toLocaleString()}
• ♟️ CHESS: ${chessTokens.toLocaleString()}

📊 Exchange: 10 $GAME = 1 CHESS

[Swap Tokens](${WEBAPP_URL})
`, Markup.inlineKeyboard([
    [Markup.button.webApp('💱 Swap Tokens', WEBAPP_URL)],
    [Markup.button.webApp('🛒 Comprar CHESS', WEBAPP_URL)]
  ]));
});

// Stats command - fetches real stats from API
bot.command('stats', async (ctx) => {
  const walletAddress = userWallets.get(ctx.from.id);

  if (!walletAddress) {
    return ctx.replyWithMarkdown(`
📊 *Ver Estadísticas*

Primero vincula tu wallet:
\`/link <tu_wallet_ton>\`
`);
  }

  ctx.reply('⏳ Cargando estadísticas...');

  const profile = await fetchAPI(`/api/user/profile?wallet=${walletAddress}`);

  if (!profile || profile.error) {
    return ctx.reply('❌ Error al obtener estadísticas. Intenta más tarde.');
  }

  const stats = profile.stats || {};
  const social = profile.social || {};

  ctx.replyWithMarkdown(`
📊 *Tus Estadísticas*

👤 ${profile.profile?.username || 'Usuario'} ${profile.profile?.avatar || '♟️'}

*Rating y Partidas:*
• ⭐ ELO: ${stats.rating || 1200}
• 🎮 Partidas: ${stats.gamesPlayed || 0}
• ✅ Victorias: ${stats.gamesWon || 0}
• 📈 Win Rate: ${stats.winRate || 0}%

*Social:*
• 👥 Amigos: ${social.friendsCount || 0}
• 👤 Seguidores: ${social.followersCount || 0}

¡Juega para mejorar tus stats!
`, Markup.inlineKeyboard([
    [Markup.button.webApp('🎮 Jugar', WEBAPP_URL)]
  ]));
});

// Leaderboard command - fetches real leaderboard
bot.command('leaderboard', async (ctx) => {
  ctx.reply('⏳ Cargando leaderboard...');

  const data = await fetchAPI('/api/leaderboard?limit=10');

  if (!data || data.error || !data.leaderboard) {
    return ctx.replyWithMarkdown(`
🏆 *Top Jugadores*

_Error al cargar el leaderboard._
_Intenta de nuevo más tarde._
`);
  }

  const medals = ['🥇', '🥈', '🥉'];
  let leaderboardText = '🏆 *Top 10 Jugadores*\n\n';

  data.leaderboard.forEach((player, index) => {
    const medal = medals[index] || `${index + 1}.`;
    const name = player.username || `Player${index + 1}`;
    leaderboardText += `${medal} ${name} - ${player.rating} ELO\n`;
  });

  leaderboardText += `\n_Actualizado en tiempo real_`;

  ctx.replyWithMarkdown(leaderboardText, Markup.inlineKeyboard([
    [Markup.button.webApp('🎮 Competir', WEBAPP_URL)]
  ]));
});

// Callback for link wallet
bot.action('link_wallet', (ctx) => {
  ctx.answerCbQuery();
  ctx.replyWithMarkdown(`
🔗 *Vincular Wallet*

Para vincular tu wallet TON, usa el comando:

\`/link <tu_wallet_ton>\`

Ejemplo:
\`/link 3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo\`

O abre la app para conectar directamente:
`, Markup.inlineKeyboard([
    [Markup.button.webApp('🔗 Conectar en App', WEBAPP_URL)]
  ]));
});

// Callback for profile
bot.action('profile', async (ctx) => {
  ctx.answerCbQuery();
  const user = ctx.from;
  const walletAddress = userWallets.get(user.id);

  if (!walletAddress) {
    return ctx.replyWithMarkdown(`
👤 *Tu Perfil de Telegram*

• Nombre: ${user.first_name}
• Usuario: @${user.username || 'N/A'}
• ID: \`${user.id}\`

⚠️ *Wallet no vinculada*

Vincula tu wallet para ver tu perfil completo:
\`/link <tu_wallet_ton>\`
`, Markup.inlineKeyboard([
      [Markup.button.webApp('🔗 Conectar Wallet', WEBAPP_URL)]
    ]));
  }

  const profile = await fetchAPI(`/api/user/profile?wallet=${walletAddress}`);
  const gameBalance = await fetchAPI(`/api/game-balance?wallet=${walletAddress}`);

  const stats = profile?.stats || {};
  const gameTokens = gameBalance?.balance || gameBalance?.gameBalance || 0;

  ctx.replyWithMarkdown(`
👤 *Tu Perfil ChessDAO*

${profile?.profile?.avatar || '♟️'} ${profile?.profile?.username || user.first_name}
💼 \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}\`

*Estadísticas:*
• ⭐ Rating: ${stats.rating || 1200}
• 🎮 Partidas: ${stats.gamesPlayed || 0}
• ✅ Victorias: ${stats.gamesWon || 0}
• 📈 Win Rate: ${stats.winRate || 0}%

*Balance:*
• 🎮 $GAME: ${gameTokens.toLocaleString()}
`, Markup.inlineKeyboard([
    [Markup.button.webApp('✏️ Editar Perfil', WEBAPP_URL)],
    [Markup.button.webApp('🎮 Jugar', WEBAPP_URL)]
  ]));
});

// Callback for leaderboard
bot.action('leaderboard', async (ctx) => {
  ctx.answerCbQuery();

  const data = await fetchAPI('/api/leaderboard?limit=5');

  const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
  let text = '🏆 *Top 5 Jugadores*\n\n';

  if (data?.leaderboard) {
    data.leaderboard.forEach((player, index) => {
      text += `${medals[index]} ${player.username || 'Player'} - ${player.rating} ELO\n`;
    });
  } else {
    text += '_Cargando..._\n';
  }

  ctx.replyWithMarkdown(text, Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Actualizar', 'leaderboard')],
    [Markup.button.webApp('🎮 Competir', WEBAPP_URL)]
  ]));
});

// Handle any text message
bot.on('text', (ctx) => {
  ctx.reply('¡Usa /start para ver el menú principal o /help para ver los comandos!');
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('Ocurrió un error. Por favor intenta de nuevo.');
});

// Start bot
bot.launch()
  .then(() => {
    console.log('🤖 ChessDAO Bot iniciado!');
    console.log('Webapp URL:', WEBAPP_URL);
    console.log('API URL:', API_URL);
  })
  .catch((err) => {
    console.error('Error starting bot:', err);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
