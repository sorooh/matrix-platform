/**
 * Workflow Automation Engine
 * Phase 3 Completion: Advanced Automation
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { db } from '../core/storage'
import { Nicholas } from '../core/nicholas'
import { advancedOrchestration } from '../ai/advancedOrchestration'
import { webhookSystem } from '../integrations/webhooks'

export interface Workflow {
  id: string
  name: string
  description: string
  trigger: {
    type: 'event' | 'schedule' | 'webhook' | 'manual'
    condition: string
  }
  steps: Array<{
    id: string
    type: 'task' | 'agent' | 'integration' | 'condition' | 'delay'
    action: string
    config: Record<string, any>
    onSuccess?: string // Next step ID
    onFailure?: string // Next step ID
  }>
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  currentStep: string
  results: Record<string, any>
  startedAt: Date
  completedAt?: Date
}

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map()
  private executions: Map<string, WorkflowExecution> = new Map()

  /**
   * Create workflow
   */
  async createWorkflow(
    name: string,
    description: string,
    trigger: { type: 'event' | 'schedule' | 'webhook' | 'manual'; condition: string },
    steps: Array<{
      id: string
      type: 'task' | 'agent' | 'integration' | 'condition' | 'delay'
      action: string
      config: Record<string, any>
      onSuccess?: string
      onFailure?: string
    }>
  ): Promise<{ success: boolean; workflow?: Workflow; error?: string }> {
    try {
      const workflow: Workflow = {
        id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        description,
        trigger,
        steps,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      this.workflows.set(workflow.id, workflow)

      // Register trigger
      if (trigger.type === 'event') {
        eventBus.on((event) => {
          if (this.matchesTrigger(event, trigger.condition)) {
            this.executeWorkflow(workflow.id)
          }
        })
      }

      logger.info(`Workflow created: ${workflow.id}`, {
        name,
        steps: steps.length,
        trigger: trigger.type
      })

      return { success: true, workflow }
    } catch (error: any) {
      logger.error('Workflow creation failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId: string): Promise<{
    success: boolean
    execution?: WorkflowExecution
    error?: string
  }> {
    try {
      const workflow = this.workflows.get(workflowId)
      if (!workflow) {
        return { success: false, error: 'Workflow not found' }
      }

      if (!workflow.enabled) {
        return { success: false, error: 'Workflow is disabled' }
      }

      const execution: WorkflowExecution = {
        id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        workflowId,
        status: 'running',
        currentStep: workflow.steps[0]?.id || '',
        results: {},
        startedAt: new Date()
      }

      this.executions.set(execution.id, execution)

      logger.info(`Workflow execution started: ${execution.id}`, {
        workflowId,
        steps: workflow.steps.length
      })

      // Execute steps
      await this.executeSteps(execution, workflow)

      return { success: true, execution }
    } catch (error: any) {
      logger.error(`Workflow execution failed: ${workflowId}`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Execute workflow steps
   */
  private async executeSteps(execution: WorkflowExecution, workflow: Workflow): Promise<void> {
    try {
      let currentStepId = workflow.steps[0]?.id

      while (currentStepId && execution.status === 'running') {
        const step = workflow.steps.find((s) => s.id === currentStepId)
        if (!step) {
          execution.status = 'failed'
          break
        }

        execution.currentStep = step.id

        try {
          const result = await this.executeStep(step, execution.results)

          execution.results[step.id] = result

          // Determine next step
          if (result.success) {
            currentStepId = step.onSuccess || null
          } else {
            currentStepId = step.onFailure || null
            if (!currentStepId) {
              execution.status = 'failed'
              break
            }
          }
        } catch (error: any) {
          logger.error(`Step execution failed: ${step.id}`, error)
          execution.results[step.id] = { error: error.message }
          currentStepId = step.onFailure || null
          if (!currentStepId) {
            execution.status = 'failed'
            break
          }
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed'
        execution.completedAt = new Date()
      }

      this.executions.set(execution.id, execution)

      logger.info(`Workflow execution completed: ${execution.id}`, {
        status: execution.status,
        stepsExecuted: Object.keys(execution.results).length
      })
    } catch (error: any) {
      logger.error(`Workflow steps execution failed: ${execution.id}`, error)
      execution.status = 'failed'
      execution.completedAt = new Date()
      this.executions.set(execution.id, execution)
    }
  }

  /**
   * Execute workflow step
   */
  private async executeStep(step: any, context: Record<string, any>): Promise<{
    success: boolean
    result?: any
    error?: string
  }> {
    try {
      switch (step.type) {
        case 'task':
          return await this.executeTaskStep(step, context)
        case 'agent':
          return await this.executeAgentStep(step, context)
        case 'integration':
          return await this.executeIntegrationStep(step, context)
        case 'condition':
          return await this.executeConditionStep(step, context)
        case 'delay':
          return await this.executeDelayStep(step, context)
        default:
          return { success: false, error: 'Unknown step type' }
      }
    } catch (error: any) {
      logger.error(`Step execution failed: ${step.id}`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Execute task step
   */
  private async executeTaskStep(step: any, context: Record<string, any>): Promise<{
    success: boolean
    result?: any
  }> {
    // Simplified - in production, execute actual task
    return { success: true, result: { message: 'Task executed' } }
  }

  /**
   * Execute agent step
   */
  private async executeAgentStep(step: any, context: Record<string, any>): Promise<{
    success: boolean
    result?: any
  }> {
    try {
      const goal = step.config.goal || step.action
      const agents = step.config.agents || ['morpheus']

      const task = await advancedOrchestration.createTask(goal, agents, 'medium')
      return { success: task.success, result: task.task }
    } catch (error: any) {
      return { success: false, result: { error: error.message } }
    }
  }

  /**
   * Execute integration step
   */
  private async executeIntegrationStep(step: any, context: Record<string, any>): Promise<{
    success: boolean
    result?: any
  }> {
    // Simplified - in production, call actual integration
    return { success: true, result: { message: 'Integration executed' } }
  }

  /**
   * Execute condition step
   */
  private async executeConditionStep(step: any, context: Record<string, any>): Promise<{
    success: boolean
    result?: any
  }> {
    // Simplified - in production, evaluate condition
    const condition = step.config.condition || 'true'
    const result = this.evaluateCondition(condition, context)
    return { success: result, result: { condition, result } }
  }

  /**
   * Execute delay step
   */
  private async executeDelayStep(step: any, context: Record<string, any>): Promise<{
    success: boolean
    result?: any
  }> {
    const delay = step.config.delay || 1000
    await new Promise((resolve) => setTimeout(resolve, delay))
    return { success: true, result: { delay } }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    // Simplified - in production, use proper expression evaluator
    try {
      // Replace context variables
      let evaluated = condition
      for (const [key, value] of Object.entries(context)) {
        evaluated = evaluated.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value))
      }
      return eval(evaluated) as boolean
    } catch {
      return false
    }
  }

  /**
   * Check if event matches trigger
   */
  private matchesTrigger(event: any, condition: string): boolean {
    // Simplified - in production, use proper matching logic
    return event.type === condition || condition === '*'
  }

  /**
   * Get workflow
   */
  getWorkflow(workflowId: string): Workflow | null {
    return this.workflows.get(workflowId) || null
  }

  /**
   * List workflows
   */
  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values())
  }

  /**
   * Get execution
   */
  getExecution(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) || null
  }

  /**
   * List executions
   */
  listExecutions(workflowId?: string, limit: number = 100): WorkflowExecution[] {
    let executions = Array.from(this.executions.values())

    if (workflowId) {
      executions = executions.filter((e) => e.workflowId === workflowId)
    }

    return executions
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit)
  }

  /**
   * Enable/disable workflow
   */
  async toggleWorkflow(workflowId: string, enabled: boolean): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const workflow = this.workflows.get(workflowId)
      if (!workflow) {
        return { success: false, error: 'Workflow not found' }
      }

      workflow.enabled = enabled
      workflow.updatedAt = new Date()
      this.workflows.set(workflowId, workflow)

      logger.info(`Workflow ${enabled ? 'enabled' : 'disabled'}: ${workflowId}`)

      return { success: true }
    } catch (error: any) {
      logger.error('Workflow toggle failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// Global Workflow Engine
export const workflowEngine = new WorkflowEngine()

