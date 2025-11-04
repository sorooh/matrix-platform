/**
 * Autonomous Deployment Engine
 * Phase 7: Autonomous Deployment & Global Orchestration
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production'
  region: 'us' | 'eu' | 'asia'
  provider: 'github-actions' | 'vercel' | 'firebase' | 'cloudflare' | 'vps'
  buildCommand?: string
  deployCommand?: string
  rollbackCommand?: string
  healthCheckUrl?: string
  timeout?: number
  maxRetries?: number
}

export interface DeploymentStatus {
  id: string
  config: DeploymentConfig
  status: 'pending' | 'building' | 'deploying' | 'completed' | 'failed' | 'rolled-back'
  startedAt: Date
  completedAt?: Date
  duration?: number
  logs: string[]
  error?: string
  version?: string
  url?: string
  healthCheckStatus?: 'healthy' | 'unhealthy' | 'unknown'
}

export interface DeploymentResult {
  success: boolean
  deploymentId: string
  status: DeploymentStatus
  url?: string
  version?: string
  error?: string
}

export class AutonomousDeploymentEngine {
  private deployments: Map<string, DeploymentStatus> = new Map()
  private deploymentDir: string

  constructor(deploymentDir?: string) {
    this.deploymentDir = deploymentDir || join(process.cwd(), 'data', 'deployments')
  }

  /**
   * Initialize deployment engine
   */
  async initialize(): Promise<void> {
    try {
      await mkdir(this.deploymentDir, { recursive: true })
      logger.info('Autonomous Deployment Engine initialized')
    } catch (error: any) {
      logger.error('Deployment engine initialization failed:', error)
      throw error
    }
  }

  /**
   * Generate Infrastructure-as-Code files
   */
  async generateIaCFiles(config: DeploymentConfig): Promise<{
    dockerfile?: string
    dockerCompose?: string
    githubActions?: string
    vercelConfig?: string
    cloudflareConfig?: string
  }> {
    try {
      const files: {
        dockerfile?: string
        dockerCompose?: string
        githubActions?: string
        vercelConfig?: string
        cloudflareConfig?: string
      } = {}

      // Generate Dockerfile
      files.dockerfile = this.generateDockerfile()
      await writeFile(join(this.deploymentDir, 'Dockerfile'), files.dockerfile)

      // Generate docker-compose.yml
      files.dockerCompose = this.generateDockerCompose(config)
      await writeFile(join(this.deploymentDir, 'docker-compose.yml'), files.dockerCompose)

      // Generate GitHub Actions workflow
      if (config.provider === 'github-actions') {
        files.githubActions = this.generateGitHubActions(config)
        await mkdir(join(this.deploymentDir, '.github', 'workflows'), { recursive: true })
        await writeFile(
          join(this.deploymentDir, '.github', 'workflows', 'deploy.yml'),
          files.githubActions
        )
      }

      // Generate Vercel config
      if (config.provider === 'vercel') {
        files.vercelConfig = this.generateVercelConfig(config)
        await writeFile(join(this.deploymentDir, 'vercel.json'), files.vercelConfig)
      }

      // Generate Cloudflare Workers config
      if (config.provider === 'cloudflare') {
        files.cloudflareConfig = this.generateCloudflareConfig(config)
        await writeFile(join(this.deploymentDir, 'wrangler.toml'), files.cloudflareConfig)
      }

      logger.info('IaC files generated', {
        provider: config.provider,
        files: Object.keys(files),
      })

      return files
    } catch (error: any) {
      logger.error('Generate IaC files failed:', error)
      throw error
    }
  }

  /**
   * Deploy to target environment
   */
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    const deploymentId = `deployment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const startedAt = new Date()

    const deployment: DeploymentStatus = {
      id: deploymentId,
      config,
      status: 'pending',
      startedAt,
      logs: [],
    }

    this.deployments.set(deploymentId, deployment)

    try {
      logger.info('Deployment started', {
        deploymentId,
        environment: config.environment,
        region: config.region,
        provider: config.provider,
      })

      // Generate IaC files
      await this.log(deploymentId, 'Generating Infrastructure-as-Code files...')
      await this.generateIaCFiles(config)
      await this.log(deploymentId, '✅ IaC files generated')

      // Build
      deployment.status = 'building'
      await this.log(deploymentId, 'Starting build process...')
      await this.build(deploymentId, config)
      await this.log(deploymentId, '✅ Build completed')

      // Deploy
      deployment.status = 'deploying'
      await this.log(deploymentId, 'Starting deployment...')
      const deployResult = await this.executeDeployment(deploymentId, config)
      await this.log(deploymentId, '✅ Deployment completed')

      // Health check
      if (config.healthCheckUrl) {
        await this.log(deploymentId, 'Running health check...')
        const healthStatus = await this.healthCheck(config.healthCheckUrl)
        deployment.healthCheckStatus = healthStatus
        await this.log(
          deploymentId,
          `Health check: ${healthStatus === 'healthy' ? '✅ Healthy' : '⚠️ Unhealthy'}`
        )
      }

      // Complete
      const completedAt = new Date()
      deployment.status = 'completed'
      deployment.completedAt = completedAt
      deployment.duration = completedAt.getTime() - startedAt.getTime()
      deployment.url = deployResult.url
      deployment.version = deployResult.version

      logger.info('Deployment completed', {
        deploymentId,
        duration: deployment.duration,
        url: deployment.url,
      })

      eventBus.publish('deployment.completed', {
        deploymentId,
        deployment,
      })

      return {
        success: true,
        deploymentId,
        status: deployment,
        url: deployment.url,
        version: deployment.version,
      }
    } catch (error: any) {
      logger.error('Deployment failed:', error)

      // Rollback on failure
      try {
        await this.log(deploymentId, '❌ Deployment failed, initiating rollback...')
        await this.rollback(deploymentId, config)
        deployment.status = 'rolled-back'
        await this.log(deploymentId, '✅ Rollback completed')
      } catch (rollbackError: any) {
        logger.error('Rollback failed:', rollbackError)
        deployment.status = 'failed'
        deployment.error = `Deployment failed: ${error.message}. Rollback also failed: ${rollbackError.message}`
      }

      const completedAt = new Date()
      deployment.completedAt = completedAt
      deployment.duration = completedAt.getTime() - startedAt.getTime()
      deployment.error = error.message

      eventBus.publish('deployment.failed', {
        deploymentId,
        deployment,
      })

      return {
        success: false,
        deploymentId,
        status: deployment,
        error: error.message,
      }
    }
  }

  /**
   * Build application
   */
  private async build(deploymentId: string, config: DeploymentConfig): Promise<void> {
    try {
      const buildCommand = config.buildCommand || 'npm run build'

      await this.log(deploymentId, `Executing build command: ${buildCommand}`)

      const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: process.cwd(),
        timeout: config.timeout || 300000, // 5 minutes default
      })

      if (stdout) {
        await this.log(deploymentId, stdout)
      }

      if (stderr) {
        await this.log(deploymentId, `WARN: ${stderr}`)
      }
    } catch (error: any) {
      logger.error('Build failed:', error)
      throw error
    }
  }

  /**
   * Execute deployment
   */
  private async executeDeployment(
    deploymentId: string,
    config: DeploymentConfig
  ): Promise<{ url?: string; version?: string }> {
    try {
      const deployCommand = config.deployCommand || this.getDefaultDeployCommand(config.provider)

      await this.log(deploymentId, `Executing deployment command: ${deployCommand}`)

      const { stdout, stderr } = await execAsync(deployCommand, {
        cwd: process.cwd(),
        timeout: config.timeout || 600000, // 10 minutes default
      })

      if (stdout) {
        await this.log(deploymentId, stdout)
      }

      if (stderr) {
        await this.log(deploymentId, `WARN: ${stderr}`)
      }

      // Extract URL and version from output
      const url = this.extractUrl(stdout)
      const version = this.extractVersion(stdout) || `v${Date.now()}`

      return { url, version }
    } catch (error: any) {
      logger.error('Deployment execution failed:', error)
      throw error
    }
  }

  /**
   * Rollback deployment
   */
  private async rollback(deploymentId: string, config: DeploymentConfig): Promise<void> {
    try {
      const rollbackCommand = config.rollbackCommand || this.getDefaultRollbackCommand(config.provider)

      await this.log(deploymentId, `Executing rollback command: ${rollbackCommand}`)

      const { stdout, stderr } = await execAsync(rollbackCommand, {
        cwd: process.cwd(),
        timeout: config.timeout || 300000,
      })

      if (stdout) {
        await this.log(deploymentId, stdout)
      }

      if (stderr) {
        await this.log(deploymentId, `WARN: ${stderr}`)
      }
    } catch (error: any) {
      logger.error('Rollback failed:', error)
      throw error
    }
  }

  /**
   * Health check
   */
  private async healthCheck(url: string): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Matrix-Health-Check' },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (response.ok) {
        return 'healthy'
      } else {
        return 'unhealthy'
      }
    } catch (error) {
      logger.warn('Health check failed:', error)
      return 'unknown'
    }
  }

  /**
   * Get default deploy command
   */
  private getDefaultDeployCommand(provider: DeploymentConfig['provider']): string {
    switch (provider) {
      case 'vercel':
        return 'vercel --prod'
      case 'firebase':
        return 'firebase deploy'
      case 'cloudflare':
        return 'wrangler publish'
      case 'github-actions':
        return 'git push origin main'
      case 'vps':
        return 'docker-compose up -d'
      default:
        return 'npm run deploy'
    }
  }

  /**
   * Get default rollback command
   */
  private getDefaultRollbackCommand(provider: DeploymentConfig['provider']): string {
    switch (provider) {
      case 'vercel':
        return 'vercel rollback'
      case 'firebase':
        return 'firebase hosting:rollback'
      case 'cloudflare':
        return 'wrangler rollback'
      case 'github-actions':
        return 'git revert HEAD'
      case 'vps':
        return 'docker-compose down && docker-compose up -d'
      default:
        return 'npm run rollback'
    }
  }

  /**
   * Extract URL from output
   */
  private extractUrl(output: string): string | undefined {
    const urlRegex = /https?:\/\/[^\s]+/g
    const matches = output.match(urlRegex)
    return matches?.[0]
  }

  /**
   * Extract version from output
   */
  private extractVersion(output: string): string | undefined {
    const versionRegex = /version\s*[:=]\s*([^\s]+)/i
    const match = output.match(versionRegex)
    return match?.[1]
  }

  /**
   * Generate Dockerfile
   */
  private generateDockerfile(): string {
    return `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
