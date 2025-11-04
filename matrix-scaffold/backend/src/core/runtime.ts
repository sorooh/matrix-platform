import { spawn } from 'child_process'
import { eventBus } from './eventBus'
import { Job } from './schema'

function hasDocker(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn('docker', ['--version'])
    p.on('error', () => resolve(false))
    p.on('exit', (code) => resolve(code === 0))
  })
}

export async function runJob(job: Job): Promise<number> {
  const useDocker = await hasDocker()
  eventBus.publish('job.running', { id: job.id, projectId: job.projectId })

  if (useDocker) {
    const image = job.spec.image || 'node:18-bullseye-slim'
    const cmd = job.spec.command && job.spec.command.length > 0 ? job.spec.command : ['node', '-e', "console.log('hello from job')"]
    const args = ['run', '--rm']
    // lightweight cpu/mem defaults; can be extended later
    args.push('--cpus', '0.5', '--memory', '512m')
    // working dir and command
    args.push(image)
    const child = spawn('docker', args.concat(cmd), { env: { ...process.env, ...(job.spec.env || {}) } })
    child.stdout.on('data', (d) => eventBus.publish('job.log', { id: job.id, stream: 'stdout', chunk: String(d) }))
    child.stderr.on('data', (d) => eventBus.publish('job.log', { id: job.id, stream: 'stderr', chunk: String(d) }))
    return new Promise((resolve) => {
      child.on('exit', (code) => resolve(code ?? 1))
    })
  }

  // Fallback: run on host for phase 0
  const hostCmd = job.spec.command && job.spec.command.length > 0 ? job.spec.command[0] : process.execPath
  const hostArgs = job.spec.command && job.spec.command.length > 1 ? job.spec.command.slice(1) : ['-e', "console.log('hello from host job')"]
  const proc = spawn(hostCmd, hostArgs, { env: { ...process.env, ...(job.spec.env || {}) } })
  proc.stdout.on('data', (d) => eventBus.publish('job.log', { id: job.id, stream: 'stdout', chunk: String(d) }))
  proc.stderr.on('data', (d) => eventBus.publish('job.log', { id: job.id, stream: 'stderr', chunk: String(d) }))
  return new Promise((resolve) => proc.on('exit', (code) => resolve(code ?? 1)))
}


