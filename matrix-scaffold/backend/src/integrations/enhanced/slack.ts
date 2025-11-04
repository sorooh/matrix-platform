/**
 * Enhanced Slack Integration
 * Phase 2: Integration Hub - Enhanced Slack integration
 * Global-Ready Architecture
 */

import { logger } from '../../config/logger'
import { config } from '../../config/app'

export interface SlackMessage {
  text: string
  blocks?: any[]
  attachments?: any[]
  channel?: string
  thread_ts?: string
}

export async function sendSlackMessage(
  message: SlackMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const webhookUrl = config.integrations.slack.webhookUrl

    if (!webhookUrl) {
      logger.warn('Slack webhook URL not configured')
      return { success: false, error: 'Slack not configured' }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`)
    }

    logger.info('Slack message sent', { text: message.text })
    return { success: true }
  } catch (error: any) {
    logger.error('Slack sendMessage error:', error)
    return { success: false, error: error.message }
  }
}

export async function sendSlackNotification(
  title: string,
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): Promise<{ success: boolean; error?: string }> {
  const color = level === 'error' ? 'danger' : level === 'warning' ? 'warning' : 'good'

  const slackMessage: SlackMessage = {
    text: title,
    attachments: [
      {
        color,
        text: message,
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  }

  return await sendSlackMessage(slackMessage)
}
