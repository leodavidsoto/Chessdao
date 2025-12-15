'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useChessTokens } from '@/hooks/useChessTokens'
import { useWalletSignature } from '@/hooks/useWalletSignature'
import SignatureModal from '@/components/SignatureModal'
import { apiFetch } from '@/lib/config'

/**
 * NFTLootBoxes - NFT Loot Box Shop with Normal, Epic, and Legendary boxes
 */
export default function NFTLootBoxes({ onBack }) {
    const { publicKey, connected } = useWallet()
    const { chessBalance, actions } = useChessTokens()
    const { signAction, isSigning, error: signError, clearError } = useWalletSignature()
    const [selectedBox, setSelectedBox] = useState(null)
    const [opening, setOpening] = useState(false)
    const [result, setResult] = useState(null)
    const [inventory, setInventory] = useState([])
    const [showInventory, setShowInventory] = useState(false)
    const [showSignatureModal, setShowSignatureModal] = useState(false)
    const [pendingBox, setPendingBox] = useState(null)

    // Loot box types with prices and drop rates
    const lootBoxes = [
        {
            id: 'normal',
            name: 'Caja Normal',
            icon: '📦',
            price: 50,
            color: '#718096',
            gradient: 'linear-gradient(135deg, #718096, #4a5568)',
            description: 'Contiene items comunes y raros',
            dropRates: {
                common: 0.60,
                rare: 0.30,
                epic: 0.09,
                legendary: 0.01
            }
        },
        {
            id: 'epic',
            name: 'Caja Épica',
            icon: '💜',
            price: 200,
            color: '#9f7aea',
            gradient: 'linear-gradient(135deg, #9f7aea, #6b46c1)',
            description: 'Mayor probabilidad de épicos',
            dropRates: {
                common: 0.20,
                rare: 0.45,
                epic: 0.30,
                legendary: 0.05
            }
        },
        {
            id: 'legendary',
            name: 'Caja Legendaria',
            icon: '🌟',
            price: 500,
            color: '#f6ad55',
            gradient: 'linear-gradient(135deg, #f6ad55, #dd6b20)',
            description: 'Garantiza épico o legendario',
            dropRates: {
                common: 0,
                rare: 0.10,
                epic: 0.70,
                legendary: 0.20
            }
        }
    ]

    // NFT items database
    const nftItems = {
        common: [
            { id: 'c1', name: 'Peón Guerrero', type: 'character', image: '♟️', power: 10 },
            { id: 'c2', name: 'Caballo de Bronce', type: 'character', image: '♞', power: 15 },
            { id: 'c3', name: 'Alfil Místico', type: 'character', image: '♝', power: 12 },
            { id: 'c4', name: 'Ficha de Tiempo +30s', type: 'powerup', image: '⏱️', effect: '+30s' },
            { id: 'c5', name: 'Escudo Básico', type: 'item', image: '🛡️', defense: 5 }
        ],
        rare: [
            { id: 'r1', name: 'Torre de Piedra', type: 'character', image: '♜', power: 25 },
            { id: 'r2', name: 'Caballo de Plata', type: 'character', image: '🐴', power: 30 },
            { id: 'r3', name: 'Skin Clásico', type: 'skin', image: '🎨', theme: 'classic' },
            { id: 'r4', name: 'Boost 1.5x EXP', type: 'powerup', image: '⚡', multiplier: 1.5 }
        ],
        epic: [
            { id: 'e1', name: 'Reina de Cristal', type: 'character', image: '👑', power: 50 },
            { id: 'e2', name: 'Rey Dorado', type: 'character', image: '♚', power: 45 },
            { id: 'e3', name: 'Caballo de Obsidiana', type: 'character', image: '🌑', power: 55 },
            { id: 'e4', name: 'Tablero Neón', type: 'skin', image: '🌈', theme: 'neon' },
            { id: 'e5', name: 'Boost 2x EXP', type: 'powerup', image: '🚀', multiplier: 2 }
        ],
        legendary: [
            { id: 'l1', name: 'Magnus el Inmortal', type: 'character', image: '🧙‍♂️', power: 100 },
            { id: 'l2', name: 'La Dama Oscura', type: 'character', image: '🖤', power: 95 },
            { id: 'l3', name: 'Tablero Dimensional', type: 'skin', image: '🌌', theme: 'dimensional' },
            { id: 'l4', name: 'Avatar Holográfico', type: 'avatar', image: '👤', special: true },
            { id: 'l5', name: 'Corona del Campeón', type: 'item', image: '👑', prestige: true }
        ]
    }

    // Load inventory
    useEffect(() => {
        if (connected && publicKey) {
            loadInventory()
        }
    }, [connected, publicKey])

    const loadInventory = async () => {
        try {
            const res = await apiFetch(`/api/nft/inventory?wallet=${publicKey?.toString()}`)
            const data = await res.json()
            if (data.success) {
                setInventory(data.nfts || [])
            }
        } catch (error) {
            console.error('Error loading inventory:', error)
            // Demo inventory
            setInventory([
                { ...nftItems.common[0], rarity: 'common', mintedAt: new Date() },
                { ...nftItems.rare[0], rarity: 'rare', mintedAt: new Date() }
            ])
        }
    }

    // Calculate rarity based on drop rates
    const calculateRarity = (dropRates) => {
        const rand = Math.random()
        let cumulative = 0

        for (const [rarity, rate] of Object.entries(dropRates)) {
            cumulative += rate
            if (rand <= cumulative) {
                return rarity
            }
        }
        return 'common'
    }

    // Request to open loot box - shows signature modal first
    const requestOpenBox = (box) => {
        if (!connected) {
            alert('Conecta tu wallet para comprar cajas')
            return
        }

        if (chessBalance < box.price) {
            alert(`No tienes suficientes CHESS. Necesitas ${box.price} CHESS`)
            return
        }

        // Store pending box and show signature modal
        setPendingBox(box)
        setShowSignatureModal(true)
    }

    // Handle signature for loot box
    const handleSignLootBox = async () => {
        if (!pendingBox) return null
        const result = await signAction('OPEN_LOOTBOX', {
            type: pendingBox.name,
            cost: pendingBox.price
        })
        return result
    }

    // Handle signature modal close
    const handleSignatureModalClose = (success) => {
        setShowSignatureModal(false)
        if (success && pendingBox) {
            // Signature successful - open the box
            actuallyOpenBox(pendingBox)
        }
        setPendingBox(null)
        clearError()
    }

    // Open loot box (after signature)
    const actuallyOpenBox = async (box) => {
        setSelectedBox(box)
        setOpening(true)
        setResult(null)

        // Simulate opening animation
        await new Promise(resolve => setTimeout(resolve, 2500))

        // Calculate what player gets
        const rarity = calculateRarity(box.dropRates)
        const items = nftItems[rarity]
        const item = items[Math.floor(Math.random() * items.length)]

        try {
            // Call API to mint NFT
            const res = await apiFetch('/api/nft/mint', {
                method: 'POST',
                body: JSON.stringify({
                    wallet: publicKey.toString(),
                    boxType: box.id,
                    price: box.price,
                    item: { ...item, rarity }
                })
            })

            const data = await res.json()

            setResult({
                ...item,
                rarity,
                transactionId: data.transactionId || `tx_${Date.now()}`
            })

            // Add to inventory
            setInventory(prev => [...prev, { ...item, rarity, mintedAt: new Date() }])

        } catch (error) {
            console.error('Error minting NFT:', error)
            // Still show result in demo mode
            setResult({
                ...item,
                rarity,
                transactionId: `demo_${Date.now()}`
            })
        }

        setOpening(false)
    }

    // Get rarity color
    const getRarityColor = (rarity) => {
        switch (rarity) {
            case 'common': return '#718096'
            case 'rare': return '#4299e1'
            case 'epic': return '#9f7aea'
            case 'legendary': return '#f6ad55'
            default: return '#718096'
        }
    }

    // Get rarity label
    const getRarityLabel = (rarity) => {
        switch (rarity) {
            case 'common': return 'Común'
            case 'rare': return 'Raro'
            case 'epic': return 'Épico'
            case 'legendary': return 'Legendario'
            default: return rarity
        }
    }

    return (
        <div className="nft-shop">
            {/* Header */}
            <div className="shop-header">
                <button onClick={onBack} className="back-btn">← Volver</button>
                <h1>🎁 Tienda NFT</h1>
                <div className="header-right">
                    <button
                        onClick={() => setShowInventory(!showInventory)}
                        className="inventory-btn"
                    >
                        🎒 Mi Inventario ({inventory.length})
                    </button>
                    <span className="balance">💰 {actions.formatChessAmount(chessBalance)} CHESS</span>
                </div>
            </div>

            {showInventory ? (
                /* Inventory View */
                <div className="inventory-section">
                    <h2>🎒 Tu Colección NFT</h2>
                    {inventory.length === 0 ? (
                        <div className="empty-inventory">
                            <p>No tienes NFTs aún</p>
                            <button onClick={() => setShowInventory(false)}>
                                Comprar Cajas
                            </button>
                        </div>
                    ) : (
                        <div className="inventory-grid">
                            {inventory.map((nft, idx) => (
                                <div
                                    key={idx}
                                    className="nft-card"
                                    style={{ '--rarity-color': getRarityColor(nft.rarity) }}
                                >
                                    <div className="nft-image">{nft.image}</div>
                                    <div className="nft-info">
                                        <span className="nft-name">{nft.name}</span>
                                        <span
                                            className="nft-rarity"
                                            style={{ color: getRarityColor(nft.rarity) }}
                                        >
                                            {getRarityLabel(nft.rarity)}
                                        </span>
                                    </div>
                                    <button className="transfer-btn">Transferir</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Shop View */
                <div className="shop-content">
                    <div className="boxes-grid">
                        {lootBoxes.map(box => (
                            <div
                                key={box.id}
                                className={`box-card ${chessBalance < box.price ? 'disabled' : ''}`}
                                style={{ '--box-gradient': box.gradient }}
                                onClick={() => !opening && requestOpenBox(box)}
                            >
                                <div className="box-glow"></div>
                                <div className="box-icon">{box.icon}</div>
                                <h3>{box.name}</h3>
                                <p className="box-desc">{box.description}</p>
                                <div className="box-price">
                                    <span className="price-value">{box.price}</span>
                                    <span className="price-unit">CHESS</span>
                                </div>
                                <div className="drop-rates">
                                    <span className="rate common">Común: {box.dropRates.common * 100}%</span>
                                    <span className="rate rare">Raro: {box.dropRates.rare * 100}%</span>
                                    <span className="rate epic">Épico: {box.dropRates.epic * 100}%</span>
                                    <span className="rate legendary">Legend: {box.dropRates.legendary * 100}%</span>
                                </div>
                                <button className="buy-btn">
                                    Comprar y Abrir
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Recent Drops */}
                    <div className="recent-drops">
                        <h3>🔥 Drops Recientes</h3>
                        <div className="drops-ticker">
                            <span className="drop-item">
                                <span className="drop-icon">🧙‍♂️</span>
                                <span className="drop-name">Magnus el Inmortal</span>
                                <span className="drop-rarity legendary">Legendario</span>
                            </span>
                            <span className="drop-item">
                                <span className="drop-icon">👑</span>
                                <span className="drop-name">Reina de Cristal</span>
                                <span className="drop-rarity epic">Épico</span>
                            </span>
                            <span className="drop-item">
                                <span className="drop-icon">♜</span>
                                <span className="drop-name">Torre de Piedra</span>
                                <span className="drop-rarity rare">Raro</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal for Loot Box */}
            {showSignatureModal && (
                <SignatureModal
                    isOpen={showSignatureModal}
                    onClose={handleSignatureModalClose}
                    onSign={handleSignLootBox}
                    actionType="OPEN_LOOTBOX"
                    actionDetails={{ type: pendingBox?.name, cost: pendingBox?.price }}
                    isSigning={isSigning}
                    error={signError}
                />
            )}

            {/* Opening Animation Modal */}
            {(opening || result) && (
                <div className="opening-modal">
                    <div className="modal-content">
                        {opening ? (
                            <div className="opening-animation">
                                <div className="box-opening">
                                    <span className="spinning-box">{selectedBox?.icon}</span>
                                </div>
                                <p>Abriendo {selectedBox?.name}...</p>
                            </div>
                        ) : result && (
                            <div className="result-reveal">
                                <div
                                    className="result-card"
                                    style={{ '--rarity-color': getRarityColor(result.rarity) }}
                                >
                                    <div className="result-rarity">{getRarityLabel(result.rarity)}</div>
                                    <div className="result-icon">{result.image}</div>
                                    <h2>{result.name}</h2>
                                    <p className="result-type">{result.type}</p>
                                    <div className="result-tx">
                                        TX: {result.transactionId?.slice(0, 12)}...
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setResult(null); setSelectedBox(null) }}
                                    className="close-btn"
                                >
                                    ¡Genial!
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .nft-shop {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: white;
                    padding: 20px;
                }

                .shop-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .shop-header h1 {
                    font-size: 28px;
                    margin: 0;
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .header-right {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .back-btn, .inventory-btn {
                    padding: 10px 20px;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .back-btn:hover, .inventory-btn:hover {
                    background: rgba(255,255,255,0.2);
                }

                .balance {
                    background: linear-gradient(135deg, #48bb78, #38a169);
                    padding: 10px 20px;
                    border-radius: 20px;
                    font-weight: 600;
                }

                .shop-content {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .boxes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 30px;
                    margin-bottom: 40px;
                }

                .box-card {
                    position: relative;
                    background: rgba(255,255,255,0.05);
                    border: 2px solid rgba(255,255,255,0.1);
                    border-radius: 20px;
                    padding: 30px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    overflow: hidden;
                }

                .box-card:hover {
                    transform: translateY(-8px);
                    border-color: rgba(255,255,255,0.3);
                }

                .box-card.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .box-glow {
                    position: absolute;
                    inset: 0;
                    background: var(--box-gradient);
                    opacity: 0.1;
                    transition: opacity 0.3s;
                }

                .box-card:hover .box-glow {
                    opacity: 0.2;
                }

                .box-icon {
                    font-size: 80px;
                    margin-bottom: 16px;
                    position: relative;
                    z-index: 1;
                    animation: float 3s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                .box-card h3 {
                    font-size: 24px;
                    margin: 0 0 8px;
                    position: relative;
                    z-index: 1;
                }

                .box-desc {
                    color: rgba(255,255,255,0.6);
                    margin: 0 0 20px;
                    position: relative;
                    z-index: 1;
                }

                .box-price {
                    display: flex;
                    justify-content: center;
                    align-items: baseline;
                    gap: 8px;
                    margin-bottom: 16px;
                    position: relative;
                    z-index: 1;
                }

                .price-value {
                    font-size: 36px;
                    font-weight: 800;
                    background: var(--box-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .price-unit {
                    font-size: 16px;
                    color: rgba(255,255,255,0.6);
                }

                .drop-rates {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 8px;
                    margin-bottom: 20px;
                    position: relative;
                    z-index: 1;
                }

                .rate {
                    font-size: 11px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.1);
                }

                .rate.common { color: #718096; }
                .rate.rare { color: #4299e1; }
                .rate.epic { color: #9f7aea; }
                .rate.legendary { color: #f6ad55; }

                .buy-btn {
                    width: 100%;
                    padding: 14px;
                    background: var(--box-gradient);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-weight: 700;
                    font-size: 16px;
                    cursor: pointer;
                    position: relative;
                    z-index: 1;
                    transition: all 0.2s;
                }

                .buy-btn:hover {
                    transform: scale(1.02);
                }

                .recent-drops {
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 20px;
                }

                .recent-drops h3 {
                    margin: 0 0 16px;
                }

                .drops-ticker {
                    display: flex;
                    gap: 20px;
                    overflow-x: auto;
                    padding-bottom: 10px;
                }

                .drop-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.05);
                    padding: 8px 16px;
                    border-radius: 8px;
                    white-space: nowrap;
                }

                .drop-icon {
                    font-size: 24px;
                }

                .drop-rarity {
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 4px;
                }

                .drop-rarity.legendary {
                    background: rgba(246, 173, 85, 0.2);
                    color: #f6ad55;
                }

                .drop-rarity.epic {
                    background: rgba(159, 122, 234, 0.2);
                    color: #9f7aea;
                }

                .drop-rarity.rare {
                    background: rgba(66, 153, 225, 0.2);
                    color: #4299e1;
                }

                /* Inventory */
                .inventory-section {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .inventory-section h2 {
                    margin-bottom: 24px;
                }

                .inventory-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 20px;
                }

                .nft-card {
                    background: rgba(255,255,255,0.05);
                    border: 2px solid var(--rarity-color);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                }

                .nft-image {
                    font-size: 48px;
                    margin-bottom: 12px;
                }

                .nft-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    margin-bottom: 12px;
                }

                .nft-name {
                    font-weight: 600;
                }

                .nft-rarity {
                    font-size: 12px;
                }

                .transfer-btn {
                    width: 100%;
                    padding: 8px;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                }

                .transfer-btn:hover {
                    background: rgba(255,255,255,0.2);
                }

                .empty-inventory {
                    text-align: center;
                    padding: 60px;
                }

                .empty-inventory button {
                    margin-top: 20px;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                }

                /* Opening Modal */
                .opening-modal {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    text-align: center;
                }

                .opening-animation {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .box-opening {
                    width: 150px;
                    height: 150px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                }

                .spinning-box {
                    font-size: 100px;
                    animation: shake 0.3s infinite, glow 0.5s infinite alternate;
                }

                @keyframes shake {
                    0%, 100% { transform: rotate(-5deg); }
                    50% { transform: rotate(5deg); }
                }

                @keyframes glow {
                    from { filter: brightness(1); }
                    to { filter: brightness(1.5); }
                }

                .result-reveal {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 24px;
                }

                .result-card {
                    background: rgba(0,0,0,0.5);
                    border: 3px solid var(--rarity-color);
                    border-radius: 20px;
                    padding: 40px 60px;
                    animation: reveal 0.5s ease-out;
                }

                @keyframes reveal {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .result-rarity {
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    color: var(--rarity-color);
                    margin-bottom: 16px;
                }

                .result-icon {
                    font-size: 100px;
                    margin-bottom: 16px;
                }

                .result-card h2 {
                    margin: 0 0 8px;
                    font-size: 28px;
                }

                .result-type {
                    color: rgba(255,255,255,0.6);
                    margin: 0 0 16px;
                }

                .result-tx {
                    font-family: monospace;
                    font-size: 12px;
                    color: rgba(255,255,255,0.4);
                }

                .close-btn {
                    padding: 16px 48px;
                    background: linear-gradient(135deg, #48bb78, #38a169);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-size: 18px;
                    font-weight: 700;
                    cursor: pointer;
                }

                @media (max-width: 768px) {
                    .shop-header {
                        flex-direction: column;
                        text-align: center;
                    }

                    .boxes-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