`
  }

  /**
   * Generate docker-compose.yml
   */
  private generateDockerCompose(config: DeploymentConfig): string {
    return `version: '3.8'

services:
  matrix-platform:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=${config.environment}
      - REGION=${config.region}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
`
  }

  /**
   * Generate GitHub Actions workflow
   */
  private generateGitHubActions(config: DeploymentConfig): string {
    return `name: Deploy Matrix Platform

on:
  push:
    branches: [main, master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        run: |
          echo "Deploying to ${config.environment} in ${config.region}..."
          # Add your deployment commands here
`
  }

  /**
   * Generate Vercel config
   */
  private generateVercelConfig(config: DeploymentConfig): string {
    return JSON.stringify(
      {
        version: 2,
        builds: [
          {
            src: 'package.json',
            use: '@vercel/node',
          },
        ],
        routes: [
          {
            src: '/(.*)',
            dest: '/',
          },
        ],
        env: {
          NODE_ENV: config.environment,
          REGION: config.region,
        },
      },
      null,
      2
    )
  }

  /**
   * Generate Cloudflare Workers config
   */
  private generateCloudflareConfig(config: DeploymentConfig): string {
    return `name = "matrix-platform"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.${config.environment}]
vars = { NODE_ENV = "${config.environment}", REGION = "${config.region}" }
`
  }

  /**
   * Log deployment step
   */
  private async log(deploymentId: string, message: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId)
    if (deployment) {
      deployment.logs.push(`[${new Date().toISOString()}] ${message}`)
      logger.info(`[${deploymentId}] ${message}`)
    }
  }

  /**
   * Get deployment
   */
  getDeployment(deploymentId: string): DeploymentStatus | null {
    return this.deployments.get(deploymentId) || null
  }

  /**
   * Get all deployments
   */
  getAllDeployments(): DeploymentStatus[] {
    return Array.from(this.deployments.values())
  }

  /**
   * Get deployments by status
   */
  getDeploymentsByStatus(status: DeploymentStatus['status']): DeploymentStatus[] {
    return Array.from(this.deployments.values()).filter((d) => d.status === status)
  }
}

// Global Autonomous Deployment Engine
export const autonomousDeploymentEngine = new AutonomousDeploymentEngine()

