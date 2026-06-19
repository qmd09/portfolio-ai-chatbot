import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import Anthropic from '@anthropic-ai/sdk'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { systemPrompt } from '../constants/systemPrompt.js'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set — copy .env.example to .env and add your key')
}

const app = express()
const PORT = process.env.PORT ?? 3001

// Required so express-rate-limit reads the real visitor IP from the X-Forwarded-For
// header set by Railway's reverse proxy instead of the proxy's IP.
// Without this, all requests appear to come from the same IP and either nobody gets
// rate-limited or everyone does after the first 20 requests.
app.set('trust proxy', 1)

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5177']

app.use(cors({ origin: ALLOWED_ORIGINS }))
app.use(express.json())

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// DynamoDB — credentials come from env vars (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
// If those aren't set, the write fails silently so the visitor registration still completes
const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-southeast-2' }),
)
const VISITORS_TABLE = process.env.VISITORS_TABLE ?? 'alfred-visitors'

async function recordVisitor(name: string, email: string, ip: string, timestamp: string) {
  await ddb.send(
    new PutCommand({
      TableName: VISITORS_TABLE,
      Item: {
        email,
        visitedAt: timestamp,
        name,
        ip,
        ttl: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // auto-expire after 1 year
      },
    }),
  )
}

const INJECTION_PATTERNS = [
  'ignore previous instructions',
  'ignore your instructions',
  'you are now',
  'disregard your',
  'forget your instructions',
  'new instructions',
  'system prompt',
  'act as',
  'jailbreak',
]

type Message = { role: 'user' | 'assistant'; content: string }

// Visitor registration — called once per visitor (fire-and-forget from client)
app.post('/api/visitor', async (req, res) => {
  const { name, email, timestamp } = req.body as { name: string; email: string; timestamp: string }

  if (typeof name !== 'string' || typeof email !== 'string') {
    res.status(400).json({ error: 'invalid request' })
    return
  }

  const ts = timestamp ?? new Date().toISOString()
  const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown').replace('::ffff:', '')

  try {
    await recordVisitor(name, email, ip, ts)
    console.log(`[visitor] recorded: ${name} | ${email}`)
  } catch (err) {
    // DynamoDB not configured in local dev — just log it
    console.log(`[visitor] ${ts} | ${name} | ${email} (dynamodb unavailable: ${(err as Error).message})`)
  }

  res.json({ ok: true })
})

app.use(
  '/api/chat',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    message: { error: 'rate limit exceeded' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
)

app.post('/api/chat', async (req, res) => {
  // systemPrompt is intentionally ignored from the request body — the server
  // enforces the Alfred persona via the imported constant so no caller can
  // override it by sending a different system prompt.
  const { messages, visitorName } = req.body as {
    messages: Message[]
    systemPrompt?: unknown  // accepted in body but never used
    visitorName?: string
  }

  if (!Array.isArray(messages) || messages.length > 20) {
    res.status(400).json({ error: 'message limit exceeded' })
    return
  }

  const totalChars = messages.reduce((acc, m) => acc + m.content.length, 0)
  if (totalChars > 8000) {
    res.status(400).json({ error: 'message limit exceeded' })
    return
  }

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  if (lastUserMessage) {
    const lower = lastUserMessage.content.toLowerCase()
    if (INJECTION_PATTERNS.some(p => lower.includes(p))) {
      res.status(400).json({ error: 'invalid request' })
      return
    }
  }

  const system =
    visitorName && typeof visitorName === 'string'
      ? `${systemPrompt}\n\nThe visitor you are speaking with is named ${visitorName}. Address them by name occasionally to make the conversation feel personal.`
      : systemPrompt
  // system is derived entirely from the server-side constant above — the client
  // cannot influence Alfred's persona via the request body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages,
      stream: true,
    })

    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch {
    if (!res.headersSent) {
      res.status(500).json({ error: 'api error' })
    } else {
      res.end()
    }
  }
})

app.listen(PORT, () => {
  console.log(`proxy running on http://localhost:${PORT}`)
})
