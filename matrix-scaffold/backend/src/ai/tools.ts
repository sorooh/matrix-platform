/**
 * AI Tools System
 * Phase 2: Tool system for AI agents
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { db } from '../core/storage'
import { addMemory, searchMemory } from '../core/memory'
import { graph } from '../core/graph'
import { tasks } from '../core/tasks'
import { Nicholas } from '../core/nicholas'
import { AgentContext, AgentResponse } from './agents'

export interface Tool {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
  execute: (params: any, context: AgentContext) => Promise<any>
}

// Memory Tools
export const memoryTools: Tool[] = [
  {
    name: 'search_memory',
    description: 'Search project memory for relevant information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        topK: { type: 'number', description: 'Number of results', default: 5 }
      },
      required: ['query']
    },
    execute: async (params: any, context: AgentContext) => {
      try {
        const results = await searchMemory(context.projectId, params.query, params.topK || 5)
        return {
          success: true,
          results: results.map((r) => ({
            text: r.record.text,
            score: r.score,
            metadata: r.record.metadata
          }))
        }
      } catch (error: any) {
        logger.error('search_memory tool error:', error)
        return { success: false, error: error.message }
      }
    }
  },
  {
    name: 'add_memory',
    description: 'Add information to project memory',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Memory text' },
        metadata: { type: 'object', description: 'Additional metadata' }
      },
      required: ['text']
    },
    execute: async (params: any, context: AgentContext) => {
      try {
        const memory = await addMemory(context.projectId, params.text, params.metadata)
        return { success: true, id: memory.id }
      } catch (error: any) {
        logger.error('add_memory tool error:', error)
        return { success: false, error: error.message }
      }
    }
  }
]

// Graph Tools
export const graphTools: Tool[] = [
  {
    name: 'get_neighbors',
    description: 'Get graph neighbors of a node',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Node type (Project, Task, Job, etc.)' },
        id: { type: 'string', description: 'Node ID' }
      },
      required: ['type', 'id']
    },
    execute: async (params: any) => {
      try {
        const neighbors = await graph.neighbors(params.type, params.id)
        return { success: true, neighbors }
      } catch (error: any) {
        logger.error('get_neighbors tool error:', error)
        return { success: false, error: error.message }
      }
    }
  },
  {
    name: 'link_nodes',
    description: 'Create a link between two nodes in the graph',
    parameters: {
      type: 'object',
      properties: {
        fromType: { type: 'string', description: 'Source node type' },
        fromId: { type: 'string', description: 'Source node ID' },
        toType: { type: 'string', description: 'Target node type' },
        toId: { type: 'string', description: 'Target node ID' },
        rel: { type: 'string', description: 'Relationship type' }
      },
      required: ['fromType', 'fromId', 'toType', 'toId', 'rel']
    },
    execute: async (params: any) => {
      try {
        const edge = await graph.link(params.fromType, params.fromId, params.rel, params.toType, params.toId)
        return { success: true, edge }
      } catch (error: any) {
        logger.error('link_nodes tool error:', error)
        return { success: false, error: error.message }
      }
    }
  }
]

// Project Tools
export const projectTools: Tool[] = [
  {
    name: 'get_project_info',
    description: 'Get project information',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' }
      },
      required: ['projectId']
    },
    execute: async (params: any) => {
      try {
        const project = await db.getProject(params.projectId)
        if (!project) {
          return { success: false, error: 'Project not found' }
        }
        const jobs = await db.listJobs(params.projectId)
        const tasksList = tasks.list(params.projectId)
        return {
          success: true,
          project,
          jobs: jobs.length,
          tasks: tasksList.length
        }
      } catch (error: any) {
        logger.error('get_project_info tool error:', error)
        return { success: false, error: error.message }
      }
    }
  },
  {
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
            kind: { type: 'string' },
            command: { type: 'array', items: { type: 'string' } },
            image: { type: 'string' }
          }
        }
      },
      required: ['projectId', 'spec']
    },
    execute: async (params: any, context: AgentContext) => {
      try {
        const job = await Nicholas.scheduleJob(params.projectId, params.spec)
        return { success: true, jobId: job.id }
      } catch (error: any) {
        logger.error('schedule_job tool error:', error)
        return { success: false, error: error.message }
      }
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task for a project',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        type: {
          type: 'string',
          enum: ['analysis', 'architecture', 'coding', 'testing', 'visual'],
          description: 'Task type'
        }
      },
      required: ['projectId', 'type']
    },
    execute: async (params: any) => {
      try {
        const task = tasks.enqueue(params.projectId, params.type as any)
        return { success: true, taskId: task.id }
      } catch (error: any) {
        logger.error('create_task tool error:', error)
        return { success: false, error: error.message }
      }
    }
  }
]

// All Tools
export const allTools: Tool[] = [...memoryTools, ...graphTools, ...projectTools]

// Tool Registry
export const toolRegistry = {
  search_memory: memoryTools[0],
  add_memory: memoryTools[1],
  get_neighbors: graphTools[0],
  link_nodes: graphTools[1],
  get_project_info: projectTools[0],
  schedule_job: projectTools[1],
  create_task: projectTools[2]
}

// Tool Execution
export async function executeTool(
  toolName: string,
  params: any,
  context: AgentContext
): Promise<any> {
  const tool = toolRegistry[toolName as keyof typeof toolRegistry]
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`)
  }
  return await tool.execute(params, context)
}

// Tool Descriptions for AI
export function getToolDescriptions(): string {
  return allTools
    .map(
      (tool) =>
        `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(tool.parameters)}`
    )
    .join('\n')
}

