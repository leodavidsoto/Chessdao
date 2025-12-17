'use client'

export default function Error({ error, reset }) {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>😵 ¡Oops!</h1>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '2rem' }}>
                Algo salió mal
            </p>
            <button
                onClick={() => reset()}
                style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #2DE2E6, #7D2AE8)',
                    color: '#020617',
                    border: 'none',
                    borderRadius: '25px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '1rem'
                }}
            >
                🔄 Intentar de nuevo
            </button>
        </div>
    )
}
