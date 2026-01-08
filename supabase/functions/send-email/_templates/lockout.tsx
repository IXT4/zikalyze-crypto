import React from 'https://esm.sh/react@18.3.1'

interface LockoutEmailProps {
  email: string
  ip_address: string | null
  unlock_time: string
  attempts: number
}

export const LockoutEmail: React.FC<LockoutEmailProps> = ({
  email,
  ip_address,
  unlock_time,
  attempts,
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Security Alert - Account Temporarily Locked</title>
      </head>
      <body style={{ 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        backgroundColor: '#0a0a0f',
        margin: 0,
        padding: '40px 20px',
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#12121a',
          borderRadius: '16px',
          border: '1px solid #1e1e2e',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            padding: '30px',
            textAlign: 'center' as const,
          }}>
            <div style={{
              display: 'inline-block',
              width: '60px',
              height: '60px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              lineHeight: '60px',
              fontSize: '28px',
            }}>
              🔒
            </div>
            <h1 style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '20px 0 0 0',
            }}>
              Security Alert
            </h1>
          </div>

          {/* Content */}
          <div style={{ padding: '30px' }}>
            <p style={{
              color: '#e5e5e5',
              fontSize: '16px',
              lineHeight: '1.6',
              margin: '0 0 20px 0',
            }}>
              We detected multiple failed login attempts on your Zikalyze account. For your security, we've temporarily locked access to your account.
            </p>

            {/* Alert Box */}
            <div style={{
              backgroundColor: '#1c1c2e',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #2a2a3e',
              marginBottom: '20px',
            }}>
              <h3 style={{
                color: '#f87171',
                fontSize: '14px',
                fontWeight: '600',
                margin: '0 0 15px 0',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
              }}>
                Lockout Details
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}>Account:</td>
                    <td style={{ color: '#e5e5e5', padding: '8px 0', fontSize: '14px', textAlign: 'right' as const }}>{email}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}>Failed Attempts:</td>
                    <td style={{ color: '#f87171', padding: '8px 0', fontSize: '14px', textAlign: 'right' as const, fontWeight: 'bold' }}>{attempts}</td>
                  </tr>
                  {ip_address && (
                    <tr>
                      <td style={{ color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}>IP Address:</td>
                      <td style={{ color: '#e5e5e5', padding: '8px 0', fontSize: '14px', textAlign: 'right' as const, fontFamily: 'monospace' }}>{ip_address}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}>Unlocks At:</td>
                    <td style={{ color: '#22d3ee', padding: '8px 0', fontSize: '14px', textAlign: 'right' as const }}>{unlock_time}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p style={{
              color: '#9ca3af',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '0 0 20px 0',
            }}>
              <strong style={{ color: '#e5e5e5' }}>Was this you?</strong><br />
              If you were trying to log in, please wait for the lockout period to end and try again with the correct password.
            </p>

            <p style={{
              color: '#9ca3af',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '0 0 20px 0',
            }}>
              <strong style={{ color: '#e5e5e5' }}>Wasn't you?</strong><br />
              Someone may be trying to access your account. We recommend changing your password immediately once the lockout expires.
            </p>

            {/* Tips Box */}
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #1e3a5f',
            }}>
              <h4 style={{
                color: '#22d3ee',
                fontSize: '14px',
                fontWeight: '600',
                margin: '0 0 12px 0',
              }}>
                🛡️ Security Tips
              </h4>
              <ul style={{
                color: '#9ca3af',
                fontSize: '13px',
                lineHeight: '1.8',
                margin: 0,
                paddingLeft: '20px',
              }}>
                <li>Use a strong, unique password</li>
                <li>Never share your login credentials</li>
                <li>Be cautious of phishing emails</li>
                <li>Contact support if you notice suspicious activity</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #1e1e2e',
            padding: '20px 30px',
            textAlign: 'center' as const,
          }}>
            <p style={{
              color: '#6b7280',
              fontSize: '12px',
              margin: 0,
            }}>
              This is an automated security notification from Zikalyze.<br />
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
