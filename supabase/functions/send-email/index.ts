import React from 'https://esm.sh/react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { render } from 'https://esm.sh/@react-email/render@0.0.12'
import { VerificationEmail } from './_templates/verification.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  
  console.log('Received email hook request')

  try {
    const wh = new Webhook(hookSecret)
    const {
      user,
      email_data: { token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    console.log(`Processing ${email_action_type} email for ${user.email}`)

    // Only handle signup/email verification
    if (email_action_type !== 'signup' && email_action_type !== 'email_change') {
      console.log(`Skipping email type: ${email_action_type}`)
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const html = render(
      React.createElement(VerificationEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token_hash,
        redirect_to: redirect_to || `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/`,
        email_action_type,
      })
    )

    const { error } = await resend.emails.send({
      from: 'Zikalyze <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Verify your Zikalyze account',
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log(`Successfully sent verification email to ${user.email}`)

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Error processing email hook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as { code?: number })?.code || 500
    return new Response(
      JSON.stringify({
        error: {
          http_code: errorCode,
          message: errorMessage,
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
