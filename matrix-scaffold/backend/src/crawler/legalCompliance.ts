/**
 * Legal Compliance Filter
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { CrawlResult } from './engine'

export interface ComplianceRule {
  id: string
  name: string
  type: 'domain' | 'content' | 'metadata' | 'url'
  pattern: string | RegExp
  action: 'allow' | 'block' | 'warn' | 'filter'
  description?: string
}

export interface ComplianceResult {
  allowed: boolean
  filtered: boolean
  warnings: string[]
  blocked: boolean
  reason?: string
  rules: Array<{
    ruleId: string
    ruleName: string
    matched: boolean
    action: string
  }>
}

export class LegalComplianceFilter {
  private rules: Map<string, ComplianceRule> = new Map()
  private defaultAction: 'allow' | 'block' = 'allow'

  constructor() {
    this.initializeDefaultRules()
  }

  /**
   * Initialize default compliance rules
   */
  private initializeDefaultRules(): void {
    // Block common bot-blocked domains
    this.addRule({
      id: 'block-bot-domains',
      name: 'Block Bot-Blocked Domains',
      type: 'domain',
      pattern: /(facebook\.com|instagram\.com|twitter\.com|linkedin\.com)\/.*$/i,
      action: 'warn',
      description: 'Warn for social media domains that may block crawlers',
    })

    // Block explicit content keywords
    this.addRule({
      id: 'block-explicit-content',
      name: 'Block Explicit Content',
      type: 'content',
      pattern: /(explicit|adult|nsfw|18\+)/i,
      action: 'block',
      description: 'Block explicit content',
    })

    // Block malicious domains
    this.addRule({
      id: 'block-malicious',
      name: 'Block Malicious Domains',
      type: 'domain',
      pattern: /(malware|phishing|spam|virus)\./i,
      action: 'block',
      description: 'Block known malicious domains',
    })

    // Filter sensitive information
    this.addRule({
      id: 'filter-sensitive',
      name: 'Filter Sensitive Information',
      type: 'content',
      pattern: /(password|credit.card|ssn|social.security)/i,
      action: 'filter',
      description: 'Filter sensitive information from content',
    })

    logger.info('Default compliance rules initialized', {
      rulesCount: this.rules.size,
    })
  }

  /**
   * Add compliance rule
   */
  addRule(rule: ComplianceRule): void {
    this.rules.set(rule.id, rule)

    logger.info('Compliance rule added', {
      ruleId: rule.id,
      ruleName: rule.name,
      action: rule.action,
    })

    eventBus.publish('crawler.compliance.rule.added', {
      rule,
    })
  }

  /**
   * Remove compliance rule
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId)
    if (rule) {
      this.rules.delete(ruleId)
      logger.info('Compliance rule removed', { ruleId })
    }
  }

  /**
   * Check compliance
   */
  checkCompliance(result: CrawlResult): ComplianceResult {
    const complianceResult: ComplianceResult = {
      allowed: true,
      filtered: false,
      warnings: [],
      blocked: false,
      rules: [],
    }

    const url = result.url
    const content = result.content || ''
    const metadata = result.metadata || {}

    // Extract domain from URL
    let domain = ''
    try {
      const urlObj = new URL(url)
      domain = urlObj.hostname
    } catch {
      // Invalid URL, skip domain checks
    }

    // Check each rule
    for (const [ruleId, rule] of this.rules.entries()) {
      let matched = false
      let matchValue = ''

      switch (rule.type) {
        case 'domain':
          matchValue = domain
          break
        case 'content':
          matchValue = content
          break
        case 'metadata':
          matchValue = JSON.stringify(metadata)
          break
        case 'url':
          matchValue = url
          break
      }

      // Check pattern
      if (typeof rule.pattern === 'string') {
        matched = matchValue.toLowerCase().includes(rule.pattern.toLowerCase())
      } else {
        matched = rule.pattern.test(matchValue)
      }

      if (matched) {
        complianceResult.rules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: true,
          action: rule.action,
        })

        switch (rule.action) {
          case 'block':
            complianceResult.blocked = true
            complianceResult.allowed = false
            complianceResult.reason = `Blocked by rule: ${rule.name}`
            logger.warn('Content blocked by compliance rule', {
              url,
              ruleId: rule.id,
              ruleName: rule.name,
            })

            eventBus.publish('crawler.compliance.blocked', {
              url,
              rule,
              result: complianceResult,
            })
            break

          case 'warn':
            complianceResult.warnings.push(`Warning: ${rule.name}`)
            logger.warn('Content flagged by compliance rule', {
              url,
              ruleId: rule.id,
              ruleName: rule.name,
            })
            break

          case 'filter':
            complianceResult.filtered = true
            // Filter sensitive content
            if (rule.type === 'content') {
              result.content = this.filterSensitiveContent(result.content || '')
            }
            logger.info('Content filtered by compliance rule', {
              url,
              ruleId: rule.id,
              ruleName: rule.name,
            })
            break
        }
      }
    }

    return complianceResult
  }

  /**
   * Filter sensitive content
   */
  private filterSensitiveContent(content: string): string {
    // Remove credit card numbers (simplified pattern)
    content = content.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')

    // Remove SSN patterns
    content = content.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')

    // Remove email addresses (optional - can be configured)
    // content = content.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')

    return content
  }

  /**
   * Get all rules
   */
  getAllRules(): ComplianceRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): ComplianceRule | null {
    return this.rules.get(ruleId) || null
  }

  /**
   * Update default action
   */
  setDefaultAction(action: 'allow' | 'block'): void {
    this.defaultAction = action
    logger.info('Default compliance action updated', { action })
  }
}

// Global Legal Compliance Filter
export const legalComplianceFilter = new LegalComplianceFilter()

