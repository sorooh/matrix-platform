/**
 * Phase 10.2 - Collective Sync Protocol (CSP)
 * 
 * Unified knowledge exchange protocol between Matrix and external AI systems
 * - Encrypted Knowledge Exchange Channels (EKEC)
 * - Secure data, algorithm, and experience sharing
 * - No exposure of sensitive information
 */

import { nanoid } from 'nanoid'
import crypto from 'crypto'
import { logger, logError, logInfo } from '../config/logger'

export type SyncNodeType = 'matrix_core' | 'external_ai' | 'private_instance' | 'partner_system'
export type SyncStatus = 'pending' | 'connected' | 'syncing' | 'error' | 'disconnected'
export type KnowledgeType = 'data' | 'algorithm' | 'experience' | 'model' | 'pattern' | 'insight'
export type EncryptionLevel = 'none' | 'standard' | 'high' | 'maximum'

export interface SyncNode {
  id: string
  type: SyncNodeType
  name: string
  endpoint: string
  publicKey: string
  encryptionLevel: EncryptionLevel
  capabilities: string[]
  status: SyncStatus
  lastSync: Date
  syncCount: number
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgePacket {
  id: string
  sourceNodeId: string
  targetNodeId: string
  type: KnowledgeType
  content: {
    encrypted: boolean
    data: any
    hash: string
  }
  metadata: {
    timestamp: Date
    version: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    tags: string[]
  }
  exchangedAt: Date
}

export interface ExchangeChannel {
  id: string
  nodeAId: string
  nodeBId: string
  encryptionLevel: EncryptionLevel
  sharedKey?: string
  status: 'active' | 'paused' | 'closed'
  packetsExchanged: number
  lastExchange: Date
  createdAt: Date
}

class CollectiveSyncProtocol {
  private nodes: Map<string, SyncNode> = new Map()
  private channels: Map<string, ExchangeChannel> = new Map()
  private packets: Map<string, KnowledgePacket> = new Map()
  private encryptionKeys: Map<string, crypto.KeyObject> = new Map()

  async initialize() {
    logInfo('Initializing Collective Sync Protocol (CSP)...')

    // Initialize encryption keys
    await this.initializeEncryption()

    logInfo('✅ Collective Sync Protocol (CSP) initialized')
  }

  // Initialize encryption
  private async initializeEncryption(): Promise<void> {
    // Generate encryption keys for EKEC
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    })

    // Store keys
    this.encryptionKeys.set('matrix_core', crypto.createPrivateKey(privateKey))

