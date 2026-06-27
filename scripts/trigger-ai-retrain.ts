const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const token = process.env.AI_RETRAIN_TOKEN?.trim()
const mode = process.env.AI_MODE === 'gpu' ? 'gpu' : 'cpu'

if (!token) {
  throw new Error('AI_RETRAIN_TOKEN is required')
}

async function run() {
  const response = await fetch(`${appUrl}/api/admin/ai/retrain`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-ai-retrain-token': token,
    },
    body: JSON.stringify({ mode }),
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.error ?? `Retrain request failed (${response.status})`)
  }

  console.log(`AI retrain completed. Job #${json.jobId}, model version ${json.modelVersion}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
