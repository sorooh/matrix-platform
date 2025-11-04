/**
 * AI Agents Index
 * Global-Ready Architecture with all AI agents
 */

export * from './baseAgent'
export * from './morpheus'
export * from './architect'
export * from './sida'
export * from './audit'

import { MorpheusAgent } from './morpheus'
import { ArchitectAgent } from './architect'
import { SIDAAgent } from './sida'
import { AuditAgent } from './audit'
import { logger } from '../../config/logger'

// Agent registry
export const agents = {
  morpheus: new MorpheusAgent(),
  architect: new ArchitectAgent(),
  sida: new SIDAAgent(),
  audit: new AuditAgent()
}

// Initialize all agents
export function initializeAgents(): void {
  try {
    logger.info('Initializing AI agents...')
    // Agents are already initialized when imported
    logger.info('AI agents initialized successfully', {
      agents: Object.keys(agents).length,
      names: Object.keys(agents)
    })
  } catch (error) {
    logger.error('Failed to initialize AI agents:', error)
  }
}

// Get agent by name
export function getAgent(name: string): any {
  return (agents as any)[name]
}

