/**
 * Phase 10.2 - Nicholas Adaptive Governance
 * 
 * Dynamic governance based on AI consensus
 * - Each AI unit votes automatically on fundamental changes
 * - Governance becomes Council of AIs instead of central control
 * - First decentralized governance model for AI in history
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type ProposalType = 'code_change' | 'policy_change' | 'architecture_change' | 'feature_addition' | 'security_update'
export type VoteDecision = 'approve' | 'reject' | 'abstain'
export type ProposalStatus = 'draft' | 'voting' | 'approved' | 'rejected' | 'implemented'

export interface GovernanceProposal {
  id: string
  type: ProposalType
  title: string
  description: string
  proposedBy: string // AI ID
  status: ProposalStatus
  votes: Vote[]
  consensusThreshold: number // 0-100
  currentConsensus: number // 0-100
  createdAt: Date
  votingDeadline: Date
  implementedAt?: Date
}

export interface Vote {
  id: string
  proposalId: string
  voterId: string // AI ID
  decision: VoteDecision
  reasoning: string
  weight: number // 0-100 (AI reputation/importance)
  votedAt: Date
}

export interface AICouncilMember {
  id: string
  aiId: string
  name: string
  role: 'core' | 'specialist' | 'observer' | 'contributor'
  votingWeight: number // 0-100
  reputation: number // 0-100
  votesCount: number
  joinedAt: Date
  lastActive: Date
}

export interface GovernanceRule {
  id: string
  name: string
  description: string
  ruleType: 'permission' | 'behavior' | 'access' | 'data_usage' | 'consensus'
  definition: any
  approvedBy: string[] // AI IDs
  approvedAt: Date
  isActive: boolean
}

class NicholasAdaptiveGovernance {
  private proposals: Map<string, GovernanceProposal> = new Map()
  private votes: Map<string, Vote> = new Map()
  private council: Map<string, AICouncilMember> = new Map()
  private rules: Map<string, GovernanceRule> = new Map()

  async initialize() {
    logInfo('Initializing Nicholas Adaptive Governance...')

    // Initialize AI council
    await this.initializeAICouncil()

    logInfo('✅ Nicholas Adaptive Governance initialized')
  }

  // Initialize AI council
  private async initializeAICouncil(): Promise<void> {
    // Add Nicholas as core member
    const nicholasId = nanoid()
    const now = new Date()

    const nicholas: AICouncilMember = {
      id: nicholasId,
      aiId: 'nicholas_core',
      name: 'Nicholas Core',
      role: 'core',
      votingWeight: 100,
      reputation: 100,
      votesCount: 0,
      joinedAt: now,
      lastActive: now
    }

    this.council.set(nicholasId, nicholas)

    logInfo('✅ AI Council initialized with Nicholas Core')
  }

  // Create governance proposal
  async createProposal(
    type: ProposalType,
    title: string,
    description: string,
    proposedBy: string,
    consensusThreshold: number = 75
  ): Promise<GovernanceProposal> {
    try {
      const proposalId = nanoid()
      const now = new Date()
      const votingDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

      const proposal: GovernanceProposal = {
        id: proposalId,
        type,
        title,
        description,
        proposedBy,
        status: 'voting',
        votes: [],
        consensusThreshold,
        currentConsensus: 0,
        createdAt: now,
        votingDeadline
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.governanceProposal.create({
          data: {
            id: proposalId,
            type,
            title,
            description,
            proposedBy,
            status: 'voting',
            consensusThreshold,
            currentConsensus: 0,
            createdAt: now,
            votingDeadline
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create proposal in database' })
      }

      this.proposals.set(proposalId, proposal)

      // Notify all council members
      await this.notifyCouncilMembers(proposalId)

      logInfo(`✅ Created governance proposal ${proposalId}: ${title}`)

      return proposal
    } catch (error) {
      logError(error as Error, { context: 'Create proposal' })
      throw error
    }
  }

  // Cast vote
  async castVote(
    proposalId: string,
    voterId: string,
    decision: VoteDecision,
    reasoning: string = ''
  ): Promise<Vote> {
    try {
      const proposal = this.proposals.get(proposalId)
      if (!proposal) throw new Error('Proposal not found')
      if (proposal.status !== 'voting') throw new Error('Proposal not in voting phase')

      // Check if already voted
      const existingVote = Array.from(this.votes.values()).find(
        v => v.proposalId === proposalId && v.voterId === voterId
      )
      if (existingVote) throw new Error('Already voted')

      // Get voter weight
      const councilMember = Array.from(this.council.values()).find(m => m.aiId === voterId)
      const weight = councilMember?.votingWeight || 50

      const voteId = nanoid()
      const now = new Date()

      const vote: Vote = {
        id: voteId,
        proposalId,
        voterId,
        decision,
        reasoning,
        weight,
        votedAt: now
      }

      // Add vote to proposal
      proposal.votes.push(vote)

      // Calculate consensus
      proposal.currentConsensus = await this.calculateConsensus(proposal)

      // Check if consensus reached
      if (proposal.currentConsensus >= proposal.consensusThreshold) {
        proposal.status = 'approved'
        await this.implementProposal(proposalId)
      }

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.vote.create({
          data: {
            id: voteId,
            proposalId,
            voterId,
            decision,
            reasoning,
            weight,
            votedAt: now
          })
      } catch (error) {
        logError(error as Error, { context: 'Cast vote in database' })
      }

      this.votes.set(voteId, vote)
      this.proposals.set(proposalId, proposal)

      logInfo(`✅ Cast vote ${voteId} on proposal ${proposalId}: ${decision}`)

      return vote
    } catch (error) {
      logError(error as Error, { context: 'Cast vote' })
      throw error
    }
  }

  // Calculate consensus
  private async calculateConsensus(proposal: GovernanceProposal): Promise<number> {
    if (proposal.votes.length === 0) return 0

    let totalWeight = 0
    let approveWeight = 0

    for (const vote of proposal.votes) {
      totalWeight += vote.weight
      if (vote.decision === 'approve') {
        approveWeight += vote.weight
      }
    }

    return totalWeight > 0 ? (approveWeight / totalWeight) * 100 : 0
  }

  // Implement proposal
  private async implementProposal(proposalId: string): Promise<void> {
    try {
      const proposal = this.proposals.get(proposalId)
      if (!proposal) return

      proposal.status = 'implemented'
      proposal.implementedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.governanceProposal.update({
          where: { id: proposalId },
          data: {
            status: 'implemented',
            currentConsensus: proposal.currentConsensus,
            implementedAt: proposal.implementedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Implement proposal in database' })
      }

      this.proposals.set(proposalId, proposal)

      logInfo(`✅ Implemented proposal ${proposalId}: ${proposal.title}`)
    } catch (error) {
      logError(error as Error, { context: 'Implement proposal' })
    }
  }

  // Notify council members
  private async notifyCouncilMembers(proposalId: string): Promise<void> {
    // In production, send notifications to all AI council members
    logInfo(`✅ Notified council members about proposal ${proposalId}`)
  }

  // Add council member
  async addCouncilMember(
    aiId: string,
    name: string,
    role: 'core' | 'specialist' | 'observer' | 'contributor',
    votingWeight: number = 50
  ): Promise<AICouncilMember> {
    try {
      const memberId = nanoid()
      const now = new Date()

      const member: AICouncilMember = {
        id: memberId,
        aiId,
        name,
        role,
        votingWeight,
        reputation: 50,
        votesCount: 0,
        joinedAt: now,
        lastActive: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.aICouncilMember.create({
          data: {
            id: memberId,
            aiId,
            name,
            role,
            votingWeight,
            reputation: 50,
            votesCount: 0,
            joinedAt: now,
            lastActive: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Add council member in database' })
      }

      this.council.set(memberId, member)

      logInfo(`✅ Added council member ${memberId}: ${name} (${role})`)

      return member
    } catch (error) {
      logError(error as Error, { context: 'Add council member' })
      throw error
    }
  }

  // Get proposals
  async getProposals(status?: ProposalStatus): Promise<GovernanceProposal[]> {
    const proposals: GovernanceProposal[] = []
    for (const proposal of this.proposals.values()) {
      if (status && proposal.status !== status) continue
      proposals.push(proposal)
    }
    return proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get council members
  async getCouncilMembers(): Promise<AICouncilMember[]> {
    return Array.from(this.council.values()).sort((a, b) => b.votingWeight - a.votingWeight)
  }
}

export const nicholasAdaptiveGovernance = new NicholasAdaptiveGovernance()

