/**
 * Phase 8.4 - Security & Governance
 * 
 * AI Code Scanner for security analysis
 * - Automatic code scanning before publishing
 * - Security risk analysis
 * - Runtime security monitoring (Sandbox Isolation)
 * - Mandatory developer agreement
 * - Audit log for every publishing action
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type IssueType = 'security' | 'performance' | 'compliance' | 'quality' | 'malware'
export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed'

export interface CodeScanResult {
  id: string
  appId: string
  version: string
  status: ScanStatus
  riskLevel: RiskLevel
  issues: ScanIssue[]
  score: number // 0-100
  scannedAt: Date
  metadata: Record<string, any>
}

export interface ScanIssue {
  id: string
  type: IssueType
  severity: 'info' | 'warning' | 'error' | 'critical'
  file?: string
  line?: number
  message: string
  recommendation?: string
  cwe?: string // Common Weakness Enumeration
}

export interface SecurityAudit {
  id: string
  appId: string
  developerId: string
  action: 'publish' | 'update' | 'delete' | 'approve' | 'reject'
  scanResultId?: string
  riskLevel: RiskLevel
  approved: boolean
  approvedBy?: string
  notes?: string
  createdAt: Date
}

class CodeScanner {
  private scans: Map<string, CodeScanResult> = new Map()
  private audits: Map<string, SecurityAudit> = new Map()

  async initialize() {
    logInfo('Initializing Security & Governance System...')
    logInfo('✅ Security & Governance System initialized')
  }

  // Scan app code
  async scanApp(appId: string, version: string, sourceCode: string): Promise<CodeScanResult> {
    try {
      const scanId = nanoid()
      const now = new Date()

      const scanResult: CodeScanResult = {
        id: scanId,
        appId,
        version,
        status: 'scanning',
        riskLevel: 'low',
        issues: [],
        score: 100,
        scannedAt: now,
        metadata: {}
      }

      this.scans.set(scanId, scanResult)

      // Perform security scan
      const issues = await this.performSecurityScan(sourceCode)
      scanResult.issues = issues
      scanResult.status = 'completed'
      scanResult.scannedAt = new Date()

      // Calculate risk level and score
      const { riskLevel, score } = this.calculateRiskLevel(issues)
      scanResult.riskLevel = riskLevel
      scanResult.score = score

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.codeScanResult.create({
          data: {
            id: scanId,
            appId,
            version,
            status: 'completed',
            riskLevel,
            issues: issues,
            score,
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Save scan result in database' })
      }

      this.scans.set(scanId, scanResult)
      logInfo(`✅ Scanned app ${appId} version ${version}: Risk ${riskLevel}, Score ${score}`)

      return scanResult
    } catch (error) {
      logError(error as Error, { context: 'Scan app' })
      throw error
    }
  }

  // Perform security scan
  private async performSecurityScan(sourceCode: string): Promise<ScanIssue[]> {
    const issues: ScanIssue[] = []

    // Check for common security vulnerabilities
    const securityPatterns = [
      {
        pattern: /eval\s*\(/gi,
        type: 'security' as IssueType,
        severity: 'critical' as const,
        message: 'Use of eval() detected - potential code injection vulnerability',
        recommendation: 'Use safer alternatives like JSON.parse() or Function() constructor'
      },
      {
        pattern: /exec\s*\(/gi,
        type: 'security' as IssueType,
        severity: 'critical' as const,
        message: 'Use of exec() detected - potential command injection vulnerability',
        recommendation: 'Use subprocess or equivalent safe methods'
      },
      {
        pattern: /password\s*=\s*['"](.*?)['"]/gi,
        type: 'security' as IssueType,
        severity: 'error' as const,
        message: 'Hardcoded password detected',
        recommendation: 'Use environment variables or secure credential storage'
      },
      {
        pattern: /api[_-]?key\s*=\s*['"](.*?)['"]/gi,
        type: 'security' as IssueType,
        severity: 'error' as const,
        message: 'Hardcoded API key detected',
        recommendation: 'Use environment variables or secure credential storage'
      },
      {
        pattern: /\.innerHTML\s*=/gi,
        type: 'security' as IssueType,
        severity: 'warning' as const,
        message: 'Direct innerHTML assignment - potential XSS vulnerability',
        recommendation: 'Use textContent or sanitize HTML input'
      },
      {
        pattern: /sql\s*=\s*['"].*\$\{.*\}.*['"]/gi,
        type: 'security' as IssueType,
        severity: 'error' as const,
        message: 'Potential SQL injection - string interpolation in SQL query',
        recommendation: 'Use parameterized queries or prepared statements'
      },
      {
        pattern: /require\s*\(['"]\.\.\/\.\.\/\.\.\/\.\./gi,
        type: 'security' as IssueType,
        severity: 'warning' as const,
        message: 'Path traversal detected',
        recommendation: 'Validate and sanitize file paths'
      },
      {
        pattern: /process\.env\.(.*)\s*=\s*/gi,
        type: 'security' as IssueType,
        severity: 'warning' as const,
        message: 'Modification of process.env detected',
        recommendation: 'Avoid modifying environment variables at runtime'
      }
    ]

    // Scan for security patterns
    for (const check of securityPatterns) {
      const matches = sourceCode.match(check.pattern)
      if (matches) {
        const lines = sourceCode.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (check.pattern.test(lines[i])) {
            issues.push({
              id: nanoid(),
              type: check.type,
              severity: check.severity,
              file: 'main',
              line: i + 1,
              message: check.message,
              recommendation: check.recommendation
            })
          }
        }
      }
    }

    // Check for performance issues
    const performancePatterns = [
      {
        pattern: /while\s*\(true\)/gi,
        type: 'performance' as IssueType,
        severity: 'warning' as const,
        message: 'Infinite loop detected',
        recommendation: 'Add proper loop termination conditions'
      },
      {
        pattern: /\.forEach\s*\(.*=>.*await/gi,
        type: 'performance' as IssueType,
        severity: 'warning' as const,
        message: 'await in forEach - operations will not be awaited properly',
        recommendation: 'Use for...of loop or Promise.all()'
      }
    ]

    for (const check of performancePatterns) {
      if (check.pattern.test(sourceCode)) {
        issues.push({
          id: nanoid(),
          type: check.type,
          severity: check.severity,
          message: check.message,
          recommendation: check.recommendation
        })
      }
    }

    // Check for malware indicators
    const malwarePatterns = [
      {
        pattern: /crypto.*miner|bitcoin.*miner/gi,
        type: 'malware' as IssueType,
        severity: 'critical' as const,
        message: 'Cryptocurrency miner detected',
        recommendation: 'Remove cryptocurrency mining code'
      },
      {
        pattern: /fetch\s*\(['"]https?:\/\/.*\.[a-z]{2,}\/.*['"]\)/gi,
        type: 'security' as IssueType,
        severity: 'warning' as const,
        message: 'External HTTP requests detected',
        recommendation: 'Validate and whitelist allowed domains'
      }
    ]

    for (const check of malwarePatterns) {
      if (check.pattern.test(sourceCode)) {
        issues.push({
          id: nanoid(),
          type: check.type,
          severity: check.severity,
          message: check.message,
          recommendation: check.recommendation
        })
      }
    }

    return issues
  }

  // Calculate risk level
  private calculateRiskLevel(issues: ScanIssue[]): { riskLevel: RiskLevel; score: number } {
    let score = 100
    let criticalCount = 0
    let errorCount = 0
    let warningCount = 0

    for (const issue of issues) {
      if (issue.severity === 'critical') {
        score -= 20
        criticalCount++
      } else if (issue.severity === 'error') {
        score -= 10
        errorCount++
      } else if (issue.severity === 'warning') {
        score -= 5
        warningCount++
      } else {
        score -= 1
      }
    }

    score = Math.max(0, score)

    let riskLevel: RiskLevel = 'low'
    if (criticalCount > 0 || score < 40) {
      riskLevel = 'critical'
    } else if (errorCount > 3 || score < 60) {
      riskLevel = 'high'
    } else if (warningCount > 5 || score < 80) {
      riskLevel = 'medium'
    }

    return { riskLevel, score }
  }

  // Create audit log
  async createAudit(
    appId: string,
    developerId: string,
    action: 'publish' | 'update' | 'delete' | 'approve' | 'reject',
    scanResultId?: string,
    approved: boolean = false,
    approvedBy?: string,
    notes?: string
  ): Promise<SecurityAudit> {
    try {
      const auditId = nanoid()
      const now = new Date()

      let riskLevel: RiskLevel = 'low'
      if (scanResultId) {
        const scanResult = this.scans.get(scanResultId)
        if (scanResult) {
          riskLevel = scanResult.riskLevel
        }
      }

      const audit: SecurityAudit = {
        id: auditId,
        appId,
        developerId,
        action,
        scanResultId,
        riskLevel,
        approved,
        approvedBy,
        notes,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.securityAudit.create({
          data: {
            id: auditId,
            appId,
            developerId,
            action,
            scanResultId: scanResultId || null,
            riskLevel,
            approved,
            approvedBy: approvedBy || null,
            notes: notes || null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create audit in database' })
      }

      this.audits.set(auditId, audit)
      logInfo(`✅ Created audit ${auditId} for app ${appId}, action: ${action}`)

      return audit
    } catch (error) {
      logError(error as Error, { context: 'Create audit' })
      throw error
    }
  }

  // Get scan result
  async getScanResult(scanId: string): Promise<CodeScanResult | null> {
    return this.scans.get(scanId) || null
  }

  // Get audits
  async getAudits(appId?: string, developerId?: string, limit: number = 100): Promise<SecurityAudit[]> {
    const audits: SecurityAudit[] = []
    for (const audit of this.audits.values()) {
      if (appId && audit.appId !== appId) continue
      if (developerId && audit.developerId !== developerId) continue
      audits.push(audit)
    }
    return audits
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }
}

export const codeScanner = new CodeScanner()

