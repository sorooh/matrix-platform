/**
 * Metrics System - PostgreSQL Version
 * Global-Ready Architecture with database support
 */

import { prisma } from '../config/database'
import { logger } from '../config/logger'

export interface KpiSnapshot {
  id: string
  ts: Date
  kpis: any
  region: string
}

export async function captureKpisSnapshotDb(kpis: any): Promise<KpiSnapshot> {
  try {
    const snapshot = await prisma.kpiSnapshot.create({
      data: {
        ts: new Date(),
        kpis: kpis as any,
        region: process.env.REGION || 'us-east-1'
      }
    })

    return {
      id: snapshot.id,
      ts: snapshot.ts,
      kpis: snapshot.kpis as any,
      region: snapshot.region
    }
  } catch (error: any) {
    logger.error('Failed to capture KPIs snapshot:', error)
    throw error
  }
}

export async function listKpisDb(limit: number = 100): Promise<KpiSnapshot[]> {
  try {
    const snapshots = await prisma.kpiSnapshot.findMany({
      orderBy: { ts: 'desc' },
      take: limit
    })

    return snapshots.map((s) => ({
      id: s.id,
      ts: s.ts,
      kpis: s.kpis as any,
      region: s.region
    }))
  } catch (error: any) {
    logger.error('Failed to list KPIs:', error)
    return []
  }
}

