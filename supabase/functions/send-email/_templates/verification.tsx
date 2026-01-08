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

interface VerificationEmailProps {
  supabase_url: string
  token_hash: string
  redirect_to: string
  email_action_type: string
}

export const VerificationEmail = ({
  supabase_url,
  token_hash,
  redirect_to,
  email_action_type,
}: VerificationEmailProps) => {
  const encodedRedirect = encodeURIComponent(redirect_to)
  const verificationUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodedRedirect}`

  const isEmailChange = email_action_type === 'email_change'
  const title = isEmailChange ? 'Confirm Email Change' : 'Verify Your Email'
  const previewText = isEmailChange ? 'Confirm your new email address' : 'Verify your Zikalyze account'
  const mainText = isEmailChange 
    ? "You've requested to change the email address associated with your Zikalyze account. Click the button below to confirm this change."
    : "Welcome to Zikalyze! You're just one step away from accessing advanced crypto analytics and AI-powered market insights."
  const subText = isEmailChange
    ? 'Once confirmed, your account will be updated with this new email address.'
    : 'Click the button below to verify your email address and activate your account:'
  const buttonText = isEmailChange ? 'Confirm Email Change' : 'Verify Email Address'
  const footerNote = isEmailChange
    ? "If you didn't request this email change, please secure your account immediately."
    : "If you didn't create an account with Zikalyze, you can safely ignore this email."

  return React.createElement(Html, null,
    React.createElement(Head),
    React.createElement(Preview, null, previewText),
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
          React.createElement(Heading, { style: h1 }, title),
          React.createElement(Text, { style: text }, mainText),
          React.createElement(Text, { style: text }, subText),
          React.createElement(Section, { style: buttonContainer },
            React.createElement(Link, { href: verificationUrl, style: button }, buttonText)
          ),
          React.createElement(Text, { style: textSmall },
            'Or copy and paste this link into your browser:'
          ),
          React.createElement(Text, { style: linkText }, verificationUrl)
        ),
        React.createElement(Hr, { style: divider }),
        // Footer
        React.createElement(Section, { style: footerSection },
          React.createElement(Text, { style: footerText }, footerNote),
          React.createElement(Text, { style: footerText },
            'This verification link will expire in 24 hours.'
          ),
          React.createElement(Text, { style: footerBrand },
            `© ${new Date().getFullYear()} Zikalyze. AI-Powered Crypto Analytics.`
          )
        )
      )
    )
  )
}

export default VerificationEmail

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
