import { Resend } from 'resend'
import { logger } from '@/lib/utils/logger'

/**
 * Email notification service
 * Handles sending emails for user account creation and password resets
 */

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Get the "from" email address from environment or use Resend's test domain
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

interface SendWelcomeEmailParams {
  to: string
  name: string
  password: string
}

interface EmailResponse {
  success: boolean
  error?: string
  messageId?: string
}

/**
 * Sends a welcome email with login credentials to a new employee
 * @param params Email parameters
 * @returns Promise with success status
 */
export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<EmailResponse> {
  const { to, name, password } = params
  
  try {
    const loginUrl = process.env.RESEND_USER_LOGIN_URL || 'http://localhost:3000/auth/signin'
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Welcome to Choice Marketing Partners',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Choice Marketing Partners!</h2>
          <p>Hi ${name},</p>
          <p>Your account has been created successfully. Here are your login credentials:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${to}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background-color: #fff; padding: 2px 6px; border-radius: 3px;">${password}</code></p>
          </div>
          <p>Please log in and change your password at your earliest convenience.</p>
          <p style="margin-top: 20px;">
            <a href="${loginUrl}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Log In Now
            </a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Best regards,<br>
            Choice Marketing Partners Team
          </p>
        </div>
      `,
    })

    if (error) {
      logger.error('❌ Resend error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email'
      }
    }

    logger.log('✅ Welcome email sent successfully:', { id: data?.id, to })
    return { 
      success: true,
      messageId: data?.id 
    }
  } catch (error) {
    logger.error('❌ Failed to send welcome email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

interface SendApplicationNotificationParams {
  jobTitle: string
  jobSlug: string
  applicantName: string
  applicantEmail: string
  applicantPhone?: string | null
  coverLetter?: string | null
  resumeUrl?: string | null
  resumeFilename?: string | null
}

/**
 * Notifies HR when a candidate submits a job application via the internal form.
 * Recipient address is read from CAREERS_NOTIFY_EMAIL with a sensible fallback.
 */
export async function sendApplicationNotification(
  params: SendApplicationNotificationParams,
): Promise<EmailResponse> {
  const recipient =
    process.env.CAREERS_NOTIFY_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'careers@choicemarketingpartners.com'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const jobLink = `${appUrl}/careers/${params.jobSlug}`

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient,
      replyTo: params.applicantEmail,
      subject: `New application: ${params.jobTitle} — ${params.applicantName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New application received</h2>
          <p><strong>Role:</strong> <a href="${jobLink}">${escapeHtml(params.jobTitle)}</a></p>
          <p><strong>Applicant:</strong> ${escapeHtml(params.applicantName)}</p>
          <p><strong>Email:</strong> <a href="mailto:${params.applicantEmail}">${escapeHtml(params.applicantEmail)}</a></p>
          ${params.applicantPhone ? `<p><strong>Phone:</strong> ${escapeHtml(params.applicantPhone)}</p>` : ''}
          ${
            params.resumeUrl
              ? `<p><strong>Resume:</strong> <a href="${params.resumeUrl}">${escapeHtml(params.resumeFilename ?? 'Download')}</a></p>`
              : '<p><em>No resume attached.</em></p>'
          }
          ${
            params.coverLetter
              ? `<div style="margin-top: 20px;"><p><strong>Cover letter / message:</strong></p><div style="background:#f5f5f5;padding:15px;border-radius:5px;white-space:pre-wrap;">${escapeHtml(params.coverLetter)}</div></div>`
              : ''
          }
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Reply to this email to respond directly to the applicant.
          </p>
        </div>
      `,
    })

    if (error) {
      logger.error('❌ Resend error (application notification):', error)
      return { success: false, error: error.message || 'Failed to send notification' }
    }

    logger.log('✅ Application notification sent:', { id: data?.id, to: recipient })
    return { success: true, messageId: data?.id }
  } catch (error) {
    logger.error('❌ Failed to send application notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Sends a password reset email
 * @param to Recipient email
 * @param name Recipient name
 * @param resetToken Password reset token
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<EmailResponse> {
  try {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="color: #666; font-size: 12px;">
            If you didn't request this password reset, please ignore this email or contact support if you have concerns.
          </p>
          <p style="color: #666; font-size: 12px;">
            This link will expire in 24 hours.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Best regards,<br>
            Choice Marketing Partners Team
          </p>
        </div>
      `,
    })

    if (error) {
      logger.error('❌ Resend error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email'
      }
    }

    logger.log('✅ Password reset email sent successfully:', { id: data?.id, to })
    return { 
      success: true,
      messageId: data?.id
    }
  } catch (error) {
    logger.error('❌ Failed to send password reset email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
