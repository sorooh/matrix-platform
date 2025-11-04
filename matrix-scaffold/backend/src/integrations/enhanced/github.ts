/**
 * Enhanced GitHub Integration
 * Phase 2: Integration Hub - Enhanced GitHub integration
 * Global-Ready Architecture
 */

import { Octokit } from '@octokit/rest'
import { logger } from '../../config/logger'
import { config } from '../../config/app'

// Enhanced GitHub client
let octokit: Octokit | null = null

function getGitHubClient(): Octokit | null {
  if (!config.integrations.github.token) {
    logger.warn('GitHub token not configured')
    return null
  }

  if (!octokit) {
    octokit = new Octokit({
      auth: config.integrations.github.token
    })
  }

  return octokit
}

export async function createIssue(
  title: string,
  body: string,
  labels?: string[]
): Promise<{ success: boolean; issueNumber?: number; error?: string }> {
  try {
    const client = getGitHubClient()
    if (!client) {
      return { success: false, error: 'GitHub not configured' }
    }

    const owner = config.integrations.github.owner
    const repo = config.integrations.github.repo

    if (!owner || !repo) {
      return { success: false, error: 'GitHub owner/repo not configured' }
    }

    const response = await client.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels: labels || []
    })

    logger.info(`GitHub issue created: ${response.data.number}`, {
      issueNumber: response.data.number,
      title
    })

    return {
      success: true,
      issueNumber: response.data.number
    }
  } catch (error: any) {
    logger.error('GitHub createIssue error:', error)
    return { success: false, error: error.message }
  }
}

export async function createPullRequest(
  title: string,
  body: string,
  head: string,
  base: string = 'main'
): Promise<{ success: boolean; prNumber?: number; error?: string }> {
  try {
    const client = getGitHubClient()
    if (!client) {
      return { success: false, error: 'GitHub not configured' }
    }

    const owner = config.integrations.github.owner
    const repo = config.integrations.github.repo

    if (!owner || !repo) {
      return { success: false, error: 'GitHub owner/repo not configured' }
    }

    const response = await client.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base
    })

    logger.info(`GitHub PR created: ${response.data.number}`, {
      prNumber: response.data.number,
      title
    })

    return {
      success: true,
      prNumber: response.data.number
    }
  } catch (error: any) {
    logger.error('GitHub createPullRequest error:', error)
    return { success: false, error: error.message }
  }
}

export async function getRepositoryInfo(): Promise<{
  success: boolean
  info?: any
  error?: string
}> {
  try {
    const client = getGitHubClient()
    if (!client) {
      return { success: false, error: 'GitHub not configured' }
    }

    const owner = config.integrations.github.owner
    const repo = config.integrations.github.repo

    if (!owner || !repo) {
      return { success: false, error: 'GitHub owner/repo not configured' }
    }

    const response = await client.rest.repos.get({
      owner,
      repo
    })

    return {
      success: true,
      info: {
        name: response.data.name,
        description: response.data.description,
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        language: response.data.language,
        updatedAt: response.data.updated_at
      }
    }
  } catch (error: any) {
    logger.error('GitHub getRepositoryInfo error:', error)
    return { success: false, error: error.message }
  }
}
