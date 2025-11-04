/**
 * Grafana Dashboard Configuration
 * Phase 3: Advanced Monitoring & Observability
 * Global-Ready Architecture
 */

export interface GrafanaDashboard {
  dashboard: {
    title: string
    tags: string[]
    timezone: string
    schemaVersion: number
    version: number
    refresh: string
    panels: any[]
    templating?: {
      list: any[]
    }
  }
}

/**
 * Generate Grafana dashboard configuration
 */
export function generateGrafanaDashboard(): GrafanaDashboard {
  return {
    dashboard: {
      title: 'Matrix Platform - Enterprise Dashboard',
      tags: ['matrix-platform', 'enterprise', 'monitoring'],
      timezone: 'browser',
      schemaVersion: 27,
      version: 1,
      refresh: '30s',
      panels: [
        // HTTP Requests Panel
        {
          id: 1,
          gridPos: { x: 0, y: 0, w: 12, h: 8 },
          type: 'graph',
          title: 'HTTP Requests',
          targets: [
            {
              expr: 'sum(rate(http_requests_total[5m])) by (method, status)',
              legendFormat: '{{method}} - {{status}}'
            }
          ],
          yaxes: [
            {
              format: 'short',
              label: 'Requests/sec'
            }
          ]
        },
        // Agent Executions Panel
        {
          id: 2,
          gridPos: { x: 12, y: 0, w: 12, h: 8 },
          type: 'graph',
          title: 'Agent Executions',
          targets: [
            {
              expr: 'sum(rate(agent_executions_total[5m])) by (agent_type, status)',
              legendFormat: '{{agent_type}} - {{status}}'
            }
          ],
          yaxes: [
            {
              format: 'short',
              label: 'Executions/sec'
            }
          ]
        },
        // Job Duration Panel
        {
          id: 3,
          gridPos: { x: 0, y: 8, w: 12, h: 8 },
          type: 'graph',
          title: 'Job Duration',
          targets: [
            {
              expr: 'histogram_quantile(0.95, sum(rate(job_duration_seconds_bucket[5m])) by (le, job_type))',
              legendFormat: 'P95 - {{job_type}}'
            }
          ],
          yaxes: [
            {
              format: 's',
              label: 'Duration'
            }
          ]
        },
        // Database Query Duration Panel
        {
          id: 4,
          gridPos: { x: 12, y: 8, w: 12, h: 8 },
          type: 'graph',
          title: 'Database Query Duration',
          targets: [
            {
              expr: 'histogram_quantile(0.95, sum(rate(database_query_duration_seconds_bucket[5m])) by (le, operation))',
              legendFormat: 'P95 - {{operation}}'
            }
          ],
          yaxes: [
            {
              format: 's',
              label: 'Duration'
            }
          ]
        },
        // Memory Usage Panel
        {
          id: 5,
          gridPos: { x: 0, y: 16, w: 12, h: 8 },
          type: 'graph',
          title: 'Memory Usage',
          targets: [
            {
              expr: 'memory_usage_bytes{type="heap"}',
              legendFormat: 'Heap'
            },
            {
              expr: 'memory_usage_bytes{type="rss"}',
              legendFormat: 'RSS'
            }
          ],
          yaxes: [
            {
              format: 'bytes',
              label: 'Memory'
            }
          ]
        },
        // Error Rate Panel
        {
          id: 6,
          gridPos: { x: 12, y: 16, w: 12, h: 8 },
          type: 'graph',
          title: 'Error Rate',
          targets: [
            {
              expr: 'sum(rate(errors_total[5m])) by (type, severity)',
              legendFormat: '{{type}} - {{severity}}'
            }
          ],
          yaxes: [
            {
              format: 'short',
              label: 'Errors/sec'
            }
          ]
        },
        // Cache Hit Rate Panel
        {
          id: 7,
          gridPos: { x: 0, y: 24, w: 12, h: 8 },
          type: 'graph',
          title: 'Cache Hit Rate',
          targets: [
            {
              expr: 'cache_hit_rate',
              legendFormat: 'Hit Rate'
            }
          ],
          yaxes: [
            {
              format: 'percentunit',
              label: 'Hit Rate',
              min: 0,
              max: 1
            }
          ]
        },
        // Active Connections Panel
        {
          id: 8,
          gridPos: { x: 12, y: 24, w: 12, h: 8 },
          type: 'graph',
          title: 'Active Connections',
          targets: [
            {
              expr: 'active_connections',
              legendFormat: 'Connections'
            }
          ],
          yaxes: [
            {
              format: 'short',
              label: 'Connections'
            }
          ]
        }
      ]
    }
  }
}

