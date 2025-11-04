/**
 * Org Sync System - Updated with Async Support
 * Global-Ready Architecture
 */

import { db } from './storage'
import { graph } from './graph'
import { addOrgMemory } from './orgMemory'
import { logger } from '../config/logger'

export type OrgSyncResult = {
  projectsLinked: number
  orgMemAdded: number
}

export async function syncOrgFromProjects(): Promise<OrgSyncResult> {
  try {
    const projects = await db.listProjects()
    let projectsLinked = 0
    let orgMemAdded = 0

    for (const p of projects) {
      try {
        await graph.link('Org', '__org__', 'HAS_PROJECT', 'Project', p.id)
        projectsLinked += 1
      } catch (error) {
        logger.warn(`Failed to link project ${p.id} to org:`, error)
      }
      try {
        const mems = await db.listMemory(p.id)
        for (const m of mems) {
          const kind = (m.metadata as any)?.kind || (m.metadata as any)?.source || ''
          if (kind === 'summary' || kind === 'runtime-log') {
            await addOrgMemory(m.text, { copiedFrom: p.id, kind })
            orgMemAdded += 1
          }
        }
      } catch (error) {
        logger.warn(`Failed to sync memory from project ${p.id}:`, error)
      }
    }

    return { projectsLinked, orgMemAdded }
  } catch (error) {
    logger.error('Failed to sync org from projects:', error)
    return { projectsLinked: 0, orgMemAdded: 0 }
  }
}


