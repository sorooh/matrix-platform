/**
 * Phase 10.3 - Customization Features
 * 
 * Dashboard customization, workflow builder, custom fields
 * - Dashboard customization
 * - Workflow builder
 * - Custom fields
 * - Role-based views
 * - Personalization
 * - Template system
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type WidgetType = 'chart' | 'table' | 'metric' | 'list' | 'form' | 'custom'
export type WorkflowTrigger = 'manual' | 'scheduled' | 'event' | 'webhook'
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'file'

export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  config: Record<string, any>
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  dataSource?: string
  refreshInterval?: number // seconds
  createdAt: Date
  updatedAt: Date
}

export interface CustomDashboard {
  id: string
  userId: string
  name: string
  description?: string
  widgets: string[] // Widget IDs
  layout: {
    columns: number
    rows: number
    gap: number
  }
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Workflow {
  id: string
  userId: string
  name: string
  description?: string
  trigger: WorkflowTrigger
  triggerConfig: Record<string, any>
  steps: WorkflowStep[]
  status: 'active' | 'inactive' | 'draft'
  executions: number
  successCount: number
  failureCount: number
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowStep {
  id: string
  order: number
  type: 'action' | 'condition' | 'loop' | 'delay' | 'webhook'
  config: Record<string, any>
  onSuccess?: string // Next step ID
  onFailure?: string // Next step ID
}

export interface CustomField {
  id: string
  userId: string
  name: string
  type: CustomFieldType
  label: string
  description?: string
  required: boolean
  defaultValue?: any
  options?: string[] // For select/multiselect
  validation?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  category: string
  widgets: string[] // Widget IDs
  layout: CustomDashboard['layout']
  isPublic: boolean
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

class CustomizationFeatures {
  private widgets: Map<string, DashboardWidget> = new Map()
  private dashboards: Map<string, CustomDashboard> = new Map()
  private workflows: Map<string, Workflow> = new Map()
  private customFields: Map<string, CustomField> = new Map()
  private templates: Map<string, DashboardTemplate> = new Map()

  async initialize() {
    logInfo('Initializing Customization Features...')

    // Initialize default templates
    await this.initializeDefaultTemplates()

    logInfo('✅ Customization Features initialized')
  }

  // Initialize default templates
  private async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplates: Omit<DashboardTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Default Dashboard',
        description: 'Basic dashboard template',
        category: 'general',
        widgets: [],
        layout: {
          columns: 12,
          rows: 8,
          gap: 16
        },
        isPublic: true,
        usageCount: 0
      },
      {
        name: 'Analytics Dashboard',
        description: 'Dashboard for analytics and metrics',
        category: 'analytics',
        widgets: [],
        layout: {
          columns: 12,
          rows: 8,
          gap: 16
        },
        isPublic: true,
        usageCount: 0
      }
    ]

    for (const template of defaultTemplates) {
      const templateId = nanoid()
      const now = new Date()

      const templateConfig: DashboardTemplate = {
        id: templateId,
        ...template,
        createdAt: now,
        updatedAt: now
      }

      this.templates.set(templateId, templateConfig)
    }

    logInfo('✅ Default templates initialized')
  }

  // Create dashboard
  async createDashboard(
    userId: string,
    name: string,
    description?: string,
    templateId?: string
  ): Promise<CustomDashboard> {
    try {
      const dashboardId = nanoid()
      const now = new Date()

      let layout: CustomDashboard['layout'] = {
        columns: 12,
        rows: 8,
        gap: 16
      }

      let widgets: string[] = []

      // Use template if provided
      if (templateId) {
        const template = this.templates.get(templateId)
        if (template) {
          layout = template.layout
          widgets = [...template.widgets]
        }
      }

      const dashboard: CustomDashboard = {
        id: dashboardId,
        userId,
        name,
        description,
        widgets,
        layout,
        isDefault: false,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.customDashboard.create({
          data: {
            id: dashboardId,
            userId,
            name,
            description: description || null,
            widgets,
            layout,
            isDefault: false,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create dashboard in database' })
      }

      this.dashboards.set(dashboardId, dashboard)

      logInfo(`✅ Created dashboard ${dashboardId} for user ${userId}`)

      return dashboard
    } catch (error) {
      logError(error as Error, { context: 'Create dashboard' })
      throw error
    }
  }

  // Create workflow
  async createWorkflow(
    userId: string,
    name: string,
    description: string,
    trigger: WorkflowTrigger,
    triggerConfig: Record<string, any>,
    steps: WorkflowStep[]
  ): Promise<Workflow> {
    try {
      const workflowId = nanoid()
      const now = new Date()

      const workflow: Workflow = {
        id: workflowId,
        userId,
        name,
        description,
        trigger,
        triggerConfig,
        steps,
        status: 'draft',
        executions: 0,
        successCount: 0,
        failureCount: 0,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.workflow.create({
          data: {
            id: workflowId,
            userId,
            name,
            description,
            trigger,
            triggerConfig,
            steps,
            status: 'draft',
            executions: 0,
            successCount: 0,
            failureCount: 0,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create workflow in database' })
      }

      this.workflows.set(workflowId, workflow)

      logInfo(`✅ Created workflow ${workflowId} for user ${userId}`)

      return workflow
    } catch (error) {
      logError(error as Error, { context: 'Create workflow' })
      throw error
    }
  }

  // Create custom field
  async createCustomField(
    userId: string,
    name: string,
    type: CustomFieldType,
    label: string,
    description?: string,
    required: boolean = false,
    defaultValue?: any,
    options?: string[],
    validation?: Record<string, any>
  ): Promise<CustomField> {
    try {
      const fieldId = nanoid()
      const now = new Date()

      const field: CustomField = {
        id: fieldId,
        userId,
        name,
        type,
        label,
        description,
        required,
        defaultValue,
        options,
        validation,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.customField.create({
          data: {
            id: fieldId,
            userId,
            name,
            type,
            label,
            description: description || null,
            required,
            defaultValue: defaultValue || null,
            options: options || null,
            validation: validation || null,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create custom field in database' })
      }

      this.customFields.set(fieldId, field)

      logInfo(`✅ Created custom field ${fieldId} for user ${userId}`)

      return field
    } catch (error) {
      logError(error as Error, { context: 'Create custom field' })
      throw error
    }
  }

  // Get dashboards
  async getDashboards(userId: string): Promise<CustomDashboard[]> {
    const dashboards: CustomDashboard[] = []
    for (const dashboard of this.dashboards.values()) {
      if (dashboard.userId === userId) {
        dashboards.push(dashboard)
      }
    }
    return dashboards.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get workflows
  async getWorkflows(userId: string, status?: string): Promise<Workflow[]> {
    const workflows: Workflow[] = []
    for (const workflow of this.workflows.values()) {
      if (workflow.userId !== userId) continue
      if (status && workflow.status !== status) continue
      workflows.push(workflow)
    }
    return workflows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get templates
  async getTemplates(category?: string): Promise<DashboardTemplate[]> {
    const templates: DashboardTemplate[] = []
    for (const template of this.templates.values()) {
      if (!template.isPublic) continue
      if (category && template.category !== category) continue
      templates.push(template)
    }
    return templates.sort((a, b) => b.usageCount - a.usageCount)
  }
}

export const customizationFeatures = new CustomizationFeatures()

