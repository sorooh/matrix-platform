/**
 * Environment Sandbox
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { resourceMonitor, ResourceMetrics, ResourceLimits } from './resourceMonitor'
import { spawn, ChildProcess } from 'child_process'
import { mkdir } from 'fs/promises'
import { join } from 'path'

export interface SandboxConfig {
  isolated: boolean
  resourceLimits: ResourceLimits
  timeout: number // milliseconds
  workingDir: string
  networkAccess: boolean
  fileSystemAccess: boolean
}

export interface SandboxTask {
  id: string
  command: string
  args: string[]
  env?: Record<string, string>
  workingDir?: string
  startedAt: Date
  endedAt?: Date
  status: 'running' | 'completed' | 'failed' | 'timeout'
  exitCode?: number
  output?: string
  error?: string
  metrics?: ResourceMetrics[]
}

export class EnvironmentSandbox {
  private config: SandboxConfig
  private tasks: Map<string, SandboxTask> = new Map()
  private sandboxDir: string

  constructor(config?: Partial<SandboxConfig>) {
    this.config = {
      isolated: config?.isolated !== false,
      resourceLimits: config?.resourceLimits || {
        maxMemory: 512 * 1024 * 1024, // 512MB default
        maxCpu: 50, // 50% default
        maxNetwork: 10 * 1024 * 1024, // 10MB/s default
      },
      timeout: config?.timeout || 60000, // 60 seconds default
      workingDir: config?.workingDir || join(process.cwd(), 'data', 'sandbox'),
      networkAccess: config?.networkAccess !== false,
      fileSystemAccess: config?.fileSystemAccess !== false,
    }

    this.sandboxDir = this.config.workingDir
  }

  /**
   * Initialize sandbox
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing environment sandbox...')

      // Ensure sandbox directory exists
      await mkdir(this.sandboxDir, { recursive: true })

      // Start resource monitoring
      resourceMonitor.startMonitoring()
      resourceMonitor.updateLimits(this.config.resourceLimits)

      logger.info('✅ Environment sandbox initialized', {
        isolated: this.config.isolated,
        workingDir: this.sandboxDir,
        resourceLimits: this.config.resourceLimits,
      })

      eventBus.publish('crawler.sandbox.initialized', {
        config: this.config,
      })
    } catch (error: any) {
      logger.error('Sandbox initialization failed:', error)
      throw error
    }
  }

  /**
   * Shutdown sandbox
   */
  async shutdown(): Promise<void> {
    try {
      // Stop all running tasks
      for (const [taskId, task] of this.tasks.entries()) {
        if (task.status === 'running') {
          await this.stopTask(taskId)
        }
      }

      // Stop resource monitoring
      resourceMonitor.stopMonitoring()

      logger.info('Environment sandbox shut down')
    } catch (error: any) {
      logger.error('Sandbox shutdown failed:', error)
    }
  }

  /**
   * Execute task in sandbox
   */
  async executeTask(
    command: string,
    args: string[] = [],
    options?: {
      env?: Record<string, string>
      workingDir?: string
      timeout?: number
    }
  ): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const workingDir = options?.workingDir || join(this.sandboxDir, taskId)
    const timeout = options?.timeout || this.config.timeout

    const task: SandboxTask = {
      id: taskId,
      command,
      args,
      env: options?.env,
      workingDir,
      startedAt: new Date(),
      status: 'running',
      metrics: [],
    }

    this.tasks.set(taskId, task)

    try {
      // Create working directory
      await mkdir(workingDir, { recursive: true })

      // Prepare environment
      const env = {
        ...process.env,
        ...options?.env,
        ...(this.config.isolated ? { HOME: workingDir, TMPDIR: workingDir } : {}),
      }

      // Spawn process
      const childProcess = spawn(command, args, {
        cwd: workingDir,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        ...(this.config.isolated && {
          // Additional isolation options
          detached: false,
        }),
      })

      // Set timeout
      const timeoutId = setTimeout(() => {
        if (childProcess && !childProcess.killed) {
          childProcess.kill('SIGTERM')
          task.status = 'timeout'
          task.endedAt = new Date()
          logger.warn('Task timed out', { taskId, command, timeout })
        }
      }, timeout)

      // Collect output
      let output = ''
      let error = ''

      childProcess.stdout?.on('data', (data) => {
        output += data.toString()
      })

      childProcess.stderr?.on('data', (data) => {
        error += data.toString()
      })

      // Monitor resources
      const metricsInterval = setInterval(() => {
        const metrics = resourceMonitor.getCurrentMetrics()
        task.metrics?.push(metrics)

        // Check resource limits
        if (metrics.memory.used > this.config.resourceLimits.maxMemory) {
          logger.warn('Task exceeded memory limit', {
            taskId,
            memoryUsed: metrics.memory.used,
            limit: this.config.resourceLimits.maxMemory,
          })
        }

        if (metrics.cpu.usage > this.config.resourceLimits.maxCpu) {
          logger.warn('Task exceeded CPU limit', {
            taskId,
            cpuUsage: metrics.cpu.usage,
            limit: this.config.resourceLimits.maxCpu,
          })
        }
      }, 1000) // Every second

      // Wait for process to complete
      const exitCode = await new Promise<number>((resolve, reject) => {
        childProcess.on('close', (code) => {
          clearTimeout(timeoutId)
          clearInterval(metricsInterval)
          resolve(code || 0)
        })

        childProcess.on('error', (err) => {
          clearTimeout(timeoutId)
          clearInterval(metricsInterval)
          reject(err)
        })
      })

      task.status = exitCode === 0 ? 'completed' : 'failed'
      task.endedAt = new Date()
      task.exitCode = exitCode
      task.output = output
      task.error = error

      logger.info('Task completed', {
        taskId,
        command,
        exitCode,
        status: task.status,
        duration: task.endedAt.getTime() - task.startedAt.getTime(),
      })

      eventBus.publish('crawler.sandbox.task.completed', {
        taskId,
        task,
      })

      return taskId
    } catch (error: any) {
      task.status = 'failed'
      task.endedAt = new Date()
      task.error = error.message

      logger.error('Task execution failed:', error)
      throw error
    }
  }

  /**
   * Stop task
   */
  async stopTask(taskId: string): Promise<void> {
    try {
      const task = this.tasks.get(taskId)
      if (!task) {
        throw new Error(`Task ${taskId} not found`)
      }

      if (task.status === 'running') {
        // In production, kill the actual process
        // For now, just mark as stopped
        task.status = 'failed'
        task.endedAt = new Date()
        task.error = 'Task stopped manually'

        logger.info('Task stopped', { taskId })
      }
    } catch (error: any) {
      logger.error('Stop task failed:', error)
      throw error
    }
  }

  /**
   * Get task
   */
  getTask(taskId: string): SandboxTask | null {
    return this.tasks.get(taskId) || null
  }

  /**
   * Get all tasks
   */
  getAllTasks(): SandboxTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * Get running tasks
   */
  getRunningTasks(): SandboxTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'running')
  }

  /**
   * Get task metrics
   */
  getTaskMetrics(taskId: string): ResourceMetrics[] {
    const task = this.tasks.get(taskId)
    return task?.metrics || []
  }

  /**
   * Get sandbox statistics
   */
  getStatistics(): {
    totalTasks: number
    runningTasks: number
    completedTasks: number
    failedTasks: number
    averageDuration: number
    currentResources: ResourceMetrics
  } {
    const tasks = Array.from(this.tasks.values())
    const runningTasks = tasks.filter((t) => t.status === 'running')
    const completedTasks = tasks.filter((t) => t.status === 'completed')
    const failedTasks = tasks.filter((t) => t.status === 'failed')

    const durations = tasks
      .filter((t) => t.endedAt)
      .map((t) => t.endedAt!.getTime() - t.startedAt.getTime())
    const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    return {
      totalTasks: tasks.length,
      runningTasks: runningTasks.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      averageDuration,
      currentResources: resourceMonitor.getCurrentMetrics(),
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SandboxConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }

    if (config.resourceLimits) {
      resourceMonitor.updateLimits(config.resourceLimits)
    }

    logger.info('Sandbox config updated', { config: this.config })
  }

  /**
   * Get configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.config }
  }
}

// Global Environment Sandbox
export const environmentSandbox = new EnvironmentSandbox({
  isolated: true,
  resourceLimits: {
    maxMemory: 512 * 1024 * 1024, // 512MB
    maxCpu: 50, // 50%
    maxNetwork: 10 * 1024 * 1024, // 10MB/s
  },
  timeout: 60000, // 60 seconds
  networkAccess: true,
  fileSystemAccess: true,
})

