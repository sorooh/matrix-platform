import React, { useEffect, useState } from 'react'

type AppEntry = { slug: string; name: string; description?: string }

export default function App() {
  const [apps, setApps] = useState<AppEntry[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<Array<any>>([])
  const [agentMessages, setAgentMessages] = useState<Array<{from:'user'|'agent'; text:string}>>([])
  const [agentInput, setAgentInput] = useState('')

  useEffect(() => {
    fetch('/api/apps')
      .then((r) => r.json())
      .then(setApps)
      .catch(() => setApps([]))
  }, [])

  const run = async (slug: string) => {
    const res = await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ app: slug }) })
    const data = await res.json()
    setJobId(data.id)
    setSelected(slug)
    // frontend will listen to SSE for updates
  }

  // SSE listener for job events
  useEffect(() => {
    const es = new EventSource('/events')
    let closed = false
    es.addEventListener('open', () => {
      // connection opened
    })
    es.addEventListener('job.running', (e: any) => {
      try {
        const d = JSON.parse(e.data)
        if (d && d.id === jobId) {
          setJobStatus('running')
        }
      } catch (err) {}
    })
    es.addEventListener('job.completed', (e: any) => {
      try {
        const d = JSON.parse(e.data)
        if (d && d.id === jobId) {
          setJobStatus('completed')
          // load snapshots for the app
          fetch(`/api/snapshot/${d.app}`).then((r) => r.json()).then(setSnapshots).catch(() => setSnapshots([]))
          // ensure preview updates
          setTimeout(() => {
            // reload iframe by toggling selected
            setSelected((s) => (s ? null : d.app))
            setTimeout(() => setSelected(d.app), 50)
          }, 120)
        }
      } catch (err) {}
    })
    return () => es.close()
  }, [jobId])

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 16 }}>
      <h1>Matrix Dashboard (MVP)</h1>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 320 }}>
          <h2>Apps</h2>
          <ul>
            {apps.map((a) => (
              <li key={a.slug} style={{ marginBottom: 8 }}>
                <strong>{a.name}</strong>
                <div style={{ fontSize: 12 }}>{a.description}</div>
                <button onClick={() => run(a.slug)} style={{ marginTop: 6 }}>Run</button>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 12 }}>
            <h3>Agent Chat</h3>
            <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
              {agentMessages.map((m, i) => (
                <div key={i} style={{ marginBottom: 6 }}><strong>{m.from}:</strong> {m.text}</div>
              ))}
            </div>
            <div style={{ marginTop: 6 }}>
              <input value={agentInput} onChange={(e) => setAgentInput(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              <button style={{ marginTop: 6 }} onClick={async () => {
                if (!agentInput) return
                setAgentMessages((s) => [...s, { from: 'user', text: agentInput }])
                try {
                  const r = await fetch('/api/agents/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: agentInput }) })
                  const d = await r.json()
                  setAgentMessages((s) => [...s, { from: 'agent', text: d.reply }])
                  setAgentInput('')
                } catch (err) {
                  setAgentMessages((s) => [...s, { from: 'agent', text: 'Error contacting agent' }])
                }
              }}>Send</button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h2>Preview</h2>
          {selected ? (
            <iframe key={selected} src={`/apps/${selected}`} style={{ width: '100%', height: '500px', border: '1px solid #ccc' }} />
          ) : (
            <div>Select and Run an app to preview</div>
          )}
          <div style={{ marginTop: 12 }}>Job: {jobId ?? '—'} — Status: {jobStatus ?? '—'}</div>
          <div style={{ marginTop: 12 }}>
            <h3>Snapshots</h3>
            {snapshots.length === 0 ? <div>No snapshots yet</div> : (
              <ul>
                {snapshots.map((s, i) => <li key={i}>{s.timestamp ?? s}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
