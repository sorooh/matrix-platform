/**
 * Advanced Dependency Management
 * Phase 7.2: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export interface Dependency {
  name: string
  version: string
  type: 'production' | 'dev' | 'peer' | 'optional'
  latest?: string
  vulnerabilities?: number
  outdated: boolean
  pinned: boolean
  metadata: Record<string, unknown>
}

export interface DependencyAudit {
  id: string
  status: 'running' | 'completed' | 'failed'
  dependencies: Dependency[]
  summary: {
    total: number
    outdated: number
    vulnerable: number
    pinned: number
  }
  recommendations: Array<{
    dependency: string
    action: 'update' | 'pin' | 'remove' | 'replace'
    reason: string
    priority: 'high' | 'medium' | 'low'
  }>
  startedAt: Date
  completedAt?: Date
}

export interface DependencyUpdate {
  id: string
  dependency: string
  fromVersion: string
  toVersion: string
  status: 'pending' | 'updating' | 'completed' | 'failed' | 'rolled-back'
  startedAt: Date
  completedAt?: Date
  error?: string
}

export class AdvancedDependencyManager {
  private dependencies: Map<string, Dependency> = new Map()
  private audits: Map<string, DependencyAudit> = new Map()
  private updates: Map<string, DependencyUpdate> = new Map()
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()
  private cacheTTL = 3600000 // 1 hour

  /**
   * Initialize Advanced Dependency Manager
   */
  async initialize(): Promise<void> {
    try {
      // Load current dependencies
      await this.loadDependencies()

      logger.info('Advanced Dependency Manager initialized')
    } catch (error: any) {
      logger.error('Dependency Manager initialization failed:', error)
      throw error
    }
  }

  /**
   * Load dependencies from package.json
   */
  private async loadDependencies(): Promise<void> {
    try {
      const packageJsonPath = join(process.cwd(), 'package.json')
      if (!existsSync(packageJsonPath)) {
        logger.warn('package.json not found')
        return
      }

      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
        ...packageJson.optionalDependencies,
      }

      for (const [name, version] of Object.entries(allDeps)) {
        const dep: Dependency = {
          name,
          version: version as string,
          type: packageJson.dependencies?.[name] ? 'production' : 'dev',
          outdated: false,
          pinned: !version.toString().includes('^') && !version.toString().includes('~'),
          metadata: {},
        }

        this.dependencies.set(name, dep)
      }

      logger.info('Dependencies loaded', {
        total: this.dependencies.size,
      })
    } catch (error: any) {
      logger.error('Load dependencies failed:', error)
    }
  }

  /**
   * Audit dependencies
   */
  async auditDependencies(options?: {
    checkVulnerabilities?: boolean
    checkUpdates?: boolean
    deep?: boolean
  }): Promise<string> {
    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const startedAt = new Date()

      logger.info('Starting dependency audit', {
        auditId,
        checkVulnerabilities: options?.checkVulnerabilities ?? true,
        checkUpdates: options?.checkUpdates ?? true,
      })

      const audit: DependencyAudit = {
        id: auditId,
        status: 'running',
        dependencies: [],
        summary: {
          total: 0,
          outdated: 0,
          vulnerable: 0,
          pinned: 0,
        },
        recommendations: [],
        startedAt,
      }

      this.audits.set(auditId, audit)

      // Check vulnerabilities
      if (options?.checkVulnerabilities !== false) {
        await this.checkVulnerabilities()
      }

      // Check for updates
      if (options?.checkUpdates !== false) {
        await this.checkUpdates()
      }

      // Generate recommendations
      audit.recommendations = this.generateRecommendations()

      // Calculate summary
      audit.dependencies = Array.from(this.dependencies.values())
      audit.summary = {
        total: audit.dependencies.length,
        outdated: audit.dependencies.filter((d) => d.outdated).length,
        vulnerable: audit.dependencies.filter((d) => (d.vulnerabilities || 0) > 0).length,
        pinned: audit.dependencies.filter((d) => d.pinned).length,
      }

      audit.status = 'completed'
      audit.completedAt = new Date()

      logger.info('Dependency audit completed', {
        auditId,
        total: audit.summary.total,
        outdated: audit.summary.outdated,
        vulnerable: audit.summary.vulnerable,
      })

      eventBus.publish('deployment.dependency.audit.completed', {
        audit,
      })

      return auditId
    } catch (error: any) {
      logger.error('Audit dependencies failed:', error)
      throw error
    }
  }

  /**
   * Check vulnerabilities
   */
  private async checkVulnerabilities(): Promise<void> {
    try {
      // Try npm audit
      try {
        const { stdout } = await execAsync('npm audit --json', {
          timeout: 30000,
          cwd: process.cwd(),
        })

        const auditResult = JSON.parse(stdout)

        if (auditResult.vulnerabilities) {
          for (const [packageName, vulnData] of Object.entries(auditResult.vulnerabilities as Record<string, any>)) {
            const dep = this.dependencies.get(packageName)
            if (dep) {
              dep.vulnerabilities = vulnData.via?.length || 0
            }
          }
        }
      } catch (error: any) {
        logger.warn('npm audit not available:', error.message)
      }
    } catch (error: any) {
      logger.error('Check vulnerabilities failed:', error)
    }
  }

  /**
   * Check for updates
   */
  private async checkUpdates(): Promise<void> {
    try {
      // Try npm outdated
      try {
        const { stdout } = await execAsync('npm outdated --json', {
          timeout: 30000,
          cwd: process.cwd(),
        })

        const outdatedResult = JSON.parse(stdout)

        for (const [packageName, data] of Object.entries(outdatedResult as Record<string, any>)) {
          const dep = this.dependencies.get(packageName)
          if (dep) {
            dep.outdated = true
            dep.latest = data.latest
          }
        }
      } catch (error: any) {
        // npm outdated returns non-zero exit code when there are outdated packages
        if (error.stdout) {
          try {
            const outdatedResult = JSON.parse(error.stdout)
            for (const [packageName, data] of Object.entries(outdatedResult as Record<string, any>)) {
              const dep = this.dependencies.get(packageName)
              if (dep) {
                dep.outdated = true
                dep.latest = data.latest
              }
            }
          } catch (parseError) {
            logger.warn('Could not parse npm outdated output')
          }
        }
      }
    } catch (error: any) {
      logger.error('Check updates failed:', error)
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): Array<{
    dependency: string
    action: 'update' | 'pin' | 'remove' | 'replace'
    reason: string
    priority: 'high' | 'medium' | 'low'
  }> {
    const recommendations: Array<{
      dependency: string
      action: 'update' | 'pin' | 'remove' | 'replace'
      reason: string
      priority: 'high' | 'medium' | 'low'
    }> = []

    for (const dep of this.dependencies.values()) {
      // High priority: Vulnerable dependencies
      if ((dep.vulnerabilities || 0) > 0) {
        recommendations.push({
          dependency: dep.name,
          action: 'update',
          reason: `Has ${dep.vulnerabilities} vulnerability/vulnerabilities`,
          priority: 'high',
        })
      }

      // Medium priority: Outdated dependencies
      if (dep.outdated && dep.latest) {
        recommendations.push({
          dependency: dep.name,
          action: 'update',
          reason: `Outdated: ${dep.version} → ${dep.latest}`,
          priority: 'medium',
        })
      }

      // Low priority: Unpinned dependencies
      if (!dep.pinned && dep.type === 'production') {
        recommendations.push({
          dependency: dep.name,
          action: 'pin',
          reason: 'Version not pinned, may cause instability',
          priority: 'low',
        })
      }
    }

    return recommendations
  }

  /**
   * Update dependency
   */
  async updateDependency(
    name: string,
    targetVersion?: string,
    options?: {
      save?: boolean
      saveExact?: boolean
    }
  ): Promise<string> {
    try {
      const updateId = `update-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const dep = this.dependencies.get(name)

      if (!dep) {
        throw new Error(`Dependency ${name} not found`)
      }

      const fromVersion = dep.version
      const toVersion = targetVersion || dep.latest || 'latest'

      logger.info('Updating dependency', {
        updateId,
        name,
        fromVersion,
        toVersion,
      })

      const update: DependencyUpdate = {
        id: updateId,
        dependency: name,
        fromVersion,
        toVersion,
        status: 'updating',
        startedAt: new Date(),
      }

      this.updates.set(updateId, update)

      try {
        // Update dependency
        const versionSpec = targetVersion || `^${toVersion}` || 'latest'
        const saveFlag = options?.saveExact ? '--save-exact' : options?.save !== false ? '--save' : ''
        const command = `npm install ${name}@${versionSpec} ${saveFlag}`.trim()

        await execAsync(command, {
          timeout: 60000,
          cwd: process.cwd(),
        })

        // Reload dependencies
        await this.loadDependencies()

        update.status = 'completed'
        update.completedAt = new Date()

        // Update dependency info
        const updatedDep = this.dependencies.get(name)
        if (updatedDep) {
          updatedDep.version = toVersion
          updatedDep.outdated = false
        }

        logger.info('Dependency updated', {
          updateId,
          name,
          toVersion,
        })

        eventBus.publish('deployment.dependency.updated', {
          update,
        })
      } catch (error: any) {
        update.status = 'failed'
        update.error = error.message
        update.completedAt = new Date()

        logger.error('Update dependency failed:', {
          updateId,
          name,
          error: error.message,
        })

        throw error
      }

      return updateId
    } catch (error: any) {
      logger.error('Update dependency failed:', error)
      throw error
    }
  }

  /**
   * Pin dependency version
   */
  async pinDependency(name: string, version?: string): Promise<void> {
    try {
      const dep = this.dependencies.get(name)
      if (!dep) {
        throw new Error(`Dependency ${name} not found`)
      }

      const targetVersion = version || dep.version

      // Update package.json to pin version (remove ^ and ~)
      const packageJsonPath = join(process.cwd(), 'package.json')
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

      // Update in dependencies or devDependencies
      if (packageJson.dependencies?.[name]) {
        packageJson.dependencies[name] = targetVersion.replace(/^[\^~]/, '')
      } else if (packageJson.devDependencies?.[name]) {
        packageJson.devDependencies[name] = targetVersion.replace(/^[\^~]/, '')
      }

      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8')

      // Reload dependencies
      await this.loadDependencies()

      logger.info('Dependency pinned', {
        name,
        version: targetVersion,
      })

      eventBus.publish('deployment.dependency.pinned', {
        dependency: name,
        version: targetVersion,
      })
    } catch (error: any) {
      logger.error('Pin dependency failed:', error)
      throw error
    }
  }

  /**
   * Get dependency cache
   */
  private getCache(key: string): unknown | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  /**
   * Set dependency cache
   */
  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Get audit result
   */
  getAuditResult(auditId: string): DependencyAudit | null {
    return this.audits.get(auditId) || null
  }

  /**
   * Get update result
   */
  getUpdateResult(updateId: string): DependencyUpdate | null {
    return this.updates.get(updateId) || null
  }

  /**
   * Get all dependencies
   */
  getAllDependencies(): Dependency[] {
    return Array.from(this.dependencies.values())
  }

  /**
   * Get outdated dependencies
   */
  getOutdatedDependencies(): Dependency[] {
    return Array.from(this.dependencies.values()).filter((d) => d.outdated)
  }

  /**
   * Get vulnerable dependencies
   */
  getVulnerableDependencies(): Dependency[] {
    return Array.from(this.dependencies.values()).filter((d) => (d.vulnerabilities || 0) > 0)
  }
}

// Global Advanced Dependency Manager
export const advancedDependencyManager = new AdvancedDependencyManager()

