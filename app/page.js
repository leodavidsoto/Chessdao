'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import ChessComLayout from '@/components/ChessComLayout'
import { usePhantomDeeplink } from '@/hooks/usePhantomDeeplink'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import TelegramWalletConnect from '@/components/TelegramWalletConnect'

export default function Home() {
  const { connected, publicKey } = useWallet()
  const phantom = usePhantomDeeplink()
  const telegram = useTelegramWebApp()
  const [showApp, setShowApp] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [telegramConnection, setTelegramConnection] = useState(null)

  useEffect(() => {
    setMounted(true)
    // Detect mobile/Android WebView
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    setIsMobile(mobile)
  }, [])

  useEffect(() => {
    if (connected || phantom.connected || telegramConnection) {
      setShowApp(true)
    }
  }, [connected, phantom.connected, telegramConnection])

  // Handle Telegram wallet connection
  const handleTelegramConnect = (connectionData) => {
    console.log('Telegram connected:', connectionData)
    setTelegramConnection(connectionData)
    setShowApp(true)
  }

  if (!mounted) {
    return (
      <div className="landing-page">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Initializing ChessDao...</p>
        </div>
        <style jsx>{`
          .landing-page {
            min-height: 100vh;
            background: radial-gradient(ellipse at center, #0B1221 0%, #020617 70%);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loading-content {
            text-align: center;
          }
          .loading-spinner {
            width: 60px;
            height: 60px;
            border: 3px solid rgba(45, 226, 230, 0.2);
            border-top-color: #2DE2E6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          .loading-text {
            font-family: 'Orbitron', sans-serif;
            color: #94A3B8;
            letter-spacing: 0.1em;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!showApp && !connected) {
    return (
      <div className="landing-page">
        {/* Background Effects */}
        <div className="bg-gradient"></div>
        <div className="chess-pattern-bg"></div>
        <div className="glow-orb glow-orb-1"></div>
        <div className="glow-orb glow-orb-2"></div>

        <div className="landing-content">
          {/* Hero Section with Logo */}
          <div className="hero-section">
            <div className="logo-container">
              <img
                src="/chessdao-logo.png"
                alt="ChessDao Logo"
                className="hero-logo"
              />
            </div>

            <div className="hero-text">
              <h1 className="hero-title">
                <span className="title-chess">chess</span>
                <span className="title-dao">Dao</span>
              </h1>
              <p className="hero-subtitle">DECENTRALIZED STRATEGY</p>
              <p className="hero-description">
                El futuro del ajedrez competitivo. Juega, apuesta y gana tokens CHESS
                en la plataforma de ajedrez descentralizada más avanzada.
              </p>
            </div>
          </div>

          {/* Token Sale Banner */}
          <div className="token-sale-banner">
            <div className="sale-badge">VENTA ACTIVA</div>
            <div className="sale-content">
              <div className="sale-info">
                <h2>Compra Tokens CHESS</h2>
                <p>Precio de lanzamiento: <span className="price-highlight">$0.01 USD</span> por token</p>
                <div className="sale-features">
                  <span>✓ Paga con SOL o USDC</span>
                  <span>✓ Tokens instantáneos</span>
                  <span>✓ Úsalos para apostar</span>
                </div>
              </div>
              <div className="sale-stats">
                <div className="token-price-display">
                  <span className="token-amount">1,000</span>
                  <span className="token-label">CHESS</span>
                  <span className="token-equals">=</span>
                  <span className="token-usd">$10 USD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <div className="feature-content">
                <h3>IA Avanzada</h3>
                <p>4 niveles de dificultad con motor de ajedrez profesional</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚔️</div>
              <div className="feature-content">
                <h3>PVP con Apuestas</h3>
                <p>Desafía a otros jugadores y apuesta tokens CHESS</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <div className="feature-content">
                <h3>Gana Premios</h3>
                <p>Gana tokens reales en blockchain de Solana</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎁</div>
              <div className="feature-content">
                <h3>NFT Loot Boxes</h3>
                <p>Colecciona piezas únicas y potenciadores</p>
              </div>
            </div>
          </div>

          {/* Chain Divider */}
          <div className="chain-divider">
            <span className="chain-link"></span>
            <span className="chain-link"></span>
            <span className="chain-link"></span>
          </div>

          {/* CTA Buttons */}
          <div className="cta-section">
            {telegram.isInTelegram ? (
              /* Telegram Mini App - show alternative connection */
              <div className="telegram-connect-wrapper">
                <TelegramWalletConnect onConnect={handleTelegramConnect} />
              </div>
            ) : isMobile ? (
              <>
                <button
                  onClick={phantom.connect}
                  className="phantom-mobile-button"
                  disabled={phantom.connecting}
                >
                  <img src="https://phantom.app/img/phantom-icon-purple.svg" alt="Phantom" className="phantom-icon" />
                  {phantom.connecting ? 'Conectando...' : 'Conectar con Phantom'}
                </button>
                {phantom.connected && (
                  <div className="connected-info">
                    ✅ Conectado: {phantom.publicKey?.toString().slice(0, 8)}...
                  </div>
                )}
              </>
            ) : (
              <>
                <WalletMultiButton className="wallet-button" />
                {connected && (
                  <div className="connected-info">
                    ✅ Conectado: {publicKey?.toString().slice(0, 8)}...
                  </div>
                )}
              </>
            )}
            {!telegram.isInTelegram && (
              <button onClick={() => setShowApp(true)} className="guest-button">
                Jugar como Invitado
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="stats-section">
            <div className="stat">
              <span className="stat-value">10K+</span>
              <span className="stat-label">Jugadores</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-value">1M+</span>
              <span className="stat-label">Partidas</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-value">$50K</span>
              <span className="stat-label">En Premios</span>
            </div>
          </div>

          {/* Footer */}
          <div className="landing-footer">
            <p>Powered by <span className="solana-text">Solana</span></p>
          </div>
        </div>

        <style jsx>{`
          .landing-page {
            min-height: 100vh;
            background: #020617;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
          }

          .bg-gradient {
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at 50% 0%, rgba(45, 226, 230, 0.08) 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 80%, rgba(125, 42, 232, 0.08) 0%, transparent 40%),
                        radial-gradient(ellipse at 20% 90%, rgba(212, 175, 55, 0.05) 0%, transparent 40%);
          }

          .chess-pattern-bg {
            position: absolute;
            inset: 0;
            opacity: 0.02;
            background-image: 
              linear-gradient(45deg, #2DE2E6 25%, transparent 25%),
              linear-gradient(-45deg, #2DE2E6 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #2DE2E6 75%),
              linear-gradient(-45deg, transparent 75%, #2DE2E6 75%);
            background-size: 60px 60px;
            background-position: 0 0, 0 30px, 30px -30px, -30px 0px;
          }

          .glow-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.3;
          }

          .glow-orb-1 {
            top: -200px;
            right: -100px;
            width: 400px;
            height: 400px;
            background: #2DE2E6;
          }

          .glow-orb-2 {
            bottom: -200px;
            left: -100px;
            width: 500px;
            height: 500px;
            background: #7D2AE8;
          }

          .landing-content {
            position: relative;
            z-index: 1;
            text-align: center;
            padding: 40px 20px;
            max-width: 900px;
            width: 100%;
          }

          .hero-section {
            margin-bottom: 48px;
          }

          .logo-container {
            margin-bottom: 24px;
          }

          .hero-logo {
            width: 280px;
            height: auto;
            filter: drop-shadow(0 0 40px rgba(45, 226, 230, 0.3));
            animation: float 4s ease-in-out infinite;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
          }

          .hero-text {
            max-width: 600px;
            margin: 0 auto;
          }

          .hero-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 64px;
            font-weight: 900;
            margin: 0;
            letter-spacing: 0.02em;
          }

          .title-chess {
            color: #F8FAFC;
          }

          .title-dao {
            background: linear-gradient(135deg, #2DE2E6, #7D2AE8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .hero-subtitle {
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            letter-spacing: 0.3em;
            color: #94A3B8;
            margin: 8px 0 24px;
          }

          .hero-description {
            font-size: 16px;
            line-height: 1.7;
            color: #64748B;
            max-width: 500px;
            margin: 0 auto;
          }

          .token-sale-banner {
            background: linear-gradient(135deg, rgba(45, 226, 230, 0.1), rgba(125, 42, 232, 0.1));
            border: 2px solid rgba(212, 175, 55, 0.5);
            border-radius: 20px;
            padding: 24px;
            margin-bottom: 32px;
            position: relative;
            overflow: hidden;
          }

          .token-sale-banner::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #D4AF37, #F59E0B, #D4AF37);
            animation: shimmer 2s infinite;
          }

          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          .sale-badge {
            position: absolute;
            top: -1px;
            right: 20px;
            background: linear-gradient(135deg, #D4AF37, #F59E0B);
            color: #020617;
            font-family: 'Orbitron', sans-serif;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
            padding: 6px 16px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
          }

          .sale-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
          }

          .sale-info h2 {
            font-family: 'Orbitron', sans-serif;
            font-size: 22px;
            font-weight: 700;
            color: #F8FAFC;
            margin: 0 0 8px;
          }

          .sale-info p {
            color: #94A3B8;
            margin: 0 0 12px;
            font-size: 14px;
          }

          .price-highlight {
            color: #D4AF37;
            font-weight: 700;
            font-size: 18px;
          }

          .sale-features {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
          }

          .sale-features span {
            font-size: 12px;
            color: #48BB78;
            background: rgba(72, 187, 120, 0.1);
            padding: 4px 10px;
            border-radius: 20px;
          }

          .token-price-display {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.3);
            padding: 16px 24px;
            border-radius: 12px;
            border: 1px solid rgba(212, 175, 55, 0.3);
          }

          .token-amount {
            font-family: 'Orbitron', sans-serif;
            font-size: 28px;
            font-weight: 700;
            color: #D4AF37;
          }

          .token-label {
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            color: #94A3B8;
          }

          .token-equals {
            color: #64748B;
            font-size: 20px;
          }

          .token-usd {
            font-family: 'Orbitron', sans-serif;
            font-size: 24px;
            font-weight: 700;
            color: #48BB78;
          }

          .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 32px;
          }

          .feature-card {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
            background: rgba(11, 18, 33, 0.6);
            border: 1px solid rgba(45, 226, 230, 0.15);
            border-radius: 16px;
            text-align: left;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          }

          .feature-card:hover {
            border-color: rgba(45, 226, 230, 0.4);
            transform: translateY(-4px);
            box-shadow: 0 10px 40px rgba(45, 226, 230, 0.1);
          }

          .feature-icon {
            font-size: 32px;
            flex-shrink: 0;
          }

          .feature-content h3 {
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: #F8FAFC;
            margin: 0 0 6px;
          }

          .feature-content p {
            font-size: 13px;
            color: #64748B;
            margin: 0;
            line-height: 1.5;
          }

          .chain-divider {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin: 32px 0;
            position: relative;
          }

          .chain-divider::before,
          .chain-divider::after {
            content: '';
            flex: 1;
            max-width: 200px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(45, 226, 230, 0.4), rgba(212, 175, 55, 0.4), transparent);
          }

          .chain-link {
            width: 20px;
            height: 10px;
            border: 2px solid #D4AF37;
            border-radius: 5px;
            opacity: 0.7;
          }

          .cta-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            margin-bottom: 48px;
          }

          .cta-section :global(.wallet-button),
          .cta-section :global(.wallet-adapter-button) {
            width: 100%;
            max-width: 320px;
            height: 56px;
            font-family: 'Orbitron', sans-serif !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            letter-spacing: 0.05em !important;
            border-radius: 50px !important;
            background: linear-gradient(135deg, #2DE2E6, #7D2AE8) !important;
            color: #020617 !important;
            border: none !important;
            box-shadow: 0 0 30px rgba(45, 226, 230, 0.3) !important;
            transition: all 0.3s ease !important;
          }

          .cta-section :global(.wallet-button):hover,
          .cta-section :global(.wallet-adapter-button):hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 0 50px rgba(45, 226, 230, 0.5) !important;
          }

          .guest-button {
            width: 100%;
            max-width: 320px;
            height: 56px;
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.05em;
            color: #2DE2E6;
            background: transparent;
            border: 1px solid rgba(45, 226, 230, 0.4);
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .guest-button:hover {
            background: rgba(45, 226, 230, 0.1);
            border-color: #2DE2E6;
            box-shadow: 0 0 20px rgba(45, 226, 230, 0.2);
          }

          .phantom-mobile-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            width: 100%;
            max-width: 320px;
            height: 56px;
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.05em;
            color: #FFFFFF;
            background: linear-gradient(135deg, #AB9FF2, #7C3AED);
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 0 30px rgba(124, 58, 237, 0.4);
          }

          .phantom-mobile-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 50px rgba(124, 58, 237, 0.6);
          }

          .phantom-mobile-button:active {
            transform: translateY(0);
          }

          .phantom-icon {
            width: 24px;
            height: 24px;
          }

          .manual-connect-button {
            width: 100%;
            max-width: 320px;
            height: 48px;
            font-family: 'Orbitron', sans-serif;
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.05em;
            color: #AB9FF2;
            background: rgba(124, 58, 237, 0.15);
            border: 1px solid rgba(124, 58, 237, 0.4);
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .manual-connect-button:hover {
            background: rgba(124, 58, 237, 0.25);
            border-color: #AB9FF2;
            box-shadow: 0 0 20px rgba(124, 58, 237, 0.3);
          }

          .connected-info {
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            color: #48BB78;
            padding: 16px 24px;
            background: rgba(72, 187, 120, 0.1);
            border: 1px solid rgba(72, 187, 120, 0.3);
            border-radius: 50px;
          }

          .stats-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 32px;
            margin-bottom: 32px;
          }

          .stat {
            text-align: center;
          }

          .stat-value {
            display: block;
            font-family: 'Orbitron', sans-serif;
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(135deg, #D4AF37, #F59E0B);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .stat-label {
            font-size: 11px;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.15em;
          }

          .stat-divider {
            width: 1px;
            height: 40px;
            background: linear-gradient(180deg, transparent, rgba(45, 226, 230, 0.3), transparent);
          }

          .landing-footer {
            margin-top: 24px;
          }

          .landing-footer p {
            font-size: 12px;
            color: #475569;
          }

          .solana-text {
            background: linear-gradient(135deg, #9945FF, #14F195);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 600;
          }

          @media (max-width: 768px) {
            .hero-title {
              font-size: 42px;
            }
            .hero-logo {
              width: 200px;
            }
            .features-grid {
              grid-template-columns: 1fr;
            }
            .stats-section {
              gap: 20px;
            }
            .stat-value {
              font-size: 24px;
            }
          }
        `}</style>
      </div>
    )
  }

  return <ChessComLayout />
}