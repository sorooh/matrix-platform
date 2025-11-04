/**
 * Auto-Installer & Dependency Manager
 * Phase 7.1: Global Auto-Integration & Self-Contained Platform
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export interface Dependency {
  name: string
  type: 'node' | 'system' | 'npm' | 'binary'
  command: string
  checkCommand: string
  installCommand?: string
  required: boolean
  status: 'installed' | 'missing' | 'error' | 'checking'
  version?: string
  error?: string
}

export interface SystemReadiness {
  status: 'ready' | 'missing' | 'error'
  dependencies: Dependency[]
  missing: string[]
  errors: string[]
  timestamp: Date
}

export class AutoInstaller {
  private dependencies: Map<string, Dependency> = new Map()
  private readiness: SystemReadiness | null = null

  constructor() {
    this.initializeDependencies()
  }

  /**
   * Initialize dependencies list
   */
  private initializeDependencies(): void {
    const deps: Dependency[] = [
      {
        name: 'Node.js',
        type: 'node',
        command: 'node',
        checkCommand: 'node --version',
        required: true,
        status: 'checking',
      },
      {
        name: 'npm',
        type: 'npm',
        command: 'npm',
        checkCommand: 'npm --version',
        required: true,
        status: 'checking',
      },
      {
        name: 'FFmpeg',
        type: 'binary',
        command: 'ffmpeg',
        checkCommand: 'ffmpeg -version',
        installCommand: 'npm install @ffmpeg-installer/ffmpeg',
        required: false,
        status: 'checking',
      },
      {
        name: 'Puppeteer',
        type: 'npm',
        command: 'puppeteer',
        checkCommand: 'npm list puppeteer',
        installCommand: 'npm install puppeteer',
        required: true,
        status: 'checking',
      },
      {
        name: 'Redis',
        type: 'system',
        command: 'redis-server',
        checkCommand: 'redis-cli ping',
        installCommand: 'npm install redis',
        required: false, // Will use internal emulator
        status: 'checking',
      },
    ]

    for (const dep of deps) {
      this.dependencies.set(dep.name, dep)
    }
  }

  /**
   * Check system readiness
   */
  async checkSystemReadiness(): Promise<SystemReadiness> {
    try {
      logger.info('Checking system readiness...')

      const deps: Dependency[] = []
      const missing: string[] = []
      const errors: string[] = []

      // Check all dependencies
      for (const [name, dep] of this.dependencies.entries()) {
        try {
          dep.status = 'checking'
          const installed = await this.checkDependency(dep)

          if (installed) {
            dep.status = 'installed'
            // Get version if possible
            try {
              const { stdout } = await execAsync(dep.checkCommand, { timeout: 5000 })
              dep.version = stdout.trim().split('\n')[0]
            } catch {
              // Version check failed, but dependency exists
            }
          } else {
            dep.status = 'missing'
            if (dep.required) {
              missing.push(name)
            }
          }

          deps.push(dep)
        } catch (error: any) {
          dep.status = 'error'
          dep.error = error.message
          errors.push(`${name}: ${error.message}`)
          deps.push(dep)
        }
      }

      // Check .env file
      const envExists = await this.checkEnvFile()
      if (!envExists) {
        await this.generateEnvFile()
      }

      // Determine overall status
      let status: 'ready' | 'missing' | 'error' = 'ready'
      if (errors.length > 0) {
        status = 'error'
      } else if (missing.length > 0) {
        status = 'missing'
      }

      const readiness: SystemReadiness = {
        status,
        dependencies: deps,
        missing,
        errors,
        timestamp: new Date(),
      }

      this.readiness = readiness

      logger.info('System readiness check completed', {
        status,
        missing: missing.length,
        errors: errors.length,
      })

      eventBus.publish('selfcontained.readiness.checked', {
        readiness,
      })

      return readiness
    } catch (error: any) {
      logger.error('Check system readiness failed:', error)
      throw error
    }
  }

  /**
   * Check if dependency is installed
   */
  private async checkDependency(dep: Dependency): Promise<boolean> {
    try {
      await execAsync(dep.checkCommand, { timeout: 5000 })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Install missing dependencies
   */
  async installMissingDependencies(): Promise<{
    installed: string[]
    failed: string[]
  }> {
    try {
      logger.info('Installing missing dependencies...')

      const installed: string[] = []
      const failed: string[] = []

      if (!this.readiness) {
        await this.checkSystemReadiness()
      }

      for (const dep of this.readiness!.dependencies) {
        if (dep.status === 'missing' && dep.installCommand) {
          try {
            logger.info(`Installing ${dep.name}...`)

            if (dep.type === 'npm') {
              await execAsync(dep.installCommand, {
                cwd: process.cwd(),
                timeout: 300000, // 5 minutes
              })
            }

            // Re-check after installation
            const installedNow = await this.checkDependency(dep)
            if (installedNow) {
              dep.status = 'installed'
              installed.push(dep.name)
              logger.info(`✅ ${dep.name} installed successfully`)
            } else {
              failed.push(dep.name)
              logger.warn(`⚠️ ${dep.name} installation failed`)
            }
          } catch (error: any) {
            dep.status = 'error'
            dep.error = error.message
            failed.push(dep.name)
            logger.error(`❌ ${dep.name} installation failed:`, error)
          }
        }
      }

      // Re-check system readiness
      await this.checkSystemReadiness()

      logger.info('Dependency installation completed', {
        installed: installed.length,
        failed: failed.length,
      })

      eventBus.publish('selfcontained.dependencies.installed', {
        installed,
        failed,
      })

      return { installed, failed }
    } catch (error: any) {
      logger.error('Install missing dependencies failed:', error)
      throw error
    }
  }

  /**
   * Check if .env file exists
   */
  private async checkEnvFile(): Promise<boolean> {
    try {
      const envPath = join(process.cwd(), '.env')
      await access(envPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Generate .env file
   */
  private async generateEnvFile(): Promise<void> {
    try {
      const envPath = join(process.cwd(), '.env')
      const envExamplePath = join(process.cwd(), '.env.example')

      let envContent = ''

      // Try to read .env.example first
      try {
        envContent = await readFile(envExamplePath, 'utf-8')
      } catch {
        // .env.example doesn't exist, generate default
        envContent = this.generateDefaultEnv()
      }

      // Write .env file
      await writeFile(envPath, envContent, 'utf-8')

      logger.info('✅ .env file generated')
    } catch (error: any) {
      logger.error('Generate .env file failed:', error)
      throw error
    }
  }

  /**
   * Generate default .env content
   */
  private generateDefaultEnv(): string {
    return `# Matrix Platform - Environment Variables
# Auto-generated by Auto-Installer

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/matrix

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=production
REGION=us

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info

# Monitoring
SENTRY_DSN=

# AI Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Security
JWT_SECRET=change-this-secret
ENCRYPTION_KEY=change-this-encryption-key
`
  }

  /**
   * Get system readiness
   */
  getSystemReadiness(): SystemReadiness | null {
    return this.readiness
  }

  /**
   * Get readiness status icon
   */
  getReadinessIcon(): string {
    if (!this.readiness) {
      return '⏳'
    }

    switch (this.readiness.status) {
      case 'ready':
        return '✅'
      case 'missing':
        return '⚠️'
      case 'error':
        return '❌'
      default:
        return '⏳'
    }
  }
}

// Global Auto-Installer
export const autoInstaller = new AutoInstaller()

