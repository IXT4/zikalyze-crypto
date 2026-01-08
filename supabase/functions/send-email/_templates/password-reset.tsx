import React from 'https://esm.sh/react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'https://esm.sh/@react-email/components@0.0.12'

interface PasswordResetEmailProps {
  supabase_url: string
  token_hash: string
  redirect_to: string
  email_action_type: string
}

export const PasswordResetEmail = ({
  supabase_url,
  token_hash,
  redirect_to,
  email_action_type,
}: PasswordResetEmailProps) => {
  const encodedRedirect = encodeURIComponent(redirect_to)
  const resetUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodedRedirect}`

  return React.createElement(Html, null,
    React.createElement(Head),
    React.createElement(Preview, null, 'Reset your Zikalyze password'),
    React.createElement(Body, { style: main },
      React.createElement(Container, { style: container },
        // Header with Logo
        React.createElement(Section, { style: headerSection },
          React.createElement(Text, { style: logoText },
            React.createElement('span', { style: logoIcon }, '📊'),
            ' Zikalyze'
          )
        ),
        React.createElement(Hr, { style: divider }),
        // Main Content
        React.createElement(Section, { style: contentSection },
          React.createElement(Heading, { style: h1 }, 'Reset Your Password'),
          React.createElement(Text, { style: text },
            "We received a request to reset the password for your Zikalyze account. If you didn't make this request, you can safely ignore this email."
          ),
          React.createElement(Text, { style: text },
            'Click the button below to set a new password:'
          ),
          React.createElement(Section, { style: buttonContainer },
            React.createElement(Link, { href: resetUrl, style: button },
              'Reset Password'
            )
          ),
          React.createElement(Text, { style: textSmall },
            'Or copy and paste this link into your browser:'
          ),
          React.createElement(Text, { style: linkText }, resetUrl)
        ),
        React.createElement(Hr, { style: divider }),
        // Security Notice
        React.createElement(Section, { style: securitySection },
          React.createElement(Text, { style: securityText },
            '🔒 Security Tip: Never share this link with anyone. Zikalyze will never ask for your password via email.'
          )
        ),
        React.createElement(Hr, { style: divider }),
        // Footer
        React.createElement(Section, { style: footerSection },
          React.createElement(Text, { style: footerText },
            'This password reset link will expire in 1 hour.'
          ),
          React.createElement(Text, { style: footerBrand },
            `© ${new Date().getFullYear()} Zikalyze. AI-Powered Crypto Analytics.`
          )
        )
      )
    )
  )
}

export default PasswordResetEmail

// Styles
const main = {
  backgroundColor: '#0a0a0f',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#13131a',
  margin: '0 auto',
  padding: '0',
  maxWidth: '580px',
  borderRadius: '12px',
  border: '1px solid #1f1f2e',
}

const headerSection = {
  padding: '32px 40px 24px',
  textAlign: 'center' as const,
}

const logoText = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: '0',
  letterSpacing: '-0.5px',
}

const logoIcon = {
  marginRight: '8px',
}

const divider = {
  borderColor: '#1f1f2e',
  margin: '0',
}

const contentSection = {
  padding: '32px 40px',
}

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

const text = {
  color: '#a1a1aa',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const textSmall = {
  color: '#71717a',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '24px 0 8px',
  textAlign: 'center' as const,
}

const linkText = {
  color: '#a78bfa',
  fontSize: '12px',
  lineHeight: '20px',
  wordBreak: 'break-all' as const,
  textAlign: 'center' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#a78bfa',
  borderRadius: '8px',
  color: '#0a0a0f',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  padding: '14px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
}

const securitySection = {
  padding: '16px 40px',
  backgroundColor: '#1a1a24',
}

const securityText = {
  color: '#71717a',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
}

const footerSection = {
  padding: '24px 40px 32px',
}

const footerText = {
  color: '#52525b',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const footerBrand = {
  color: '#3f3f46',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '16px 0 0',
  textAlign: 'center' as const,
}
