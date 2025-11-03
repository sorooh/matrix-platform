import React, { useEffect, useState } from 'react'

type AppEntry = { slug: string; name: string; description?: string }

export default function App() {
  const [apps, setApps] = useState<AppEntry[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<Array<any>>([])
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 8
  const [previewHtmlId, setPreviewHtmlId] = useState<string | null>(null)
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
          fetch(`/api/snapshots?app=${encodeURIComponent(d.app)}`).then((r) => r.json()).then(setSnapshots).catch(() => setSnapshots([]))
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
            {selected && (
              <div style={{ marginBottom: 8 }}>
                <button onClick={async () => {
                  try {
                    const r = await fetch(`/api/snapshot/${selected}`, { method: 'POST' })
                    const d = await r.json()
                    if (d && d.id) {
                      setSnapshots((s) => [{ id: d.id, status: 'pending', createdAt: new Date().toISOString() }, ...s])
                    }
                  } catch (err) {}
                }}>Capture snapshot</button>
              </div>
            )}
            {snapshots.length === 0 ? <div>No snapshots yet</div> : (
              (() => {
                const totalPages = Math.max(1, Math.ceil(snapshots.length / PAGE_SIZE))
                const start = (currentPage - 1) * PAGE_SIZE
                const pageItems = snapshots.slice(start, start + PAGE_SIZE)
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 12 }}>{snapshots.length} snapshot(s)</div>
                      <div>
                        <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                        <span style={{ margin: '0 8px' }}>Page {currentPage}/{totalPages}</span>
                        <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                      </div>
                    </div>
                    <ul>
                      {pageItems.map((s: any, i: number) => (
                        <li key={s.id ?? i} style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 140 }}>
                      <div style={{ fontSize: 12 }}>{s.createdAt ?? s.timestamp ?? s.id}</div>
                      <div style={{ marginTop: 6 }}>
                        {s.status === 'completed' ? (
                          (() => {
                            // prefer an S3-presigned URL if present (meta.thumbUrl), else use a local thumb if available,
                            // otherwise fall back to the full preview image
                            const src = s.thumbUrl ? s.thumbUrl : (s.thumbPath ? `/storage/${s.id}/thumb.jpg` : `/storage/${s.id}/preview.png`)
                            const open = s.thumbUrl ? s.thumbUrl : `/storage/${s.id}/preview.png`
                            return (<img src={src} alt="snapshot" loading="lazy" style={{ width: 120, border: '1px solid #ddd', cursor: 'pointer', background:'#f6f6f6' }} onClick={() => window.open(open, '_blank')} />)
                          })()
                        ) : (
                          <div style={{ fontSize: 12 }}>{s.status ?? 'pending'}</div>
                        )}
                      </div>
                    </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 12 }}>
                              <strong>{s.status ?? 'pending'}</strong>
                            </span>
                            <span style={{
                              padding: '4px 8px', borderRadius: 12, fontSize: 11, color: '#fff',
                              background: s.status === 'completed' ? '#2b9348' : (s.status === 'failed' ? '#c62828' : '#6c757d')
                            }}>{s.status ?? 'pending'}</span>
                          </div>
                          {s.status === 'completed' && (
                            <div style={{ marginTop: 6 }}><a href="#" onClick={(ev) => { ev.preventDefault(); setPreviewHtmlId(s.id) }}>Open HTML preview</a></div>
                          )}
                          <div style={{ marginTop: 6 }}>
                            <small>{s.error ? `Error: ${s.error}` : ''}</small>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                )
              })()
            )}
          </div>
          {previewHtmlId && (
            <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setPreviewHtmlId(null)}>
              <div style={{ width: '80%', height: '80%', background: '#fff', borderRadius: 6, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                  <div>Preview: {previewHtmlId}</div>
                  <button onClick={() => setPreviewHtmlId(null)}>Close</button>
                </div>
                <iframe src={`/storage/${previewHtmlId}/preview.html`} style={{ width: '100%', height: 'calc(100% - 40px)', border: 0 }} sandbox="allow-same-origin allow-scripts" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
