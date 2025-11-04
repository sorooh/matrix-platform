declare const fetch: any
type CreateCommentInput = { owner: string; repo: string; issueNumber: number; body: string }

export async function createIssueComment(input: CreateCommentInput): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return
  const url = `https://api.github.com/repos/${input.owner}/${input.repo}/issues/${input.issueNumber}/comments`
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${token}`,
        'accept': 'application/vnd.github+json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ body: input.body })
    })
  } catch {}
}


