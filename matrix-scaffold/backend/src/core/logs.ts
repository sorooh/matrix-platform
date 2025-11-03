import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

function logsDir() {
  const d = join(__dirname, '..', '..', 'storage', 'logs')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

const buffers = new Map<string, string[]>()

export function appendLog(jobId: string, line: string) {
  const arr = buffers.get(jobId) || []
  arr.push(line)
  if (arr.length > 2000) arr.splice(0, arr.length - 2000) // cap in-memory
  buffers.set(jobId, arr)
}

export function flushLogs(jobId: string): { path: string; text: string } {
  const arr = buffers.get(jobId) || []
  const text = arr.join('')
  const p = join(logsDir(), `${jobId}.log`)
  writeFileSync(p, text, 'utf8')
  buffers.delete(jobId)
  return { path: p, text }
}


