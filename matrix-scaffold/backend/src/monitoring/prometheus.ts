/**
 * Prometheus Metrics System
 * Phase 3: Advanced Monitoring & Observability
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import promClient from 'prom-client'

// Create Prometheus Registry
const register = new promClient.Registry()

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register })

// Custom Metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
})

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
})

export const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
})

export const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
})

export const cacheHitRate = new promClient.Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate (0-1)'
})

export const agentExecutionDuration = new promClient.Histogram({
  name: 'agent_execution_duration_seconds',
  help: 'Duration of agent executions in seconds',
  labelNames: ['agent_type', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60]
})

export const agentExecutionTotal = new promClient.Counter({
  name: 'agent_executions_total',
  help: 'Total number of agent executions',
  labelNames: ['agent_type', 'status']
})

export const jobDuration = new promClient.Histogram({
  name: 'job_duration_seconds',
  help: 'Duration of jobs in seconds',
  labelNames: ['job_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 300, 600]
})

export const jobTotal = new promClient.Counter({
  name: 'jobs_total',
  help: 'Total number of jobs',
  labelNames: ['job_type', 'status']
})

export const memoryUsage = new promClient.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
})

export const errorTotal = new promClient.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity']
})

// Register all metrics
register.registerMetric(httpRequestDuration)
register.registerMetric(httpRequestTotal)
register.registerMetric(activeConnections)
register.registerMetric(databaseQueryDuration)
register.registerMetric(cacheHitRate)
register.registerMetric(agentExecutionDuration)
register.registerMetric(agentExecutionTotal)
register.registerMetric(jobDuration)
register.registerMetric(jobTotal)
register.registerMetric(memoryUsage)
register.registerMetric(errorTotal)

/**
 * Get Prometheus metrics in text format
 */
export async function getPrometheusMetrics(): Promise<string> {
  try {
    return await register.metrics()
  } catch (error: any) {
    logger.error('Failed to get Prometheus metrics:', error)
    return ''
  }
}

/**
 * Record HTTP request metrics
 */
export function recordHTTPRequest(
  method: string,
  route: string,
  status: number,
  duration: number
): void {
  try {
    httpRequestDuration.observe({ method, route, status: String(status) }, duration / 1000)
    httpRequestTotal.inc({ method, route, status: String(status) })
  } catch (error: any) {
    logger.error('Failed to record HTTP request metrics:', error)
  }
}

/**
 * Record database query metrics
 */
export function recordDatabaseQuery(operation: string, table: string, duration: number): void {
  try {
    databaseQueryDuration.observe({ operation, table }, duration / 1000)
  } catch (error: any) {
    logger.error('Failed to record database query metrics:', error)
  }
}

/**
 * Record agent execution metrics
 */
export function recordAgentExecution(
  agentType: string,
  status: string,
  duration: number
): void {
  try {
    agentExecutionDuration.observe({ agent_type: agentType, status }, duration / 1000)
    agentExecutionTotal.inc({ agent_type: agentType, status })
  } catch (error: any) {
    logger.error('Failed to record agent execution metrics:', error)
  }
}

/**
 * Record job metrics
 */
export function recordJob(jobType: string, status: string, duration: number): void {
  try {
    jobDuration.observe({ job_type: jobType, status }, duration / 1000)
    jobTotal.inc({ job_type: jobType, status })
  } catch (error: any) {
    logger.error('Failed to record job metrics:', error)
  }
}

/**
 * Update memory usage
 */
export function updateMemoryUsage(type: 'heap' | 'rss' | 'external', bytes: number): void {
  try {
    memoryUsage.set({ type }, bytes)
  } catch (error: any) {
    logger.error('Failed to update memory usage:', error)
  }
}

/**
 * Update cache hit rate
 */
export function updateCacheHitRate(rate: number): void {
  try {
    cacheHitRate.set(rate)
  } catch (error: any) {
    logger.error('Failed to update cache hit rate:', error)
  }
}

/**
 * Update active connections
 */
export function updateActiveConnections(count: number): void {
  try {
    activeConnections.set(count)
  } catch (error: any) {
    logger.error('Failed to update active connections:', error)
  }
}

/**
 * Record error
 */
export function recordError(type: string, severity: string): void {
  try {
    errorTotal.inc({ type, severity })
  } catch (error: any) {
    logger.error('Failed to record error:', error)
  }
}
