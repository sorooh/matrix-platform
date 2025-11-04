/**
 * AI Tools System
 * Global-Ready Architecture with tool system for AI agents
 */

import { logger } from '../../config/logger'
import { db } from '../../core/storage'
import { searchMemory } from '../../core/memory'
import { graph } from '../../core/graph'
import { Nicholas } from '../../core/nicholas'
import { kpis } from '../../core/suig'

export interface Tool {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
  execute: (params: any) => Promise<any>
}

// List Projects Tool
export const listProjectsTool: Tool = {
  name: 'list_projects',
  description: 'List all projects in the system',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  async execute(params: any) {
    try {
      const projects = await db.listProjects()
      return {
        success: true,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          createdAt: p.createdAt
        }))
      }
    } catch (error: any) {
      logger.error('list_projects tool failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// Create Project Tool
export const createProjectTool: Tool = {
  name: 'create_project',
  description: 'Create a new project',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Project name' },
      description: { type: 'string', description: 'Project description' }
    },
    required: ['name']
  },
  async execute(params: any) {
    try {
      const project = await Nicholas.createProject(params.name, params.description)
      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description
        }
      }
    } catch (error: any) {
      logger.error('create_project tool failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// Search Memory Tool
export const searchMemoryTool: Tool = {
  name: 'search_memory',
  description: 'Search project memory for relevant information',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      query: { type: 'string', description: 'Search query' },
      topK: { type: 'number', description: 'Number of results (default: 5)' }
    },
    required: ['projectId', 'query']
  },
  async execute(params: any) {
    try {
      const results = await searchMemory(params.projectId, params.query, params.topK || 5)
      return {
        success: true,
        results: results.map((r) => ({
          score: r.score,
          text: r.record.text,
          metadata: r.record.metadata
        }))
      }
    } catch (error: any) {
      logger.error('search_memory tool failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// Get KPIs Tool
export const getKPIsTool: Tool = {
  name: 'get_kpis',
  description: 'Get system KPIs and metrics',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  async execute(params: any) {
    try {
      const kpiData = await kpis()
      return {
        success: true,
        kpis: kpiData
      }
    } catch (error: any) {
      logger.error('get_kpis tool failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// Schedule Job Tool
export const scheduleJobTool: Tool = {
  name: 'schedule_job',
  description: 'Schedule a job for a project',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      spec: {
        type: 'object',
        description: 'Job specification',
        properties: {
          kind: { type: 'string', description: 'Job kind (e.g., script, build)' },
          image: { type: 'string', description: 'Docker image' },
          command: { type: 'array', description: 'Command to run' }
        }
      }
    },
    required: ['projectId', 'spec']
  },
  async execute(params: any) {
    try {
      const job = await Nicholas.scheduleJob(params.projectId, params.spec)
      return {
        success: true,
        job: {
          id: job.id,
          status: job.status,
          projectId: job.projectId
        }
      }
    } catch (error: any) {
      logger.error('schedule_job tool failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// Get Graph Neighbors Tool
export const getGraphNeighborsTool: Tool = {
  name: 'get_graph_neighbors',
  description: 'Get graph neighbors for a node',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', description: 'Node type (Project, Job, Task, etc.)' },
      id: { type: 'string', description: 'Node ID' }
    },
    required: ['type', 'id']
  },
  async execute(params: any) {
    try {
      const neighbors = await graph.neighbors(params.type, params.id)
      return {
        success: true,
        neighbors: neighbors.map((n) => ({
          id: n.id,
          from: n.from,
          to: n.to,
          rel: n.rel
        }))
      }
    } catch (error: any) {
      logger.error('get_graph_neighbors tool failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// All available tools
export const availableTools: Tool[] = [
  listProjectsTool,
  createProjectTool,
  searchMemoryTool,
  getKPIsTool,
  scheduleJobTool,
  getGraphNeighborsTool
]

// Tool registry
export const toolRegistry: Map<string, Tool> = new Map(
  availableTools.map((tool) => [tool.name, tool])
)

// Get tool by name
export function getTool(name: string): Tool | undefined {
  return toolRegistry.get(name)
}

// Get tools for OpenAI format
export function getToolsForOpenAI(): any[] {
  return availableTools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))
}

