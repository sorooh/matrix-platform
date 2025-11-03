import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export type NodeType = 'Project' | 'Task' | 'Job' | 'Artifact' | 'Memory'

export interface Edge {
  id: string
  from: { type: NodeType; id: string }
  to: { type: NodeType; id: string }
  rel: string
  createdAt: string
}

function dbDir() {
  const d = join(__dirname, '..', '..', 'storage', 'db')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

function graphPath() {
  return join(dbDir(), 'graph.json')
}

function readEdges(): Edge[] {
  const p = graphPath()
  if (!existsSync(p)) return []
  try {
    const raw = readFileSync(p, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? (data as Edge[]) : []
  } catch {
    return []
  }
}

function writeEdges(list: Edge[]) {
  writeFileSync(graphPath(), JSON.stringify(list), 'utf8')
}

export const graph = {
  link(fromType: NodeType, fromId: string, rel: string, toType: NodeType, toId: string): Edge {
    const now = new Date().toISOString()
    const e: Edge = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, from: { type: fromType, id: fromId }, to: { type: toType, id: toId }, rel, createdAt: now }
    const all = readEdges()
    all.push(e)
    writeEdges(all)
    return e
  },
  neighbors(type: NodeType, id: string): Edge[] {
    const all = readEdges()
    return all.filter((e) => (e.from.type === type && e.from.id === id) || (e.to.type === type && e.to.id === id))
  }
}


