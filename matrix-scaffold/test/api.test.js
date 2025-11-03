const request = require('supertest')

describe('Simulated API smoke tests', () => {
  const base = 'http://localhost:3000'

  test('GET /api/apps returns array', async () => {
    const res = await request(base).get('/api/apps').timeout({ response: 2000, deadline: 5000 })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /api/run creates a job and completes', async () => {
    const apps = await request(base).get('/api/apps')
    expect(apps.statusCode).toBe(200)
    const slug = apps.body[0].slug
    const run = await request(base).post('/api/run').send({ app: slug })
    expect(run.statusCode).toBe(202)
    const id = run.body.id
    expect(id).toBeDefined()

    // poll for completion (up to ~5s)
    let job
    for (let i = 0; i < 10; i++) {
      // eslint-disable-next-line no-await-in-loop
      const r = await request(base).get(`/api/jobs/${id}`)
      if (r.statusCode === 200 && r.body.status === 'completed') {
        job = r.body
        break
      }
      // wait 500ms
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 500))
    }
    expect(job).toBeDefined()
    expect(job.status).toBe('completed')
    expect(job.result).toBeDefined()
  }, 15000)
})
