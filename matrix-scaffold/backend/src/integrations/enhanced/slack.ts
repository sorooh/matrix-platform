/**
 * Enhanced Slack Integration
 * Global-Ready Architecture with improved Slack integration
 */

import { logger } from '../../config/logger'
import { config } from '../../config/app'
import { postSlack } from '../slack'

export interface SlackMessage {
  text: string
  blocks?: any[]
  attachments?: any[]
  threadTs?: string
}

export async function sendSlackMessage(message: SlackMessage): Promise<boolean> {
  if (!config.features.enableSlack || !config.integrations.slack.webhookUrl) {
    logger.debug('Slack integration disabled or webhook URL not configured')
    return false
  }

  try {
    const webhookUrl = config.integrations.slack.webhookUrl
    const payload = {
      text: message.text,
      blocks: message.blocks,
      attachments: message.attachments,
      thread_ts: message.threadTs
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
    }

    logger.info('Slack message sent successfully', { text: message.text })
    return true
  } catch (error: any) {
    logger.error('Failed to send Slack message:', error)
    return false
  }
}

export async function sendSlackNotification(
  title: string,
  message: string,
  color: 'good' | 'warning' | 'danger' = 'good'
): Promise<boolean> {
  return sendSlackMessage({
    text: title,
    attachments: [
      {
        color,
        text: message,
        footer: 'Matrix Platform',
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  })
}

