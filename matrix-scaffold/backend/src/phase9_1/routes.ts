/**
 * Phase 9.1 - Routes
 * 
 * All API routes for Phase 9.1 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { globalComplianceEngine } from '../compliance/globalCompliance'
import { dataResidencyManager } from '../compliance/dataResidency'
import { securityCertificationManager } from '../compliance/certificationManager'
import { legalDocumentationCenter } from '../legal/documentationCenter'
import { auditAndTraceabilitySystem } from '../audit/auditSystem'
import { ethicalAIGovernance } from '../aiGovernance/ethicalGovernance'

export async function registerPhase9_1Routes(server: FastifyInstance) {
  // Global Compliance
  server.post('/api/compliance/check', async (request, reply) => {
    try {
      const { standard, region } = request.body as any
      const check = await globalComplianceEngine.runComplianceCheck(standard, region)
      return reply.send({ success: true, check })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/compliance/check' })
      return reply.status(500).send({ error: 'Failed to run compliance check' })
    }
  })

  server.post('/api/compliance/report', async (request, reply) => {
    try {
      const { standard, region } = request.body as any
      const report = await globalComplianceEngine.generateComplianceReport(standard, region)
      return reply.send({ success: true, report })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/compliance/report' })
      return reply.status(500).send({ error: 'Failed to generate compliance report' })
    }
  })

  // Data Residency
  server.post('/api/data-residency/rules', async (request, reply) => {
    try {
      const { region, dataType, storageLocation, encryptionRequired, transferAllowed, transferConditions, sccRequired } = request.body as any
      const rule = await dataResidencyManager.createResidencyRule(region, dataType, storageLocation, encryptionRequired, transferAllowed, transferConditions, sccRequired)
      return reply.send({ success: true, rule })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/data-residency/rules' })
      return reply.status(500).send({ error: 'Failed to create residency rule' })
    }
  })

  server.post('/api/data-residency/transfer', async (request, reply) => {
    try {
      const { fromRegion, toRegion, dataType, transferMethod } = request.body as any
      const transfer = await dataResidencyManager.requestDataTransfer(fromRegion, toRegion, dataType, transferMethod)
      return reply.send({ success: true, transfer })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/data-residency/transfer' })
      return reply.status(500).send({ error: 'Failed to request data transfer' })
    }
  })

  // Security Certifications
  server.post('/api/certifications/register', async (request, reply) => {
    try {
      const { type, issuer, certificateNumber, issuedAt, expiresAt, autoRenew, documentUrl } = request.body as any
      const certification = await securityCertificationManager.registerCertification(type, issuer, certificateNumber, new Date(issuedAt), new Date(expiresAt), autoRenew, documentUrl)
      return reply.send({ success: true, certification })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/certifications/register' })
      return reply.status(500).send({ error: 'Failed to register certification' })
    }
  })

  server.get('/api/certifications/:certId', async (request, reply) => {
    try {
      const { certId } = request.params as any
      const certification = await securityCertificationManager.getCertification(certId)
      if (!certification) return reply.status(404).send({ error: 'Certification not found' })
      return reply.send({ success: true, certification })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/certifications/:certId' })
      return reply.status(500).send({ error: 'Failed to get certification' })
    }
  })

  // Legal Documents
  server.get('/api/legal/documents/:type/:language', async (request, reply) => {
    try {
      const { type, language } = request.params as any
      const document = await legalDocumentationCenter.getDocument(type, language)
      if (!document) return reply.status(404).send({ error: 'Document not found' })
      return reply.send({ success: true, document })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/legal/documents/:type/:language' })
      return reply.status(500).send({ error: 'Failed to get document' })
    }
  })

  server.post('/api/legal/documents', async (request, reply) => {
    try {
      const { type, language, content, title, version } = request.body as any
      const document = await legalDocumentationCenter.createDocument(type, language, content, title, version)
      return reply.send({ success: true, document })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/legal/documents' })
      return reply.status(500).send({ error: 'Failed to create document' })
    }
  })

  // Audit
  server.post('/api/audit/log', async (request, reply) => {
    try {
      const { action, userId, resourceId, resourceType, ipAddress, userAgent, country, details, severity } = request.body as any
      const log = await auditAndTraceabilitySystem.logAuditEvent(action, userId, resourceId, resourceType, ipAddress, userAgent, country, details, severity)
      return reply.send({ success: true, log })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/audit/log' })
      return reply.status(500).send({ error: 'Failed to log audit event' })
    }
  })

  server.post('/api/audit/report', async (request, reply) => {
    try {
      const { type, startDate, endDate, format } = request.body as any
      const report = await auditAndTraceabilitySystem.generateComplianceReport(type, new Date(startDate), new Date(endDate), format)
      return reply.send({ success: true, report })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/audit/report' })
      return reply.status(500).send({ error: 'Failed to generate audit report' })
    }
  })

  // AI Governance
  server.post('/api/ai-governance/detect-bias', async (request, reply) => {
    try {
      const { aiId, biasType, evidence } = request.body as any
      const detection = await ethicalAIGovernance.detectBias(aiId, biasType, evidence)
      return reply.send({ success: true, detection })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/ai-governance/detect-bias' })
      return reply.status(500).send({ error: 'Failed to detect bias' })
    }
  })

  server.post('/api/ai-governance/report', async (request, reply) => {
    try {
      const { aiId, standard } = request.body as any
      const report = await ethicalAIGovernance.generateGovernanceReport(aiId, standard)
      return reply.send({ success: true, report })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/ai-governance/report' })
      return reply.status(500).send({ error: 'Failed to generate governance report' })
    }
  })
}
