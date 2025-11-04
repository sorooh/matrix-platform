/**
 * Jira Integration
 * Phase 2: Integration Hub - Jira integration
 * Global-Ready Architecture
 */

import { logger } from '../../config/logger'
import { config } from '../../config/app'
import { retryManager } from './retry'

export interface JiraIssue {
  key: string
  summary: string
  description?: string
  status: string
  assignee?: string
  priority?: string
  created: string
  updated: string
}

export interface JiraProject {
  key: string
  name: string
  description?: string
}

export class JiraIntegration {
  private baseUrl: string
  private email: string
  private apiToken: string

  constructor() {
    this.baseUrl = config.integrations.jira?.baseUrl || process.env.JIRA_BASE_URL || ''
    this.email = config.integrations.jira?.email || process.env.JIRA_EMAIL || ''
    this.apiToken = config.integrations.jira?.apiToken || process.env.JIRA_API_TOKEN || ''
  }

  private getAuthHeader(): string {
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')
    return `Basic ${auth}`
  }

  async createIssue(
    projectKey: string,
    summary: string,
    description?: string,
    issueType: string = 'Task'
  ): Promise<{ success: boolean; issue?: JiraIssue; error?: string }> {
    try {
      if (!this.baseUrl || !this.email || !this.apiToken) {
        return { success: false, error: 'Jira not configured' }
      }

      const result = await retryManager.executeWithRetry(
        async () => {
          const response = await fetch(`${this.baseUrl}/rest/api/3/issue`, {
            method: 'POST',
            headers: {
              'Authorization': this.getAuthHeader(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                project: { key: projectKey },
                summary,
                description: description
                  ? {
                      type: 'doc',
                      version: 1,
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: description }]
                        }
                      ]
                    }
                  : undefined,
                issuetype: { name: issueType }
              }
            })
          })

          if (!response.ok) {
            const error = await response.text()
            throw new Error(`Jira API error: ${response.statusText} - ${error}`)
          }

          return await response.json()
        },
        {
          maxRetries: 3,
          retryableErrors: ['timeout', 'network', 'connection', '503', '502', '500']
        }
      )

      logger.info(`Jira issue created: ${result.key}`, { projectKey, summary })

      return {
        success: true,
        issue: {
          key: result.key,
          summary,
          description,
          status: 'To Do',
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      }
    } catch (error: any) {
      logger.error('Jira createIssue error:', error)
      return { success: false, error: error.message }
    }
  }

  async getIssue(issueKey: string): Promise<{ success: boolean; issue?: JiraIssue; error?: string }> {
    try {
      if (!this.baseUrl || !this.email || !this.apiToken) {
        return { success: false, error: 'Jira not configured' }
      }

      const result = await retryManager.executeWithRetry(
        async () => {
          const response = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}`, {
            method: 'GET',
            headers: {
              'Authorization': this.getAuthHeader(),
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`)
          }

          return await response.json()
        },
        {
          maxRetries: 3,
          retryableErrors: ['timeout', 'network', 'connection', '503', '502', '500']
        }
      )

      return {
        success: true,
        issue: {
          key: result.key,
          summary: result.fields.summary,
          description: result.fields.description?.content?.[0]?.content?.[0]?.text || '',
          status: result.fields.status?.name || 'Unknown',
          assignee: result.fields.assignee?.displayName,
          priority: result.fields.priority?.name,
          created: result.fields.created,
          updated: result.fields.updated
        }
      }
    } catch (error: any) {
      logger.error('Jira getIssue error:', error)
      return { success: false, error: error.message }
    }
  }

  async getProject(projectKey: string): Promise<{ success: boolean; project?: JiraProject; error?: string }> {
    try {
      if (!this.baseUrl || !this.email || !this.apiToken) {
        return { success: false, error: 'Jira not configured' }
      }

      const result = await retryManager.executeWithRetry(
        async () => {
          const response = await fetch(`${this.baseUrl}/rest/api/3/project/${projectKey}`, {
            method: 'GET',
            headers: {
              'Authorization': this.getAuthHeader(),
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`)
          }

          return await response.json()
        },
        {
          maxRetries: 3,
          retryableErrors: ['timeout', 'network', 'connection', '503', '502', '500']
        }
      )

      return {
        success: true,
        project: {
          key: result.key,
          name: result.name,
          description: result.description
        }
      }
    } catch (error: any) {
      logger.error('Jira getProject error:', error)
      return { success: false, error: error.message }
    }
  }
}

// Global Jira Integration
export const jiraIntegration = new JiraIntegration()

