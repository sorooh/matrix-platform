/**
 * Phase 11 - Integration Templates
 * 
 * Pre-built integration templates
 */

import { nanoid } from 'nanoid'
import { logger, logInfo } from '../config/logger'

export interface IntegrationTemplate {
  id: string
  name: string
  description: string
  category: string
  provider: string
  config: any
  isActive: boolean
  createdAt: Date
}

class IntegrationTemplates {
  private templates: Map<string, IntegrationTemplate> = new Map()

  async initialize() {
    logInfo('Initializing Integration Templates...')
    await this.initializeDefaultTemplates()
    logInfo('✅ Integration Templates initialized')
  }

  private async initializeDefaultTemplates(): Promise<void> {
    const defaults = [
      {
        name: 'Slack Integration',
        description: 'Integrate with Slack',
        category: 'communication',
        provider: 'slack',
        config: { webhookUrl: '' },
        isActive: true
      },
      {
        name: 'Zapier Integration',
        description: 'Integrate with Zapier',
        category: 'automation',
        provider: 'zapier',
        config: { apiKey: '' },
        isActive: true
      }
    ]

    for (const template of defaults) {
      const id = nanoid()
      const integrationTemplate: IntegrationTemplate = {
        id,
        ...template,
        createdAt: new Date()
      }
      this.templates.set(id, integrationTemplate)
    }
  }

  async createTemplate(
    name: string,
    description: string,
    category: string,
    provider: string,
    config: any
  ): Promise<IntegrationTemplate> {
    const id = nanoid()
    const template: IntegrationTemplate = {
      id,
      name,
      description,
      category,
      provider,
      config,
      isActive: true,
      createdAt: new Date()
    }
    this.templates.set(id, template)
    return template
  }

  async getTemplates(category?: string): Promise<IntegrationTemplate[]> {
    const templates: IntegrationTemplate[] = []
    for (const template of this.templates.values()) {
      if (category && template.category !== category) continue
      if (!template.isActive) continue
      templates.push(template)
    }
    return templates
  }
}

export const integrationTemplates = new IntegrationTemplates()

