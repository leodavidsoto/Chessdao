import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { mintChessTokens } from '@/lib/solana'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = "dao_chess"

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db(DB_NAME)
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const amount = parseFloat(searchParams.get('amount'))
    const tokens = parseInt(searchParams.get('tokens'))
    const walletAddress = searchParams.get('wallet')

    if (!sessionId || !amount || !tokens || !walletAddress) {
      return new NextResponse(`
        <html>
          <head><title>Payment Error</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px; background: #1e293b;">
            <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
              <h1 style="color: #dc2626;">Payment Error</h1>
              <p>Missing payment parameters. Please try again.</p>
              <a href="/" style="color: #2563eb;">Return to DAO Chess</a>
            </div>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Mock payment page
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>DAO Chess - Payment Checkout</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 40px;
              background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
              color: white;
              min-height: 100vh;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 15px;
              color: #333;
              box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #f59e0b;
              margin-bottom: 10px;
            }
            .amount {
              font-size: 48px;
              font-weight: bold;
              color: #16a34a;
              margin: 20px 0;
            }
            .details {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
            }
            .btn {
              width: 100%;
              padding: 15px;
              font-size: 18px;
              font-weight: bold;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              margin: 10px 0;
              transition: all 0.3s;
            }
            .btn-success {
              background: #16a34a;
              color: white;
            }
            .btn-success:hover {
              background: #15803d;
            }
            .btn-cancel {
              background: #6b7280;
              color: white;
            }
            .btn-cancel:hover {
              background: #4b5563;
            }
            .payment-methods {
              text-align: center;
              margin: 20px 0;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">👑 DAO Chess</div>
              <h2>Secure Token Purchase</h2>
            </div>

            <div class="amount">$${amount.toFixed(2)} USD</div>
            
            <div class="details">
              <h3>Purchase Details</h3>
              <div class="detail-row">
                <span>CHESS Tokens:</span>
                <strong>${tokens.toLocaleString()}</strong>
              </div>
              <div class="detail-row">
                <span>Price per Token:</span>
                <strong>$0.01</strong>
              </div>
              <div class="detail-row">
                <span>Wallet Address:</span>
                <strong>${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}</strong>
              </div>
              <div class="detail-row">
                <span>Session ID:</span>
                <strong>${sessionId.slice(0, 16)}...</strong>
              </div>
            </div>

            <div class="payment-methods">
              🔒 SSL Secured • 💳 All Major Cards • ⚡ Instant Delivery
            </div>

            <button class="btn btn-success" onclick="processPayment()">
              💳 Complete Payment
            </button>
            
            <button class="btn btn-cancel" onclick="cancelPayment()">
              Cancel Payment
            </button>

            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">
              This is a demo payment system. In production, this would integrate with Stripe.
            </div>
          </div>

          <script>
            async function processPayment() {
              const btn = document.querySelector('.btn-success');
              btn.innerHTML = '⏳ Processing Payment...';
              btn.disabled = true;

              try {
                // Simulate payment processing
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Complete the payment
                const response = await fetch('/api/payments/complete', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    sessionId: '${sessionId}',
                    amount: ${amount},
                    tokens: ${tokens},
                    walletAddress: '${walletAddress}',
                    status: 'completed'
                  })
                });

                const result = await response.json();
                
                if (result.success) {
                  // Show success message
                  document.querySelector('.container').innerHTML = \`
                    <div style="text-align: center;">
                      <div style="font-size: 64px; margin: 20px 0;">✅</div>
                      <h1 style="color: #16a34a;">Payment Successful!</h1>
                      <p>Your ${tokens.toLocaleString()} CHESS tokens have been delivered to your wallet.</p>
                      <p><strong>Transaction:</strong> \${result.signature || 'DEMO_TX_' + Date.now()}</p>
                      <button class="btn btn-success" onclick="window.location.href='/'">
                        Return to DAO Chess
                      </button>
                    </div>
                  \`;
                } else {
                  throw new Error(result.error || 'Payment failed');
                }
              } catch (error) {
                btn.innerHTML = '❌ Payment Failed';
                btn.style.background = '#dc2626';
                alert('Payment failed: ' + error.message);
                setTimeout(() => {
                  btn.innerHTML = '💳 Complete Payment';
                  btn.style.background = '#16a34a';
                  btn.disabled = false;
                }, 3000);
              }
            }

            function cancelPayment() {
              if (confirm('Are you sure you want to cancel this payment?')) {
                window.location.href = '/';
              }
            }
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Mock checkout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}