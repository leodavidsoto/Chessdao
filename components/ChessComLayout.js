'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import CustomChess from '@/components/CustomChess'
import DAOGames from '@/components/DAOGames'
import GameHistory from '@/components/GameHistory'
import TokenPurchaseV2 from '@/components/TokenPurchaseV2'
import TokenPurchaseTON from '@/components/TokenPurchaseTON'
import BettingModal from '@/components/BettingModal'
import DailyPuzzles from '@/components/DailyPuzzles'
import NFTLootBoxes from '@/components/NFTLootBoxes'
import InviteGame from '@/components/InviteGame'
import SignatureModal from '@/components/SignatureModal'
import GameCarousel from '@/components/GameCarousel'
import { useChessTokens } from '@/hooks/useChessTokens'
import { useWalletSignature } from '@/hooks/useWalletSignature'
import UserDashboard from '@/components/UserDashboard'
import { useNotifications } from '@/hooks/useNotifications'
import { apiFetch } from '@/lib/config'
import { getTranslation } from '@/lib/translations'
// TON Integration for Telegram
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { useTonConnect } from '@/hooks/useTonConnect'
import TonWalletConnect from '@/components/TonWalletConnect'
import ReferralCard from '@/components/ReferralCard'
import SquadsPanel from '@/components/SquadsPanel'
import DailyChallenge from '@/components/DailyChallenge'
import PassiveIncomeCard from '@/components/PassiveIncomeCard'

/**
 * ChessComLayout - Chess.com-style main layout with DAO features and betting
 * Supports both Solana (regular browser/mobile) and TON (Telegram Mini App)
 */
