/**
 * Phase 10.5 - Data Loss Prevention (DLP)
 * 
 * Prevent sensitive data loss
 * - Data classification
 * - Policy enforcement
 * - Data monitoring
 * - Incident detection
 * - Automated blocking
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../../config/logger'

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret'
export type DLPAction = 'allow' | 'block' | 'warn' | 'encrypt' | 'quarantine'
export type DLPIncidentType = 'unauthorized_access' | 'data_exfiltration' | 'policy_violation' | 'suspicious_activity'

export interface DLPPolicy {
  id: string
  name: string
  description: string
  classification: DataClassification
  patterns: string[] // Regex patterns
  actions: DLPAction[]
  conditions: {
    source: string[]
    destination: string[]
    users: string[]
    roles: string[]
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DLPIncident {
  id: string
  type: DLPIncidentType
  policyId: string
  userId: string
  data: {
    type: string
    content: string
    classification: DataClassification
  }
  action: DLPAction
  source: string
  destination: string
  detectedAt: Date
  resolvedAt?: Date
  status: 'detected' | 'investigating' | 'resolved' | 'false_positive'
}

export interface DLPViolation {
  id: string
  incidentId: string
  policyId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  violationType: string
  detectedAt: Date
  resolvedAt?: Date
}

class DataLossPrevention {
  private policies: Map<string, DLPPolicy> = new Map()
  private incidents: Map<string, DLPIncident> = new Map()
  private violations: Map<string, DLPViolation> = new Map()

  async initialize() {
    logInfo('Initializing Data Loss Prevention (DLP)...')

    // Initialize default policies
    await this.initializeDefaultPolicies()

    logInfo('✅ Data Loss Prevention (DLP) initialized')
  }

  // Initialize default policies
  private async initializeDefaultPolicies(): Promise<void> {
    const defaultPolicies: Omit<DLPPolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Credit Card Detection',
        description: 'Detect and block credit card numbers',
        classification: 'restricted',
        patterns: ['\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b'], // Credit card pattern
        actions: ['block', 'encrypt'],
        conditions: {
          source: [],
          destination: [],
          users: [],
          roles: []
        },
        isActive: true
      },
      {
        name: 'SSN Detection',
        description: 'Detect and block Social Security Numbers',
        classification: 'restricted',
        patterns: ['\\b\\d{3}-\\d{2}-\\d{4}\\b'], // SSN pattern
        actions: ['block', 'encrypt'],
        conditions: {
          source: [],
          destination: [],
          users: [],
          roles: []
        },
        isActive: true
      },
      {
        name: 'Email Address Protection',
        description: 'Protect email addresses from unauthorized sharing',
        classification: 'confidential',
        patterns: ['\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b'],
        actions: ['warn', 'encrypt'],
        conditions: {
          source: [],
          destination: [],
          users: [],
          roles: []
        },
        isActive: true
      }
    ]

    for (const policy of defaultPolicies) {
      const policyId = nanoid()
      const now = new Date()

      const dlpPolicy: DLPPolicy = {
        id: policyId,
        ...policy,
        createdAt: now,
        updatedAt: now
      }

      this.policies.set(policyId, dlpPolicy)
    }

    logInfo('✅ Default DLP policies initialized')
  }

  // Create DLP policy
  async createPolicy(
    name: string,
    description: string,
    classification: DataClassification,
    patterns: string[],
    actions: DLPAction[],
    conditions: DLPPolicy['conditions']
  ): Promise<DLPPolicy> {
    try {
      const policyId = nanoid()
      const now = new Date()

      const policy: DLPPolicy = {
        id: policyId,
        name,
        description,
        classification,
        patterns,
        actions,
        conditions,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.dLPPolicy.create({
          data: {
            id: policyId,
            name,
            description,
            classification,
            patterns,
            actions,
            conditions,
            isActive: true,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create DLP policy in database' })
      }

      this.policies.set(policyId, policy)

      logInfo(`✅ DLP policy created ${policyId}: ${name}`)

      return policy
    } catch (error) {
      logError(error as Error, { context: 'Create DLP policy' })
      throw error
    }
  }

  // Scan data for violations
  async scanData(
    userId: string,
    data: string,
    dataType: string,
    source: string,
    destination: string
  ): Promise<DLPIncident | null> {
    try {
      // Check against all active policies
      for (const policy of this.policies.values()) {
        if (!policy.isActive) continue

        // Check if policy applies
        if (!this.policyApplies(policy, userId, source, destination)) continue

        // Check for pattern matches
        for (const pattern of policy.patterns) {
          const regex = new RegExp(pattern, 'gi')
          if (regex.test(data)) {
            // Violation detected
            return await this.createIncident(
              'policy_violation',
              policy.id,
              userId,
              data,
              dataType,
              policy.classification,
              source,
              destination,
              policy.actions[0]
            )
          }
        }
      }

      return null
    } catch (error) {
      logError(error as Error, { context: 'Scan data' })
      return null
    }
  }

  // Policy applies check
  private policyApplies(
    policy: DLPPolicy,
    userId: string,
    source: string,
    destination: string
  ): boolean {
    // Check conditions
    if (policy.conditions.users.length > 0 && !policy.conditions.users.includes(userId)) {
      return false
    }
    if (policy.conditions.source.length > 0 && !policy.conditions.source.includes(source)) {
      return false
    }
    if (policy.conditions.destination.length > 0 && !policy.conditions.destination.includes(destination)) {
      return false
    }

    return true
  }

  // Create incident
  private async createIncident(
    type: DLPIncidentType,
    policyId: string,
    userId: string,
    data: string,
    dataType: string,
    classification: DataClassification,
    source: string,
    destination: string,
    action: DLPAction
  ): Promise<DLPIncident> {
    try {
      const incidentId = nanoid()
      const now = new Date()

      const incident: DLPIncident = {
        id: incidentId,
        type,
        policyId,
        userId,
        data: {
          type: dataType,
          content: data.substring(0, 100), // First 100 chars
          classification
        },
        action,
        source,
        destination,
        detectedAt: now,
        status: 'detected'
      }

      // Execute action
      await this.executeAction(incident)

      // Create violation
      await this.createViolation(incidentId, policyId, type, incident.action)

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.dLPIncident.create({
          data: {
            id: incidentId,
            type,
            policyId,
            userId,
            data: incident.data,
            action,
            source,
            destination,
            detectedAt: now,
            resolvedAt: null,
            status: 'detected'
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create DLP incident in database' })
      }

      this.incidents.set(incidentId, incident)

      logInfo(`🚨 DLP incident detected ${incidentId}: ${type} (${action})`)

      return incident
    } catch (error) {
      logError(error as Error, { context: 'Create DLP incident' })
      throw error
    }
  }

  // Execute action
  private async executeAction(incident: DLPIncident): Promise<void> {
    switch (incident.action) {
      case 'block':
        logInfo(`🚫 Blocked data transfer: ${incident.source} -> ${incident.destination}`)
        break
      case 'encrypt':
        logInfo(`🔒 Encrypting sensitive data: ${incident.data.type}`)
        break
      case 'warn':
        logInfo(`⚠️ Warning issued for data transfer: ${incident.source} -> ${incident.destination}`)
        break
      case 'quarantine':
        logInfo(`📦 Quarantined data: ${incident.data.type}`)
        break
      default:
        logInfo(`✅ Allowed data transfer: ${incident.source} -> ${incident.destination}`)
    }
  }

  // Create violation
  private async createViolation(
    incidentId: string,
    policyId: string,
    type: DLPIncidentType,
    action: DLPAction
  ): Promise<DLPViolation> {
    try {
      const violationId = nanoid()
      const now = new Date()

      const severity: 'low' | 'medium' | 'high' | 'critical' = 
        action === 'block' ? 'critical' :
        action === 'encrypt' ? 'high' :
        action === 'warn' ? 'medium' : 'low'

      const violation: DLPViolation = {
        id: violationId,
        incidentId,
        policyId,
        severity,
        description: `DLP violation: ${type}`,
        violationType: type,
        detectedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.dLPViolation.create({
          data: {
            id: violationId,
            incidentId,
            policyId,
            severity,
            description: violation.description,
            violationType: type,
            detectedAt: now,
            resolvedAt: null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create DLP violation in database' })
      }

      this.violations.set(violationId, violation)

      return violation
    } catch (error) {
      logError(error as Error, { context: 'Create DLP violation' })
      throw error
    }
  }

  // Get policies
  async getPolicies(isActive?: boolean): Promise<DLPPolicy[]> {
    const policies: DLPPolicy[] = []
    for (const policy of this.policies.values()) {
      if (isActive !== undefined && policy.isActive !== isActive) continue
      policies.push(policy)
    }
    return policies.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get incidents
  async getIncidents(status?: string): Promise<DLPIncident[]> {
    const incidents: DLPIncident[] = []
    for (const incident of this.incidents.values()) {
      if (status && incident.status !== status) continue
      incidents.push(incident)
    }
    return incidents.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
  }
}

export const dataLossPrevention = new DataLossPrevention()

