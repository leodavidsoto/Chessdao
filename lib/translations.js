/**
 * ChessDAO Translations - EN/ES
 */

export const translations = {
    en: {
        // Header
        play: 'Play',
        dao: 'DAO',
        history: 'History',
        profile: 'Profile',
        buyChess: 'Buy CHESS',
        connectWallet: 'Connect Wallet',

        // Hero
        heroTitle: 'Play Chess Online',
        heroSubtitle: 'With CHESS tokens! Earn rewards playing',

        // Game Modes - Carousel 1
        quickMatch: 'Quick Match',
        quickMatchDesc: '5 minute Blitz game',
        vsAI: 'Play vs AI',
        vsAIDesc: 'Choose difficulty and play against AI',
        pvpBet: 'PvP Bet',
        pvpBetDesc: 'Bet CHESS and play against another player',
        daoBet: 'DAO Community Bet',
        daoBetDesc: 'Bet and vote moves as a team',
        vsFriend: 'Play vs Friend',
        vsFriendDesc: 'Play against a friend on same screen',

        // Extras - Carousel 2
        nftShop: 'NFT Shop',
        nftShopDesc: 'Buy boxes with NFT characters',
        dailyPuzzle: 'Daily Puzzle',
        dailyPuzzleDesc: 'Solve mate in 2 problems',
        inviteFriend: 'Invite Friend',
        inviteFriendDesc: 'Generate a link to play with a friend',
        myProfile: 'My Profile',
        myProfileDesc: 'Social dashboard and challenges',

        // Difficulty
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard',
        master: 'Master',

        // Misc
        playNow: 'Play Now',
        popular: 'Popular',
        bet: 'Bet',
        back: '← Back',
        activePlayers: 'Active Players',
        gamesPlayed: 'Games Played',
        chessDistributed: 'CHESS Distributed',

        // Profile
        connectYourWallet: 'Connect your wallet to access your profile',
        myDashboard: 'My Dashboard',
        logout: 'Log Out',

        // Ranking
        bronze: 'Bronze',
        silver: 'Silver',
        gold: 'Gold',
        platinum: 'Platinum',
        diamond: 'Diamond',
        master_rank: 'Master',
    },

    es: {
        // Header
        play: 'Jugar',
        dao: 'DAO',
        history: 'Historial',
        profile: 'Perfil',
        buyChess: 'Comprar CHESS',
        connectWallet: 'Conectar Wallet',

        // Hero
        heroTitle: 'Juega Ajedrez Online',
        heroSubtitle: '¡Con tokens CHESS! Gana recompensas jugando',

        // Game Modes - Carousel 1
        quickMatch: 'Partida Rápida',
        quickMatchDesc: 'Partida de 5 minutos - Modo Blitz',
        vsAI: 'Jugar vs IA',
        vsAIDesc: 'Elige la dificultad y juega contra IA',
        pvpBet: 'PvP Apuesta',
        pvpBetDesc: 'Apuesta CHESS y juega contra otro jugador',
        daoBet: 'Comunidad DAO Apuesta',
        daoBetDesc: 'Apuesta y vota movimientos en equipo',
        vsFriend: 'Jugar vs Amigo',
        vsFriendDesc: 'Juega contra un amigo en la misma pantalla',

        // Extras - Carousel 2
        nftShop: 'Tienda NFT',
        nftShopDesc: 'Compra cajas con personajes NFT',
        dailyPuzzle: 'Puzzle Diario',
        dailyPuzzleDesc: 'Resuelve problemas de mate en 2',
        inviteFriend: 'Invitar Amigo',
        inviteFriendDesc: 'Genera un link para jugar con un amigo',
        myProfile: 'Mi Perfil',
        myProfileDesc: 'Dashboard social y desafíos',

        // Difficulty
        easy: 'Fácil',
        medium: 'Medio',
        hard: 'Difícil',
        master: 'Maestro',

        // Misc
        playNow: 'Jugar Ahora',
        popular: 'Popular',
        bet: 'Apuesta',
        back: '← Volver',
        activePlayers: 'Jugadores Activos',
        gamesPlayed: 'Partidas Jugadas',
        chessDistributed: 'CHESS Distribuidos',

        // Profile
        connectYourWallet: 'Conecta tu wallet para acceder a tu perfil',
        myDashboard: 'Mi Dashboard',
        logout: 'Cerrar Sesión',

        // Ranking
        bronze: 'Bronce',
        silver: 'Plata',
        gold: 'Oro',
        platinum: 'Platino',
        diamond: 'Diamante',
        master_rank: 'Maestro',
    }
}

/**
 * Get translation function
 * @param {string} lang - 'en' or 'es'
 * @returns {function} - t(key) function
 */
export function getTranslation(lang = 'en') {
    const dict = translations[lang] || translations.en
    return (key) => dict[key] || key
}

/**
 * Ranking system
 */
export const RANKS = [
    { id: 'bronze', min: 0, max: 999, icon: '🥉' },
    { id: 'silver', min: 1000, max: 1499, icon: '🥈' },
    { id: 'gold', min: 1500, max: 1999, icon: '🥇' },
    { id: 'platinum', min: 2000, max: 2499, icon: '💎' },
    { id: 'diamond', min: 2500, max: 2999, icon: '💠' },
    { id: 'master', min: 3000, max: Infinity, icon: '👑' },
]

export function getRank(points) {
    return RANKS.find(r => points >= r.min && points <= r.max) || RANKS[0]
}

/**
 * Points system
 */
export const POINTS = {
    WIN_PVP: 25,
    WIN_DAO: 15,
    WIN_AI: 5,
    PUZZLE_COMPLETE: 10,
    STREAK_BONUS_3: 50,
}
