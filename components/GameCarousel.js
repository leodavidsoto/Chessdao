'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * GameCarousel - Horizontal scrolling carousel for game mode cards
 * Supports touch swipe on mobile and arrow buttons on desktop
 */
export default function GameCarousel({
    items,
    onItemClick,
    renderItem,
    title
}) {
    const scrollRef = useRef(null)
    const [showLeftArrow, setShowLeftArrow] = useState(false)
    const [showRightArrow, setShowRightArrow] = useState(true)

    const checkArrows = () => {
        if (!scrollRef.current) return
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        setShowLeftArrow(scrollLeft > 10)
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }

    useEffect(() => {
        checkArrows()
        const el = scrollRef.current
        if (el) {
            el.addEventListener('scroll', checkArrows)
            return () => el.removeEventListener('scroll', checkArrows)
        }
    }, [items])

    const scroll = (direction) => {
        if (!scrollRef.current) return
        const cardWidth = 280 // Card width + gap
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -cardWidth : cardWidth,
            behavior: 'smooth'
        })
    }

    return (
        <div className="carousel-container">
            {title && (
                <h2 className="carousel-title">{title}</h2>
            )}

            <div className="carousel-wrapper">
                {/* Left Arrow */}
                {showLeftArrow && (
                    <button
                        className="carousel-arrow left"
                        onClick={() => scroll('left')}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                )}

                {/* Scrollable Content */}
                <div
                    ref={scrollRef}
                    className="carousel-scroll"
                >
                    {items.map((item, index) => (
                        <div
                            key={item.id || index}
                            className="carousel-item"
                            onClick={() => onItemClick?.(item)}
                        >
                            {renderItem ? renderItem(item) : (
                                <div className="carousel-card">
                                    <div className="card-icon">{item.icon}</div>
                                    <h3 className="card-title">{item.title}</h3>
                                    <p className="card-desc">{item.description}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Right Arrow */}
                {showRightArrow && (
                    <button
                        className="carousel-arrow right"
                        onClick={() => scroll('right')}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                )}
            </div>

            <style jsx>{`
                .carousel-container {
                    margin-bottom: 32px;
                }

                .carousel-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #F8FAFC;
                    margin-bottom: 16px;
                    font-family: 'Orbitron', sans-serif;
                }

                .carousel-wrapper {
                    position: relative;
                }

                .carousel-scroll {
                    display: flex;
                    gap: 16px;
                    overflow-x: auto;
                    scroll-snap-type: x mandatory;
                    scroll-behavior: smooth;
                    padding: 8px 4px 16px;
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

                .carousel-scroll::-webkit-scrollbar {
                    display: none;
                }

                .carousel-item {
                    flex-shrink: 0;
                    scroll-snap-align: start;
                }

                .carousel-card {
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
                }

                .carousel-card:hover {
                    transform: translateY(-8px);
                    border-color: rgba(45, 226, 230, 0.6);
                    box-shadow: 
                        0 20px 40px rgba(0, 0, 0, 0.4),
                        0 0 30px rgba(45, 226, 230, 0.2);
                }

                .card-icon {
                    font-size: 48px;
                    margin-bottom: 12px;
                    filter: drop-shadow(0 0 10px rgba(45, 226, 230, 0.3));
                }

                .card-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #F8FAFC;
                    margin-bottom: 8px;
                    font-family: 'Orbitron', sans-serif;
                }

                .card-desc {
                    font-size: 13px;
                    color: #94A3B8;
                    line-height: 1.4;
                }

                .carousel-arrow {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 44px;
                    height: 44px;
                    background: rgba(11, 18, 33, 0.9);
                    border: 1px solid rgba(45, 226, 230, 0.3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #2DE2E6;
                    cursor: pointer;
                    z-index: 10;
                    transition: all 0.2s;
                    backdrop-filter: blur(10px);
                }

                .carousel-arrow:hover {
                    background: rgba(45, 226, 230, 0.15);
                    border-color: #2DE2E6;
                    box-shadow: 0 0 20px rgba(45, 226, 230, 0.3);
                }

                .carousel-arrow.left {
                    left: -22px;
                }

                .carousel-arrow.right {
                    right: -22px;
                }

                @media (max-width: 768px) {
                    .carousel-arrow {
                        display: none;
                    }
                    
                    .carousel-card {
                        width: 220px;
                        min-height: 160px;
                        padding: 20px;
                    }
                    
                    .card-icon {
                        font-size: 40px;
                    }
                }
            `}</style>
        </div>
    )
}
