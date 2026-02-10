// Slack webhook helper for notifications

export async function sendSlackNotification({ title, message, clientName, requestType, link }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  
  if (!webhookUrl) {
    console.log('SLACK_WEBHOOK_URL not configured, skipping notification')
    return { success: false, reason: 'no_webhook_url' }
  }
  
  try {
    const payload = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🔔 ${title}`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Client:*\n${clientName}`
            },
            {
              type: 'mrkdwn',
              text: `*Type:*\n${requestType || 'General'}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n${message}`
          }
        }
      ]
    }
    
    // Add link button if provided
    if (link) {
      payload.blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View in Symphony',
              emoji: true
            },
            url: link,
            style: 'primary'
          }
        ]
      })
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Slack notification error:', error)
    return { success: false, error: error.message }
  }
}

// Helper to format request type for display
export function formatRequestType(type) {
  const types = {
    brand: '🎨 Brand',
    site: '🌐 Site',
    deck: '📊 Deck',
    product: '📱 Product',
    marketing: '📣 Marketing',
    misc: '📁 Misc'
  }
  return types[type] || type
}
