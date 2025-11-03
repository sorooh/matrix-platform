import { EventEmitter } from 'events'
import { EventPayload } from './schema'

type SseClient = { id: string; write: (chunk: string) => void; close?: () => void }

class EventBus {
  private emitter = new EventEmitter()
  private clients: SseClient[] = []

  publish<T = any>(type: string, data: T) {
    const payload: EventPayload<T> = { type, data, ts: Date.now() }
    this.emitter.emit('event', payload)
    const chunk = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
    for (const c of this.clients) {
      try { c.write(chunk) } catch {}
    }
  }

  on(cb: (e: EventPayload) => void) {
    this.emitter.on('event', cb)
  }

  attachClient(client: SseClient) {
    this.clients.push(client)
    const heartbeat = setInterval(() => {
      try { client.write(': keep-alive\n\n') } catch {}
    }, 15000)
    return () => {
      clearInterval(heartbeat)
      const idx = this.clients.indexOf(client)
      if (idx >= 0) this.clients.splice(idx, 1)
      try { client.close && client.close() } catch {}
    }
  }
}

export const eventBus = new EventBus()


