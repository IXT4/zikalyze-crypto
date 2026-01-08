import React from 'https://esm.sh/react@18.3.1'

interface NewDeviceEmailProps {
  email: string
  device_info: string
  ip_address: string | null
  login_time: string
}

export const NewDeviceEmail: React.FC<NewDeviceEmailProps> = ({
  email,
  device_info,
  ip_address,
  login_time,
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New Device Login - Zikalyze</title>
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
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
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
              📱
            </div>
            <h1 style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '20px 0 0 0',
            }}>
              New Device Login
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
              We detected a new login to your Zikalyze account from a device we haven't seen before.
            </p>

            {/* Details Box */}
            <div style={{
              backgroundColor: '#1c1c2e',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #2a2a3e',
              marginBottom: '20px',
            }}>
              <h3 style={{
                color: '#fbbf24',
                fontSize: '14px',
                fontWeight: '600',
                margin: '0 0 15px 0',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
              }}>
                Login Details
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}>Account:</td>
                    <td style={{ color: '#e5e5e5', padding: '8px 0', fontSize: '14px', textAlign: 'right' as const }}>{email}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}>Device:</td>
                    <td style={{ color: '#e5e5e5', padding: '8px 0', fontSize: '14px', textAlign: 'right' as const }}>{device_info}</td>
                  </tr>
                  {ip_address && (
                    <tr>
                      <td style={{ color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}>IP Address:</td>
                      <td style={{ color: '#e5e5e5', padding: '8px 0', fontSize: '14px', textAlign: 'right' as const, fontFamily: 'monospace' }}>{ip_address}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}>Time:</td>
                    <td style={{ color: '#22d3ee', padding: '8px 0', fontSize: '14px', textAlign: 'right' as const }}>{login_time}</td>
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
              <strong style={{ color: '#22c55e' }}>Was this you?</strong><br />
              If you just logged in from a new device, you can safely ignore this email.
            </p>

            <p style={{
              color: '#9ca3af',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '0 0 20px 0',
            }}>
              <strong style={{ color: '#f87171' }}>Wasn't you?</strong><br />
              If you didn't log in from this device, your account may be compromised. We recommend:
            </p>

            {/* Action Box */}
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
                🛡️ Secure Your Account
              </h4>
              <ul style={{
                color: '#9ca3af',
                fontSize: '13px',
                lineHeight: '1.8',
                margin: 0,
                paddingLeft: '20px',
              }}>
                <li>Change your password immediately</li>
                <li>Review and revoke unknown sessions in Settings</li>
                <li>Enable Two-Factor Authentication if not already enabled</li>
                <li>Check for any unauthorized activity in your account</li>
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
              You're receiving this because you have login notifications enabled.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}