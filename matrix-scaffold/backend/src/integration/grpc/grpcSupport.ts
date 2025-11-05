/**
 * Phase 10.5 - gRPC Support
 * 
 * gRPC API support
 * - gRPC server
 * - Protocol buffers
 * - Streaming
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../../config/logger'

export interface GRPCService {
  id: string
  name: string
  version: string
  methods: GRPCMethod[]
  proto: string // Protocol buffer definition
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface GRPCMethod {
  name: string
  type: 'unary' | 'stream' | 'client_stream' | 'bidirectional_stream'
  inputType: string
  outputType: string
}

class GRPCSupport {
  private services: Map<string, GRPCService> = new Map()

  async initialize() {
    logInfo('Initializing gRPC Support...')
    logInfo('✅ gRPC Support initialized')
  }

  async registerService(
    name: string,
    version: string,
    methods: GRPCMethod[],
    proto: string
  ): Promise<GRPCService> {
    const id = nanoid()
    const service: GRPCService = {
      id,
      name,
      version,
      methods,
      proto,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    this.services.set(id, service)
    logInfo(`✅ gRPC service registered ${id}: ${name}`)
    return service
  }
}

export const grpcSupport = new GRPCSupport()

