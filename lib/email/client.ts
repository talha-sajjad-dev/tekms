/**
 * Email Client using Resend
 * Handles all email notifications for the platform
 */

interface EmailOptions {
  to: string
  subject: string
  html: string
}

/**
 * Send an email using Resend API
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.FROM_EMAIL || 'noreply@tekms.com'

  // If no API key is configured, log and skip
  if (!apiKey || apiKey.includes('placeholder')) {
    console.log('[Email] Skipping email (no API key configured):', { to, subject })
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Email] Failed to send:', error)
      return false
    }

    const data = await response.json()
    console.log('[Email] Sent successfully:', data.id)
    return true
  } catch (error) {
    console.error('[Email] Error sending email:', error)
    return false
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(email: string, name: string | null) {
  const displayName = name || 'there'
  
  return sendEmail({
    to: email,
    subject: 'Welcome to TEKMS - Multi-Channel E-commerce Automation',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to TEKMS!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #667eea;">Hi ${displayName},</h2>
            
            <p>Thank you for joining TEKMS - your multi-channel e-commerce automation platform!</p>
            
            <p>You're now on the <strong>FREE plan</strong> with 10 products per month. Here's what you can do:</p>
            
            <ul style="background: white; padding: 20px; border-radius: 5px;">
              <li>✅ Export products to TikTok Shop</li>
              <li>✅ Import products from Etsy</li>
              <li>✅ Manage BigCommerce catalog</li>
              <li>✅ Track usage across platforms</li>
            </ul>
            
            <h3 style="color: #667eea;">Next Steps:</h3>
            <ol>
              <li>Add your API credentials for BigCommerce, TikTok, or Etsy</li>
              <li>Start automating your product management</li>
              <li>Upgrade to a paid plan for more products</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://tekms.com/dashboard/credentials" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Add Credentials
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Need help? Reply to this email or visit our documentation.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>TEKMS - Multi-Channel E-commerce Automation</p>
            <p>© ${new Date().getFullYear()} TEKMS. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  })
}

/**
 * Send usage limit warning email
 */
export async function sendUsageLimitWarning(
  email: string,
  name: string | null,
  currentUsage: number,
  limit: number,
  tier: string
) {
  const displayName = name || 'there'
  const percentage = Math.round((currentUsage / limit) * 100)
  
  return sendEmail({
    to: email,
    subject: `⚠️ You've used ${percentage}% of your monthly product limit`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #fbbf24; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">⚠️ Usage Alert</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2>Hi ${displayName},</h2>
            
            <p>You've used <strong>${currentUsage} out of ${limit} products</strong> (${percentage}%) on your <strong>${tier}</strong> plan this month.</p>
            
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <div style="background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
                <div style="background: ${percentage >= 90 ? '#ef4444' : '#fbbf24'}; height: 100%; width: ${percentage}%;"></div>
              </div>
              <p style="text-align: center; margin-top: 10px; font-weight: bold;">${currentUsage} / ${limit} products</p>
            </div>
            
            ${percentage >= 90 ? `
              <p style="color: #ef4444; font-weight: bold;">
                ⚠️ You're running low on products! Consider upgrading to continue using TEKMS without interruption.
              </p>
            ` : ''}
            
            <h3>Upgrade Options:</h3>
            <ul>
              <li><strong>Starter</strong> - 500 products/month - $29</li>
              <li><strong>Professional</strong> - 5,000 products/month - $79</li>
              <li><strong>Enterprise</strong> - Unlimited products - $199</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://tekms.com/dashboard/billing" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Upgrade Now
              </a>
            </div>
          </div>
        </body>
      </html>
    `
  })
}

/**
 * Send usage limit exceeded email
 */
export async function sendUsageLimitExceeded(
  email: string,
  name: string | null,
  limit: number,
  tier: string
) {
  const displayName = name || 'there'
  
  return sendEmail({
    to: email,
    subject: '🚫 Monthly product limit reached',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ef4444; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🚫 Limit Reached</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2>Hi ${displayName},</h2>
            
            <p>You've reached your monthly limit of <strong>${limit} products</strong> on the <strong>${tier}</strong> plan.</p>
            
            <p>To continue using TEKMS, please upgrade to a higher plan:</p>
            
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Upgrade Options:</h3>
              <ul>
                <li><strong>Starter</strong> - 500 products/month - $29/mo</li>
                <li><strong>Professional</strong> - 5,000 products/month - $79/mo</li>
                <li><strong>Enterprise</strong> - Unlimited products - $199/mo</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://tekms.com/dashboard/billing" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Upgrade Now
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Your limit will reset on the 1st of next month.
            </p>
          </div>
        </body>
      </html>
    `
  })
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(
  email: string,
  name: string | null,
  tier: string
) {
  const displayName = name || 'there'
  
  return sendEmail({
    to: email,
    subject: '⚠️ Payment Failed - Action Required',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ef4444; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">⚠️ Payment Failed</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2>Hi ${displayName},</h2>
            
            <p>We were unable to process your payment for the <strong>${tier}</strong> plan.</p>
            
            <p><strong>What happens next:</strong></p>
            <ul>
              <li>Your subscription will remain active for a few days</li>
              <li>Please update your payment method to avoid service interruption</li>
              <li>If payment fails repeatedly, your account will be downgraded to FREE</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://tekms.com/dashboard/billing" 
                 style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Update Payment Method
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Need help? Contact our support team.
            </p>
          </div>
        </body>
      </html>
    `
  })
}

/**
 * Send subscription canceled email
 */
export async function sendSubscriptionCanceledEmail(
  email: string,
  name: string | null,
  tier: string,
  endDate: Date
) {
  const displayName = name || 'there'
  
  return sendEmail({
    to: email,
    subject: 'Subscription Canceled - We\'re Sorry to See You Go',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #6b7280; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Subscription Canceled</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2>Hi ${displayName},</h2>
            
            <p>Your <strong>${tier}</strong> subscription has been canceled.</p>
            
            <p><strong>What this means:</strong></p>
            <ul>
              <li>You'll have access until <strong>${endDate.toLocaleDateString()}</strong></li>
              <li>After that, you'll be moved to the FREE plan (10 products/month)</li>
              <li>Your data and credentials will be preserved</li>
              <li>You can reactivate anytime</li>
            </ul>
            
            <p>We'd love to hear your feedback! What could we improve?</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://tekms.com/dashboard/billing" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reactivate Subscription
              </a>
            </div>
          </div>
        </body>
      </html>
    `
  })
}