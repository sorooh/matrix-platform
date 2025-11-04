/**
 * Enhanced GitHub Integration
 * Global-Ready Architecture with improved GitHub integration
 */

import { logger } from '../../config/logger'
import { config } from '../../config/app'
import { createIssueComment } from '../github'

export interface GitHubIssueComment {
  owner: string
  repo: string
  issueNumber: number
  body: string
}

export interface GitHubPRComment {
  owner: string
  repo: string
  pullNumber: number
  body: string
}

export async function createGitHubIssueComment(comment: GitHubIssueComment): Promise<boolean> {
  if (!config.features.enableGitHub || !config.integrations.github.token) {
    logger.debug('GitHub integration disabled or token not configured')
    return false
  }

  try {
    const result = await createIssueComment({
      owner: comment.owner,
      repo: comment.repo,
      issueNumber: comment.issueNumber,
      body: comment.body
    })

    logger.info('GitHub issue comment created', {
      owner: comment.owner,
      repo: comment.repo,
      issueNumber: comment.issueNumber
    })

    return true
  } catch (error: any) {
    logger.error('Failed to create GitHub issue comment:', error)
    return false
  }
}

export async function createGitHubPRComment(comment: GitHubPRComment): Promise<boolean> {
  // Use issue comment API for PR comments (GitHub treats PRs as issues)
  return createGitHubIssueComment({
    owner: comment.owner,
    repo: comment.repo,
    issueNumber: comment.pullNumber,
    body: comment.body
  })
}

export async function getGitHubPR(owner: string, repo: string, pullNumber: number): Promise<any> {
  if (!config.features.enableGitHub || !config.integrations.github.token) {
    throw new Error('GitHub integration not configured')
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, {
      headers: {
        Authorization: `Bearer ${config.integrations.github.token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error: any) {
    logger.error('Failed to get GitHub PR:', error)
    throw error
  }
}

