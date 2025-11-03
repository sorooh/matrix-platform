import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

const execP = promisify(exec)

export type RunnerOptions = {
  cpus?: number | string
  memory?: string
  timeoutMs?: number
}

/**
 * Start a per-job Docker runner that mounts the `matrix-scaffold` workspace
 * into the container and runs the bundled worker there. This is a lightweight
 * prototype: it relies on the host `docker` CLI and the `node:18-bullseye-slim`
 * image. The worker inside the container will pick up the job from the queue
 * (we mount the workspace so the queue/meta dirs are visible).
 */
export async function startJob(id: string, app: string, opts: RunnerOptions = {}): Promise<void> {
  // basic checks
  try {
    await execP('docker --version')
  } catch (e) {
    throw new Error('docker CLI not available on host')
  }

  const matrixDir = join(__dirname, '..', '..') // points to matrix-scaffold
  if (!existsSync(matrixDir)) {
    throw new Error(`matrix-scaffold directory not found at ${matrixDir}`)
  }

  const cpus = opts.cpus || 0.5
  const memory = opts.memory || '512m'
  const timeoutMs = opts.timeoutMs || 5 * 60 * 1000 // 5 minutes default

  // Build the docker run command. We keep it simple: install backend deps then run worker.
  const name = `matrix-runner-${id}`.replace(/[^a-zA-Z0-9_.-]/g, '')
  const cmd = [
    'docker', 'run', '--rm', '--name', name,
    '-v', `${matrixDir}:/work`,
    '-w', '/work',
    '--cpus', String(cpus),
    '--memory', String(memory),
    'node:18-bullseye-slim',
    'sh', '-c', "npm --prefix ./backend ci --production --no-audit --no-fund && node worker/worker.js"
  ].map((s) => (typeof s === 'string' && s.includes(' ') ? s : s)).join(' ')

  // execute with timeout
  return new Promise<void>((resolve, reject) => {
    const proc = exec(cmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`runner failed: ${String(err)}\n${stderr || ''}`))
      }
      return resolve()
    })
    // forward logs to stdout for visibility
    if (proc.stdout) proc.stdout.pipe(process.stdout)
    if (proc.stderr) proc.stderr.pipe(process.stderr)
  })
}
