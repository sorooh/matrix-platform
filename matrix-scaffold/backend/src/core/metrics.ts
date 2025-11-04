/**
 * Metrics System - Updated with Database Support
 * Global-Ready Architecture with backward compatibility
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { kpis } from './suig'
import { captureKpisSnapshotDb, listKpisDb } from './metrics.db'
import { logger } from '../config/logger'

// Check if database is available
let useDatabase = false
try {
  if (process.env.DATABASE_URL) {
    useDatabase = true
  }
} catch {
  useDatabase = false
}

// Fallback to JSON
function baseDir() {
  const d = join(__dirname, '..', '..', 'storage', 'db')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

function metricsPath() {
  return join(baseDir(), 'metrics.json')
}

function readSeries(): any[] {
  const p = metricsPath()
  if (!existsSync(p)) return []
  try {
    const raw = readFileSync(p, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeSeries(arr: any[]) {
  writeFileSync(metricsPath(), JSON.stringify(arr), 'utf8')
}

export async function captureKpisSnapshot() {
  try {
    const k = await kpis()
    const ts = new Date().toISOString()

    if (useDatabase) {
      try {
        const snapshot = await captureKpisSnapshotDb(k)
        return { ts: snapshot.ts.toISOString(), kpis: snapshot.kpis }
      } catch (error) {
        logger.warn('Database captureKpisSnapshot failed, falling back to JSON:', error)
        useDatabase = false
      }
    }

    // Fallback to JSON
    const arr = readSeries()
    const snap = { ts, kpis: k }
    arr.push(snap)
    // cap at last 500
    while (arr.length > 500) arr.shift()
    writeSeries(arr)
    return snap
  } catch (error) {
    logger.error('Failed to capture KPIs snapshot:', error)
    throw error
  }
}

export async function listKpis(limit = 100): Promise<Array<{ ts: string; kpis: any }>> {
  try {
    if (useDatabase) {
      try {
        const snapshots = await listKpisDb(limit)
        return snapshots.map((s) => ({
          ts: s.ts.toISOString(),
          kpis: s.kpis
        }))
      } catch (error) {
        logger.warn('Database listKpis failed, falling back to JSON:', error)
        useDatabase = false
      }
    }

    // Fallback to JSON
    const arr = readSeries()
    return arr.slice(Math.max(0, arr.length - limit))
  } catch (error) {
    logger.error('Failed to list KPIs:', error)
    return []
  }
}




