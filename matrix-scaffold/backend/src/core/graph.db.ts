/**
 * Graph System - PostgreSQL Version
 * Global-Ready Architecture with database support
 */

import { prisma } from '../config/database'
import { logger } from '../config/logger'
import { NodeType, Edge } from './graph'

export const graphDb = {
  async link(
    fromType: NodeType,
    fromId: string,
    rel: string,
    toType: NodeType,
    toId: string
  ): Promise<Edge> {
    try {
      const now = new Date().toISOString()
      const e: Edge = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        from: { type: fromType, id: fromId },
        to: { type: toType, id: toId },
        rel,
        createdAt: now
      }

      await prisma.graphEdge.create({
        data: {
          id: e.id,
          fromType: e.from.type,
          fromId: e.from.id,
          toType: e.to.type,
          toId: e.to.id,
          rel: e.rel,
          createdAt: new Date(e.createdAt)
        }
      })

      return e
    } catch (error: any) {
      logger.error('Failed to create graph edge:', error)
      throw error
    }
  },

  async neighbors(type: NodeType, id: string): Promise<Edge[]> {
    try {
      const edges = await prisma.graphEdge.findMany({
        where: {
          OR: [
            { fromType: type, fromId: id },
            { toType: type, toId: id }
          ]
        }
      })

      return edges.map((e) => ({
        id: e.id,
        from: { type: e.fromType as NodeType, id: e.fromId },
        to: { type: e.toType as NodeType, id: e.toId },
        rel: e.rel,
        createdAt: e.createdAt.toISOString()
      }))
    } catch (error: any) {
      logger.error('Failed to get neighbors:', error)
      return []
    }
  },

  async all(): Promise<Edge[]> {
    try {
      const edges = await prisma.graphEdge.findMany({
        orderBy: { createdAt: 'desc' }
      })

      return edges.map((e) => ({
        id: e.id,
        from: { type: e.fromType as NodeType, id: e.fromId },
        to: { type: e.toType as NodeType, id: e.toId },
        rel: e.rel,
        createdAt: e.createdAt.toISOString()
      }))
    } catch (error: any) {
      logger.error('Failed to get all edges:', error)
      return []
    }
  },

  async summary(): Promise<{
    totalEdges: number
    byRelation: Record<string, number>
    nodesByType: Record<string, number>
  }> {
    try {
      const edges = await prisma.graphEdge.findMany()
      const byRelation: Record<string, number> = {}
      const nodesByType: Record<string, number> = {}
      const seenNodes = new Set<string>()

      for (const e of edges) {
        byRelation[e.rel] = (byRelation[e.rel] || 0) + 1
        const fk = `${e.fromType}:${e.fromId}`
        const tk = `${e.toType}:${e.toId}`
        if (!seenNodes.has(fk)) {
          seenNodes.add(fk)
          nodesByType[e.fromType] = (nodesByType[e.fromType] || 0) + 1
        }
        if (!seenNodes.has(tk)) {
          seenNodes.add(tk)
          nodesByType[e.toType] = (nodesByType[e.toType] || 0) + 1
        }
      }

      return {
        totalEdges: edges.length,
        byRelation,
        nodesByType
      }
    } catch (error: any) {
      logger.error('Failed to get graph summary:', error)
      return { totalEdges: 0, byRelation: {}, nodesByType: {} }
    }
  }
}

