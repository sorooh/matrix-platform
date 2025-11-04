/**
 * Performance Utilities
 * Global-Ready Architecture with performance monitoring
 */

import { logger } from '../config/logger'

export class PerformanceMonitor {
  private startTime: number
  private checkpoints: Map<string, number> = new Map()

  constructor() {
    this.startTime = Date.now()
  }

  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now())
  }

  getDuration(name?: string): number {
    if (name) {
      const checkpoint = this.checkpoints.get(name)
      if (!checkpoint) return 0
      return Date.now() - checkpoint
    }
    return Date.now() - this.startTime
  }

  logPerformance(context: string): void {
    const totalDuration = this.getDuration()
    const checkpointData: Record<string, number> = {}
    
    for (const [name, time] of this.checkpoints.entries()) {
      checkpointData[name] = Date.now() - time
    }

    logger.info('Performance metrics', {
      context,
      totalDuration,
      checkpoints: checkpointData
    })
  }
}

export function measurePerformance<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  const monitor = new PerformanceMonitor()
  return fn().finally(() => {
    monitor.logPerformance(context)
  })
}