export default function ChessComLayout() {
  // Solana wallet (for browser/mobile)
  const { publicKey, connected } = useWallet()
  const { chessBalance, actions } = useChessTokens()
  const { unreadCount } = useNotifications()
  const { signAction, isSigning, error: signError, clearError } = useWalletSignature()

  // TON wallet (for Telegram Mini App)
  const { isInTelegram, isReady: telegramReady, telegramUser } = useTelegramWebApp()
  const { isConnected: tonConnected, address: tonAddress, balance: tonBalance, actions: tonActions } = useTonConnect()

  // Language state (persist to localStorage)
  const [language, setLanguage] = useState('en')
  const t = getTranslation(language)

  // Load language from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chessdao_lang')
      if (saved && (saved === 'en' || saved === 'es')) {
        setLanguage(saved)
      }
    }
  }, [])

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'es' : 'en'
    setLanguage(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('chessdao_lang', newLang)
    }
  }

  // State
  const [gameMode, setGameMode] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')
  const [timeControl, setTimeControl] = useState('10+0')
  const [showTokenPurchase, setShowTokenPurchase] = useState(false)
  const [showBettingModal, setShowBettingModal] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [pendingBetData, setPendingBetData] = useState(null)
  const [bettingType, setBettingType] = useState('pvp')
  const [currentBet, setCurrentBet] = useState(0)
  const [showTonWallet, setShowTonWallet] = useState(false)
  const [showReferral, setShowReferral] = useState(false)
  const [showSquads, setShowSquads] = useState(false)
  const [showDailyChallenge, setShowDailyChallenge] = useState(false)
  const [showPassiveIncome, setShowPassiveIncome] = useState(false)

  // Determine if wallet is connected (Solana OR TON)
  const isWalletConnected = isInTelegram ? tonConnected : connected
  const walletAddress = isInTelegram ? tonAddress : publicKey?.toString()
  const displayBalance = isInTelegram ? `${tonBalance?.toFixed(2) || 0} TON` : `${actions.formatChessAmount(chessBalance)} CHESS`

  // Carousel 1: Game Modes (in order: Quick, AI, PvP$, DAO$, Friend)
  const gameModesCarousel1 = [
    {
      id: 'blitz',
      icon: '⚡',
      title: t('quickMatch'),
      description: t('quickMatchDesc'),
      color: '#ed8936',
      popular: true
    },
    {
      id: 'ai',
      icon: '🤖',
      title: t('vsAI'),
      description: t('vsAIDesc'),
      color: '#48bb78',
      popular: true
    },
    {
      id: 'pvp_bet',
      icon: '⚔️',
      title: t('pvpBet'),
      description: t('pvpBetDesc'),
      color: '#f56565',
      popular: true,
      requiresWallet: true
    },
    {
      id: 'dao_bet',
      icon: '🏛️',
      title: t('daoBet'),
      description: t('daoBetDesc'),
      color: '#9f7aea',
      popular: true,
      requiresWallet: true
    },
    {
      id: 'local',
      icon: '👥',
      title: t('vsFriend'),
      description: t('vsFriendDesc'),
      color: '#4299e1'
    }
  ]

  // Carousel 2: Extras (Shop, Puzzle, Invite, Profile, Squads, Daily)
  const gameModesCarousel2 = [
    {
      id: 'squads',
      icon: '👥',
      title: language === 'en' ? 'Squads' : 'Escuadrones',
      description: language === 'en' ? 'Join a team and compete!' : '¡Únete a un equipo y compite!',
      color: '#8B5CF6',
      hot: true
    },
    {
      id: 'daily_challenge',
      icon: '🎯',
      title: language === 'en' ? 'Daily Challenge' : 'Desafío Diario',
      description: language === 'en' ? 'Solve the combo for 50K $GAME!' : '¡Resuelve el combo y gana 50K $GAME!',
      color: '#F59E0B',
      hot: true
    },
    {
      id: 'passive_income',
      icon: '💰',
      title: language === 'en' ? 'Passive Income' : 'Ingreso Pasivo',
      description: language === 'en' ? 'Claim hourly earnings' : 'Reclama ganancias cada hora',
      color: '#10B981'
    },
    {
      id: 'nft_shop',
      icon: '🎁',
      title: t('nftShop'),
      description: t('nftShopDesc'),
      color: '#9f7aea',
      requiresWallet: true
    },
    {
      id: 'puzzles',
      icon: '🧩',
      title: t('dailyPuzzle'),
      description: t('dailyPuzzleDesc'),
      color: '#fbbf24'
    },
    {
      id: 'invite_friend',
      icon: '🔗',
      title: t('inviteFriend'),
      description: t('inviteFriendDesc'),
      color: '#10B981'
    },
    {
      id: 'dashboard',
      icon: '👤',
      title: t('myProfile'),
      description: t('myProfileDesc'),
      color: '#a855f7',
      requiresWallet: true
    }
  ]

  // Keep old gameModes for compatibility
  const gameModes = [...gameModesCarousel1, ...gameModesCarousel2]

  const difficulties = [
    { id: 'easy', label: t('easy'), elo: '800', icon: '😊' },
    { id: 'medium', label: t('medium'), elo: '1400', icon: '🙂' },
    { id: 'hard', label: t('hard'), elo: '1800', icon: '😤' },
    { id: 'master', label: t('master'), elo: '2200+', icon: '🧠' }
  ]

  const handleGameEnd = async (result) => {
    console.log('Game ended:', result)
    // Save game to database
    try {
      await apiFetch('/api/games', {
        method: 'POST',
        body: JSON.stringify({
          type: gameMode,
          title: `vs ${gameMode === 'ai' ? 'Computadora' : 'Amigo'} (${difficulty})`,
          creator: publicKey?.toString() || 'guest',
          players: [publicKey?.toString() || 'guest'],
          result: result.type,
          winner: result.winner,
          difficulty,
          status: 'completed'
        })
      })
    } catch (error) {
      console.error('Error saving game:', error)
    }
  }

  // Handle game mode selection
  const handleModeSelect = (mode) => {
    if (mode.requiresWallet && !connected) {
      alert('Conecta tu wallet para jugar con apuestas')
      return
    }

    if (mode.id === 'pvp_bet') {
      setBettingType('pvp')
      setShowBettingModal(true)
    } else if (mode.id === 'dao_bet') {
      setBettingType('dao')
      setShowBettingModal(true)
    } else if (mode.id === 'squads') {
      setShowSquads(true)
    } else if (mode.id === 'daily_challenge') {
      setShowDailyChallenge(true)
    } else if (mode.id === 'passive_income') {
      setShowPassiveIncome(true)
    } else {
      setGameMode(mode.id)
    }
  }

  // Handle betting game start - requires signature first
  const handleBettingGameStart = async (betData) => {
    // Store bet data and show signature modal
    setPendingBetData(betData)
    setShowBettingModal(false)
    setShowSignatureModal(true)
  }

  // Handle signature for betting
  const handleSignBet = async () => {
    if (!pendingBetData) return null
    const result = await signAction('START_GAME_BET', { amount: pendingBetData.betAmount })
    return result
  }

  // Handle signature modal close
  const handleSignatureModalClose = (success) => {
    setShowSignatureModal(false)
    if (success && pendingBetData) {
      // Signature successful - start the game
      setCurrentBet(pendingBetData.betAmount)
      setGameMode(bettingType === 'pvp' ? 'pvp_bet' : 'dao_bet')
    }
    setPendingBetData(null)
    clearError()
  }

  // Render User Dashboard
  if (gameMode === 'dashboard') {
    return <UserDashboard onBack={() => setGameMode(null)} />
  }

  // Render Game History
  if (gameMode === 'history') {
    return <GameHistory onBack={() => setGameMode(null)} walletAddress={publicKey?.toString()} />
  }

  // Render Daily Puzzles
  if (gameMode === 'puzzles') {
    return <DailyPuzzles onBack={() => setGameMode(null)} />
  }

  // Render NFT Shop
  if (gameMode === 'nft_shop') {
    return <NFTLootBoxes onBack={() => setGameMode(null)} />
  }

  // Render Invite Friend - show referral modal
  if (gameMode === 'invite_friend') {
    return (
      <>
        <ReferralCard
          walletAddress={walletAddress}
          onClose={() => setGameMode(null)}
        />
      </>
    )
  }

  // Render game view (AI, local, PvP bet, etc.)
  if (gameMode && gameMode !== 'history') {
    return (
      <div className="game-layout">
        {/* Header */}
        <header className="game-header">
          <div className="header-left">
            <button onClick={() => { setGameMode(null); setCurrentBet(0) }} className="back-btn">
              ← Volver
            </button>
            <span className="game-title">
              {gameModes.find(m => m.id === gameMode)?.title || 'Partida'}
            </span>
          </div>
          <div className="header-right">
            {currentBet > 0 && (
              <span className="bet-badge">🎰 {currentBet} CHESS</span>
            )}
            <button onClick={() => setShowTokenPurchase(true)} className="buy-btn">
              💎 Comprar CHESS
            </button>
            <span className="balance">
              💰 {actions.formatChessAmount(chessBalance)} CHESS
            </span>
          </div>
        </header>

        {/* Game Area */}
        <main className="game-main">
          <CustomChess
            onBack={() => { setGameMode(null); setCurrentBet(0) }}
            betAmount={currentBet}
            vsAI={gameMode === 'ai' || gameMode === 'blitz'}
            difficulty={difficulty}
            onGameEnd={handleGameEnd}
          />
        </main>

        {showTokenPurchase && (
          isInTelegram ? (
            <TokenPurchaseTON onClose={() => setShowTokenPurchase(false)} />
          ) : (
            <TokenPurchaseV2 onClose={() => setShowTokenPurchase(false)} />
          )
        )}

        <style jsx>{`
          .game-layout {
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
          }
          
          .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            background: rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          
          .back-btn {
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
          }
          
          .back-btn:hover {
            background: rgba(255, 255, 255, 0.2);
          }
          
          .game-title {
            font-size: 18px;
            font-weight: 600;
          }
          
          .header-right {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .buy-btn {
            padding: 8px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: transform 0.2s;
          }
          
          .buy-btn:hover {
            transform: scale(1.05);
          }
          
          .balance {
            background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
          }
          
          .game-main {
            padding: 24px;
            display: flex;
            justify-content: center;
          }
        `}</style>
      </div>
    )
  }

  // Render menu
  return (
    <div className="chess-home">
      {/* Header */}
      <header className="main-header">
        <div className="logo">
          <span className="logo-icon">♔</span>
          <span className="logo-text">ChessDAO</span>
        </div>
        <nav className="nav-links">
          <a href="#" className="nav-link active">Jugar</a>
          <a href="#" className="nav-link" onClick={() => setGameMode('dao')}>DAO</a>
          <a href="#" className="nav-link" onClick={() => setGameMode('history')}>Historial</a>
          {isWalletConnected && (
            <a href="#" className="nav-link profile-link" onClick={() => setGameMode('dashboard')}>
              👤 Perfil
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </a>
          )}
        </nav>
        <div className="header-actions">
          {isInTelegram ? (
            /* Telegram Mini App - show TON wallet */
            tonConnected ? (
              <div className="user-info">
                <span className="ton-badge">💎 TON</span>
                <span className="balance">💰 {tonBalance?.toFixed(2) || '0'} TON</span>
                <span className="wallet">{tonActions.getFormattedAddress()}</span>
              </div>
            ) : (
              <div className="telegram-actions">
                <button
                  onClick={() => setShowTokenPurchase(true)}
                  className="buy-tokens-btn"
                >
                  ⭐ Comprar CHESS
                </button>
                <button
                  onClick={() => setShowTonWallet(true)}
                  className="connect-btn ton-connect-btn"
                >
                  💎 Conectar TON
                </button>
              </div>
            )
          ) : (
            /* Browser/Mobile - show Solana/Phantom wallet */
            connected ? (
              <div className="user-info">
                <button onClick={() => setShowTokenPurchase(true)} className="buy-tokens-btn">
                  💎 Comprar CHESS
                </button>
                <span className="balance">💰 {actions.formatChessAmount(chessBalance)} CHESS</span>
                <span className="wallet">{publicKey?.toString().slice(0, 8)}...</span>
              </div>
            ) : (
              <div className="wallet-connect-area">
                <WalletMultiButton className="connect-btn" />
              </div>
            )
          )}
        </div>
      </header>

      {/* TON Wallet Modal for Telegram */}
      {showTonWallet && (
        <div className="ton-wallet-modal">
          <div className="ton-wallet-overlay" onClick={() => setShowTonWallet(false)} />
          <div className="ton-wallet-content">
            <TonWalletConnect onConnect={() => setShowTonWallet(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Token Purchase Banner - Above Everything */}
        <section className="token-banner">
          <div className="token-banner-content">
            <div className="token-banner-left">
              <span className="token-icon">💎</span>
              <div className="token-text">
                <h3>{t('buyChess')}</h3>
                <p>{language === 'en' ? 'Get tokens to play with bets and win more' : 'Obtén tokens para jugar con apuestas'}</p>
              </div>
            </div>
            <div className="token-banner-right">
              <button className="token-buy-btn" onClick={() => setShowTokenPurchase(true)}>
                {language === 'en' ? 'Buy Now' : 'Comprar'}
              </button>
              <button className="lang-toggle" onClick={toggleLanguage}>
                {language === 'en' ? '🇪🇸 ES' : '🇺🇸 EN'}
              </button>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="hero">
          <h1 className="hero-title">{t('heroTitle')}</h1>
          <p className="hero-subtitle">{t('heroSubtitle')}</p>
        </section>

        {/* Carousel 1: Game Modes */}
        <section className="carousel-section">
          <GameCarousel
            items={gameModesCarousel1}
            onItemClick={handleModeSelect}
            title={language === 'en' ? '🎮 Game Modes' : '🎮 Modos de Juego'}
            renderItem={(mode) => (
              <div
                className={`game-card ${mode.requiresWallet && !isWalletConnected ? 'locked' : ''}`}
                style={{ '--accent': mode.color }}
              >
                {mode.popular && <span className="card-badge popular">{t('popular')}</span>}
                {mode.requiresWallet && <span className="card-badge bet">💰 {t('bet')}</span>}
                <div className="game-card-icon">{mode.icon}</div>
                <h3 className="game-card-title">{mode.title}</h3>
                <p className="game-card-desc">{mode.description}</p>
              </div>
            )}
          />
        </section>

        {/* Carousel 2: Extras */}
        <section className="carousel-section">
          <GameCarousel
            items={gameModesCarousel2}
            onItemClick={handleModeSelect}
            title={language === 'en' ? '✨ Extras' : '✨ Extras'}
            renderItem={(mode) => (
              <div
                className={`game-card ${mode.requiresWallet && !isWalletConnected ? 'locked' : ''}`}
                style={{ '--accent': mode.color }}
              >
                {mode.requiresWallet && <span className="card-badge bet">🔐</span>}
                <div className="game-card-icon">{mode.icon}</div>
                <h3 className="game-card-title">{mode.title}</h3>
                <p className="game-card-desc">{mode.description}</p>
              </div>
            )}
          />
        </section>

        {/* Quick Play Section */}
        <section className="quick-play">
          <h2 className="section-title">{language === 'en' ? 'Quick Play vs AI' : 'Juego Rápido vs IA'}</h2>
          <div className="difficulty-select">
            {difficulties.map(diff => (
              <button
                key={diff.id}
                className={`diff-btn ${difficulty === diff.id ? 'active' : ''}`}
                onClick={() => setDifficulty(diff.id)}
              >
                <span className="diff-icon">{diff.icon}</span>
                <span className="diff-label">{diff.label}</span>
                <span className="diff-elo">{diff.elo}</span>
              </button>
            ))}
          </div>
          <button
            className="play-now-btn"
            onClick={() => setGameMode('ai')}
          >
            🎮 {t('playNow')}
          </button>
        </section>

        {/* Stats Section */}
        <section className="stats">
          <div className="stat-card">
            <span className="stat-value">10,000+</span>
            <span className="stat-label">{t('activePlayers')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">1M+</span>
            <span className="stat-label">{t('gamesPlayed')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">500K</span>
            <span className="stat-label">{t('chessDistributed')}</span>
          </div>
        </section>
      </main>

      {showTokenPurchase && (
        isInTelegram ? (
          <TokenPurchaseTON onClose={() => setShowTokenPurchase(false)} />
        ) : (
          <TokenPurchaseV2 onClose={() => setShowTokenPurchase(false)} />
        )
      )}

      {showBettingModal && (
        <BettingModal
          isOpen={showBettingModal}
          onClose={() => setShowBettingModal(false)}
          onStartGame={handleBettingGameStart}
          gameType={bettingType}
        />
      )}

      {
        showSignatureModal && (
          <SignatureModal
            isOpen={showSignatureModal}
            onClose={handleSignatureModalClose}
            onSign={handleSignBet}
            actionType="START_GAME_BET"
            actionDetails={{ amount: pendingBetData?.betAmount }}
            isSigning={isSigning}
            error={signError}
          />
        )
      }

      {/* Squads Panel */}
      {showSquads && (
        <SquadsPanel
          walletAddress={walletAddress}
          onClose={() => setShowSquads(false)}
        />
      )}

      {/* Daily Challenge */}
      {showDailyChallenge && (
        <DailyChallenge
          walletAddress={walletAddress}
          onClose={() => setShowDailyChallenge(false)}
        />
      )}

      {/* Passive Income */}
      {showPassiveIncome && (
        <PassiveIncomeCard
          walletAddress={walletAddress}
          onClose={() => setShowPassiveIncome(false)}
        />
      )}

      <style jsx>{`
        .chess-home {
          min-height: 100vh;
          background: radial-gradient(ellipse at center, #0B1221 0%, #020617 70%);
          color: #F8FAFC;
          font-family: 'Inter', sans-serif;
        }
        
        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          background: rgba(11, 18, 33, 0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(45, 226, 230, 0.2);
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .logo-icon {
          font-size: 32px;
          color: #D4AF37;
          text-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
        }
        
        .logo-text {
          font-size: 24px;
          font-weight: 700;
          font-family: 'Orbitron', sans-serif;
          background: linear-gradient(135deg, #2DE2E6, #7D2AE8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: 0.02em;
        }
        
        .nav-links {
          display: flex;
          gap: 32px;
        }
        
        .nav-link {
          color: #94A3B8;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
          cursor: pointer;
          font-family: 'Orbitron', sans-serif;
          font-size: 12px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        
        .nav-link:hover,
        .nav-link.active {
          color: #2DE2E6;
          text-shadow: 0 0 10px rgba(45, 226, 230, 0.5);
        }
        
        .profile-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .notif-badge {
          position: absolute;
          top: -8px;
          right: -12px;
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          color: #020617;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .buy-tokens-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #2DE2E6, #7D2AE8);
          color: #020617;
          border: none;
          border-radius: 25px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Orbitron', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 0 20px rgba(45, 226, 230, 0.3);
        }
        
        .buy-tokens-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(45, 226, 230, 0.5);
        }
        
        .balance {
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          padding: 10px 20px;
          border-radius: 25px;
          font-weight: 700;
          font-size: 12px;
          color: #020617;
          font-family: 'Orbitron', sans-serif;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
        }
        
        .wallet {
          color: #64748B;
          font-family: 'Roboto Mono', monospace;
          font-size: 12px;
        }
        
        .wallet-connect-area :global(.wallet-adapter-button) {
          background: linear-gradient(135deg, #2DE2E6, #7D2AE8) !important;
          font-family: 'Orbitron', sans-serif !important;
          border-radius: 25px !important;
        }

        .telegram-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .connect-btn {
          padding: 12px 28px;
          background: linear-gradient(135deg, #2DE2E6, #7D2AE8);
          color: #020617;
          border: none;
          border-radius: 25px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Orbitron', sans-serif;
        }
        
        .connect-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(45, 226, 230, 0.5);
        }
        
        .main-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 24px;
        }
        
        .hero {
          text-align: center;
          margin-bottom: 48px;
        }
        
        .hero-title {
          font-size: 48px;
          font-weight: 800;
          margin: 0 0 16px;
          font-family: 'Orbitron', sans-serif;
          background: linear-gradient(135deg, #F8FAFC, #94A3B8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: none;
        }
        
        .hero-subtitle {
          font-size: 18px;
          color: #64748B;
          margin: 0;
        }
        
        .section-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 24px;
          color: #F8FAFC;
          font-family: 'Orbitron', sans-serif;
        }

        /* Token Banner - Top of page */
        .token-banner {
          background: linear-gradient(135deg, rgba(125, 42, 232, 0.3), rgba(45, 226, 230, 0.3));
          border: 1px solid rgba(45, 226, 230, 0.3);
          border-radius: 16px;
          padding: 16px 24px;
          margin-bottom: 24px;
          backdrop-filter: blur(10px);
        }
        
        .token-banner-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .token-banner-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .token-icon {
          font-size: 40px;
          filter: drop-shadow(0 0 10px rgba(125, 42, 232, 0.5));
        }
        
        .token-text h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #F8FAFC;
          font-family: 'Orbitron', sans-serif;
        }
        
        .token-text p {
          margin: 4px 0 0;
          font-size: 14px;
          color: #94A3B8;
        }
        
        .token-banner-right {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .token-buy-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          color: #020617;
          border: none;
          border-radius: 25px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          font-family: 'Orbitron', sans-serif;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
        }
        
        .token-buy-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(212, 175, 55, 0.5);
        }
        
        .lang-toggle {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          color: #F8FAFC;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .lang-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(45, 226, 230, 0.5);
        }

        /* Carousel Section */
        .carousel-section {
          margin-bottom: 32px;
        }

        /* Game Cards for Carousel */
        .game-card {
          width: 260px;
          min-height: 180px;
          background: rgba(11, 18, 33, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(45, 226, 230, 0.2);
          border-radius: 20px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
        }
        
        .game-card:hover {
          transform: translateY(-8px);
          border-color: var(--accent, #2DE2E6);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(45, 226, 230, 0.2);
        }
        
        .game-card.locked {
          opacity: 0.7;
        }
        
        .game-card-icon {
          font-size: 48px;
          margin-bottom: 12px;
          filter: drop-shadow(0 0 10px var(--accent, rgba(45, 226, 230, 0.3)));
        }
        
        .game-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #F8FAFC;
          margin: 0 0 8px;
          font-family: 'Orbitron', sans-serif;
        }
        
        .game-card-desc {
          font-size: 13px;
          color: #94A3B8;
          line-height: 1.4;
          margin: 0;
        }
        
        .card-badge {
          position: absolute;
          top: -8px;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 12px;
          font-family: 'Orbitron', sans-serif;
        }
        
        .card-badge.popular {
          right: -8px;
          background: linear-gradient(135deg, #2DE2E6, #7D2AE8);
          color: #020617;
          box-shadow: 0 0 12px rgba(45, 226, 230, 0.4);
        }
        
        .card-badge.bet {
          left: -8px;
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          color: #020617;
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.4);
        }

        @media (max-width: 768px) {
          .token-banner-content {
            flex-direction: column;
            text-align: center;
          }
          
          .token-banner-left {
            flex-direction: column;
          }
          
          .hero-title {
            font-size: 32px;
          }
          
          .game-card {
            width: 220px;
            min-height: 160px;
            padding: 18px;
          }
        }
        
        .modes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 48px;
        }
        
        .mode-card {
          position: relative;
          background: rgba(11, 18, 33, 0.8);
          border: 1px solid rgba(45, 226, 230, 0.15);
          border-radius: 16px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s;
          text-align: center;
          backdrop-filter: blur(10px);
        }
        
        .mode-card:hover {
          background: rgba(11, 18, 33, 0.95);
          border-color: #2DE2E6;
          transform: translateY(-4px);
          box-shadow: 0 0 30px rgba(45, 226, 230, 0.2);
        }
        
        .popular-badge {
          position: absolute;
          top: -10px;
          right: -10px;
          background: linear-gradient(135deg, #2DE2E6, #7D2AE8);
          color: #020617;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          font-family: 'Orbitron', sans-serif;
          box-shadow: 0 0 15px rgba(45, 226, 230, 0.4);
        }

        .bet-badge-card {
          position: absolute;
          top: -10px;
          left: -10px;
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          color: #020617;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          font-family: 'Orbitron', sans-serif;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
        }

        .bet-badge {
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          padding: 6px 12px;
          border-radius: 16px;
          font-weight: 600;
          font-size: 14px;
          color: #020617;
          animation: pulse-bet 2s infinite;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
        }

        @keyframes pulse-bet {
          0%, 100% { opacity: 1; box-shadow: 0 0 15px rgba(212, 175, 55, 0.3); }
          50% { opacity: 0.8; box-shadow: 0 0 25px rgba(212, 175, 55, 0.5); }
        }

        .mode-card.requires-wallet {
          opacity: 0.7;
        }

        .mode-card.requires-wallet:hover {
          opacity: 1;
        }
        
        .mode-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        
        .mode-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 8px;
          color: #F8FAFC;
          font-family: 'Orbitron', sans-serif;
        }
        
        .mode-desc {
          font-size: 13px;
          color: #64748B;
          margin: 0;
        }
        
        .quick-play {
          background: rgba(11, 18, 33, 0.8);
          border: 1px solid rgba(45, 226, 230, 0.15);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 48px;
          text-align: center;
          backdrop-filter: blur(10px);
        }
        
        .difficulty-select {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        
        .diff-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid transparent;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 100px;
        }
        
        .diff-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .diff-btn.active {
          border-color: #48bb78;
          background: rgba(72, 187, 120, 0.2);
        }
        
        .diff-icon {
          font-size: 28px;
        }
        
        .diff-label {
          font-weight: 600;
        }
        
        .diff-elo {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }
        
        .play-now-btn {
          padding: 16px 48px;
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .play-now-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 32px rgba(72, 187, 120, 0.4);
        }
        
        .token-purchase {
          margin-bottom: 48px;
        }
        
        .purchase-card {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 24px 32px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 16px;
        }
        
        .purchase-icon {
          font-size: 48px;
        }
        
        .purchase-info {
          flex: 1;
        }
        
        .purchase-info h3 {
          margin: 0 0 8px;
          font-size: 20px;
        }
        
        .purchase-info p {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
        }
        
        .purchase-btn {
          padding: 14px 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .purchase-btn:hover {
          transform: scale(1.05);
        }
        
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        
        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }
        
        .stat-value {
          display: block;
          font-size: 36px;
          font-weight: 800;
          color: #fbbf24;
        }
        
        .stat-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }
        
        @media (max-width: 768px) {
          .main-header {
            flex-direction: column;
            gap: 16px;
          }
          
          .nav-links {
            gap: 16px;
          }
          
          .user-info {
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .stats {
            grid-template-columns: 1fr;
          }
          
          .purchase-card {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div >
  )
}