    logInfo('✅ Encryption keys initialized')
  }

  // Register sync node
  async registerSyncNode(
    type: SyncNodeType,
    name: string,
    endpoint: string,
    publicKey: string,
    encryptionLevel: EncryptionLevel = 'standard',
    capabilities: string[] = []
  ): Promise<SyncNode> {
    try {
      const nodeId = nanoid()
      const now = new Date()

      const node: SyncNode = {
        id: nodeId,
        type,
        name,
        endpoint,
        publicKey,
        encryptionLevel,
        capabilities,
        status: 'pending',
        lastSync: now,
        syncCount: 0,
        metadata: {},
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.syncNode.create({
          data: {
            id: nodeId,
            type,
            name,
            endpoint,
            publicKey,
            encryptionLevel,
            capabilities,
            status: 'pending',
            lastSync: now,
            syncCount: 0,
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Register sync node in database' })
      }

      this.nodes.set(nodeId, node)

      logInfo(`✅ Registered sync node ${nodeId}: ${name} (${type})`)

      return node
    } catch (error) {
      logError(error as Error, { context: 'Register sync node' })
      throw error
    }
  }

  // Create exchange channel
  async createExchangeChannel(
    nodeAId: string,
    nodeBId: string,
    encryptionLevel: EncryptionLevel = 'standard'
  ): Promise<ExchangeChannel> {
    try {
      const channelId = nanoid()
      const now = new Date()

      // Generate shared key if encryption is enabled
      let sharedKey: string | undefined
      if (encryptionLevel !== 'none') {
        sharedKey = crypto.randomBytes(32).toString('hex')
      }

      const channel: ExchangeChannel = {
        id: channelId,
        nodeAId,
        nodeBId,
        encryptionLevel,
        sharedKey,
        status: 'active',
        packetsExchanged: 0,
        lastExchange: now,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.exchangeChannel.create({
          data: {
            id: channelId,
            nodeAId,
            nodeBId,
            encryptionLevel,
            sharedKey: sharedKey || null,
            status: 'active',
            packetsExchanged: 0,
            lastExchange: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create exchange channel in database' })
      }

      this.channels.set(channelId, channel)

      logInfo(`✅ Created exchange channel ${channelId} between ${nodeAId} and ${nodeBId}`)

      return channel
    } catch (error) {
      logError(error as Error, { context: 'Create exchange channel' })
      throw error
    }
  }

  // Exchange knowledge packet
  async exchangeKnowledgePacket(
    sourceNodeId: string,
    targetNodeId: string,
    type: KnowledgeType,
    data: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    tags: string[] = []
  ): Promise<KnowledgePacket> {
    try {
      const packetId = nanoid()
      const now = new Date()

      // Find or create exchange channel
      let channel = Array.from(this.channels.values()).find(
        c => (c.nodeAId === sourceNodeId && c.nodeBId === targetNodeId) ||
             (c.nodeAId === targetNodeId && c.nodeBId === sourceNodeId)
      )

      if (!channel) {
        const sourceNode = this.nodes.get(sourceNodeId)
        const targetNode = this.nodes.get(targetNodeId)
        if (!sourceNode || !targetNode) throw new Error('Nodes not found')

        channel = await this.createExchangeChannel(
          sourceNodeId,
          targetNodeId,
          sourceNode.encryptionLevel
        )
      }

      // Encrypt data if needed
      const encrypted = channel.encryptionLevel !== 'none'
      let encryptedData = data
      let hash = ''

      if (encrypted && channel.sharedKey) {
        const cipher = crypto.createCipher('aes-256-cbc', channel.sharedKey)
        encryptedData = cipher.update(JSON.stringify(data), 'utf8', 'hex') + cipher.final('hex')
      }

      // Generate hash
      hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')

      const packet: KnowledgePacket = {
        id: packetId,
        sourceNodeId,
        targetNodeId,
        type,
        content: {
          encrypted,
          data: encryptedData,
          hash
        },
        metadata: {
          timestamp: now,
          version: '1.0.0',
          priority,
          tags
        },
        exchangedAt: now
      }

      // Update channel
      channel.packetsExchanged++
      channel.lastExchange = now
      this.channels.set(channel.id, channel)

      // Update source node
      const sourceNode = this.nodes.get(sourceNodeId)
      if (sourceNode) {
        sourceNode.lastSync = now
        sourceNode.syncCount++
        this.nodes.set(sourceNodeId, sourceNode)
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.knowledgePacket.create({
          data: {
            id: packetId,
            sourceNodeId,
            targetNodeId,
            type,
            content: packet.content,
            metadata: packet.metadata,
            exchangedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Exchange knowledge packet in database' })
      }

      this.packets.set(packetId, packet)

      logInfo(`✅ Exchanged knowledge packet ${packetId}: ${type} from ${sourceNodeId} to ${targetNodeId}`)

      return packet
    } catch (error) {
      logError(error as Error, { context: 'Exchange knowledge packet' })
      throw error
    }
  }

  // Decrypt knowledge packet
  async decryptKnowledgePacket(
    packetId: string,
    channelId: string
  ): Promise<any> {
    try {
      const packet = this.packets.get(packetId)
      if (!packet) throw new Error('Packet not found')

      const channel = this.channels.get(channelId)
      if (!channel) throw new Error('Channel not found')

      if (!packet.content.encrypted) {
        return packet.content.data
      }

      if (!channel.sharedKey) {
        throw new Error('Shared key not available')
      }

      // Decrypt data
      const decipher = crypto.createDecipher('aes-256-cbc', channel.sharedKey)
      const decrypted = decipher.update(packet.content.data, 'hex', 'utf8') + decipher.final('utf8')

      // Verify hash
      const hash = crypto.createHash('sha256').update(decrypted).digest('hex')
      if (hash !== packet.content.hash) {
        throw new Error('Hash verification failed')
      }

      return JSON.parse(decrypted)
    } catch (error) {
      logError(error as Error, { context: 'Decrypt knowledge packet' })
      throw error
    }
  }

  // Get sync nodes
  async getSyncNodes(type?: SyncNodeType, status?: SyncStatus): Promise<SyncNode[]> {
    const nodes: SyncNode[] = []
    for (const node of this.nodes.values()) {
      if (type && node.type !== type) continue
      if (status && node.status !== status) continue
      nodes.push(node)
    }
    return nodes.sort((a, b) => b.lastSync.getTime() - a.lastSync.getTime())
  }

  // Get channels
  async getChannels(nodeId?: string): Promise<ExchangeChannel[]> {
    const channels: ExchangeChannel[] = []
    for (const channel of this.channels.values()) {
      if (nodeId && channel.nodeAId !== nodeId && channel.nodeBId !== nodeId) continue
      channels.push(channel)
    }
    return channels.sort((a, b) => b.lastExchange.getTime() - a.lastExchange.getTime())
  }

  // Get packets
  async getPackets(sourceNodeId?: string, targetNodeId?: string, type?: KnowledgeType): Promise<KnowledgePacket[]> {
    const packets: KnowledgePacket[] = []
    for (const packet of this.packets.values()) {
      if (sourceNodeId && packet.sourceNodeId !== sourceNodeId) continue
      if (targetNodeId && packet.targetNodeId !== targetNodeId) continue
      if (type && packet.type !== type) continue
      packets.push(packet)
    }
    return packets.sort((a, b) => b.exchangedAt.getTime() - a.exchangedAt.getTime())
  }
}

export const collectiveSyncProtocol = new CollectiveSyncProtocol()

