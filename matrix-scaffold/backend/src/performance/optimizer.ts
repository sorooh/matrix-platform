/**
 * Performance Optimizer
 * Phase 3: Advanced Performance Optimization
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'
import { redis } from '../config/redis'
import { recordDatabaseQuery } from '../monitoring/prometheus'

export interface QueryOptimization {
  query: string
  originalDuration: number
  optimizedDuration: number
  improvement: number
  recommendations: string[]
}

export interface PerformanceOptimization {
  type: 'query' | 'cache' | 'index' | 'connection'
  description: string
  impact: 'low' | 'medium' | 'high'
  recommendation: string
  priority: number
}

export class PerformanceOptimizer {
  private queryHistory: Map<string, { count: number; totalDuration: number; avgDuration: number }> = new Map()
  private optimizations: PerformanceOptimization[] = []

  /**
   * Analyze query performance
   */
  async analyzeQuery(query: string, duration: number, table?: string): Promise<QueryOptimization | null> {
    try {
      const key = `${query}:${table || 'unknown'}`
      const history = this.queryHistory.get(key) || { count: 0, totalDuration: 0, avgDuration: 0 }

      history.count++
      history.totalDuration += duration
      history.avgDuration = history.totalDuration / history.count

      this.queryHistory.set(key, history)

      // Record metrics
      recordDatabaseQuery('query', table || 'unknown', duration)

      // Check if optimization is needed
      if (duration > 1000 && history.count > 10) {
        const recommendations: string[] = []

        // Check for missing indexes
        if (query.includes('WHERE') && !query.includes('INDEX')) {
          recommendations.push('Consider adding indexes on WHERE clause columns')
        }

        // Check for SELECT *
        if (query.includes('SELECT *')) {
          recommendations.push('Avoid SELECT * - specify only needed columns')
        }

        // Check for N+1 queries
        if (history.count > 100 && duration > 500) {
          recommendations.push('Potential N+1 query pattern - consider batch loading')
        }

        if (recommendations.length > 0) {
          const optimization: QueryOptimization = {
            query: query.substring(0, 100), // Truncate for logging
            originalDuration: duration,
            optimizedDuration: duration * 0.5, // Estimated improvement
            improvement: 50,
            recommendations
          }

          logger.warn('Query optimization recommended', {
            query: query.substring(0, 100),
            duration,
            recommendations
          })

          return optimization
        }
      }

      return null
    } catch (error: any) {
      logger.error('Query analysis failed:', error)
      return null
    }
  }

  /**
   * Optimize database connection pool
   */
  async optimizeConnectionPool(): Promise<{
    success: boolean
    recommendations: string[]
  }> {
    try {
      const recommendations: string[] = []

      // Check connection pool configuration
      // In production, check actual pool stats
      recommendations.push('Monitor connection pool usage and adjust pool size based on load')

      // Check for connection leaks
      recommendations.push('Implement connection timeout and leak detection')

      logger.info('Connection pool optimization analyzed', { recommendations })

      return {
        success: true,
        recommendations
      }
    } catch (error: any) {
      logger.error('Connection pool optimization failed:', error)
      return { success: false, recommendations: [] }
    }
  }

  /**
   * Analyze cache performance
   */
  async analyzeCachePerformance(): Promise<{
    hitRate: number
    recommendations: string[]
  }> {
    try {
      // In production, get actual cache stats from Redis
      const recommendations: string[] = []

      recommendations.push('Monitor cache hit rate and adjust TTL based on access patterns')
      recommendations.push('Implement cache warming for frequently accessed data')
      recommendations.push('Use cache tags for efficient invalidation')

      logger.info('Cache performance analyzed', { recommendations })

      return {
        hitRate: 0.8, // Estimated
        recommendations
      }
    } catch (error: any) {
      logger.error('Cache performance analysis failed:', error)
      return { hitRate: 0, recommendations: [] }
    }
  }

  /**
   * Generate performance optimizations
   */
  async generateOptimizations(): Promise<PerformanceOptimization[]> {
    try {
      const optimizations: PerformanceOptimization[] = []

      // Analyze slow queries
      const slowQueries = Array.from(this.queryHistory.entries())
        .filter(([_, stats]) => stats.avgDuration > 1000)
        .sort(([_, a], [__, b]) => b.avgDuration - a.avgDuration)
        .slice(0, 10)

      for (const [query, stats] of slowQueries) {
        optimizations.push({
          type: 'query',
          description: `Slow query detected: ${query.substring(0, 50)}`,
          impact: stats.avgDuration > 5000 ? 'high' : stats.avgDuration > 2000 ? 'medium' : 'low',
          recommendation: 'Optimize query or add indexes',
          priority: Math.min(10, Math.floor(stats.avgDuration / 1000))
        })
      }

      // Cache optimizations
      optimizations.push({
        type: 'cache',
        description: 'Cache hit rate optimization',
        impact: 'high',
        recommendation: 'Implement cache warming and optimize TTL',
        priority: 8
      })

      // Index optimizations
      optimizations.push({
        type: 'index',
        description: 'Database index optimization',
        impact: 'medium',
        recommendation: 'Analyze query patterns and add missing indexes',
        priority: 6
      })

      // Connection pool optimizations
      optimizations.push({
        type: 'connection',
        description: 'Connection pool optimization',
        impact: 'medium',
        recommendation: 'Monitor and adjust connection pool size',
        priority: 5
      })

      this.optimizations = optimizations.sort((a, b) => b.priority - a.priority)

      logger.info('Performance optimizations generated', {
        count: optimizations.length
      })

      return this.optimizations
    } catch (error: any) {
      logger.error('Performance optimization generation failed:', error)
      return []
    }
  }

  /**
   * Get query statistics
   */
  getQueryStats(): Map<string, { count: number; avgDuration: number }> {
    const stats = new Map<string, { count: number; avgDuration: number }>()

    for (const [key, history] of this.queryHistory.entries()) {
      stats.set(key, {
        count: history.count,
        avgDuration: history.avgDuration
      })
    }

    return stats
  }
}

// Global Performance Optimizer
export const performanceOptimizer = new PerformanceOptimizer()

