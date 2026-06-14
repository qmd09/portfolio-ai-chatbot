import Anthropic from '@anthropic-ai/sdk'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

// TODO: add DynamoDB IP rate limiting (20 requests per IP per hour)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Lambda automatically provides credentials via its execution role — no keys needed here
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export const handler: APIGatewayProxyHandlerV2 = async event => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  const path = event.rawPath ?? ''

  // Visitor registration
  if (path.endsWith('/visitor')) {
    try {
      const { name, email, timestamp } = JSON.parse(event.body ?? '{}') as {
        name: string
        email: string
        timestamp: string
      }
      if (typeof name === 'string' && typeof email === 'string') {
        const ip = event.requestContext.http.sourceIp ?? 'unknown'
        const ts = timestamp ?? new Date().toISOString()
        await recordVisitor(name, email, ip, ts)
        console.log(`[visitor] recorded: ${name} | ${email} | ${ip}`)
      }
    } catch (err) {
      console.error('[visitor] failed to record:', err)
      // Still return ok — don't block the visitor from chatting
    }
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) }
  }

  // Chat
  let body: { messages: Message[]; systemPrompt: string; visitorName?: string }
  try {
    body = JSON.parse(event.body ?? '{}') as typeof body
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'invalid request' }) }
  }

  const { messages, systemPrompt, visitorName } = body

  if (!Array.isArray(messages) || messages.length > 20) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'message limit exceeded' }) }
  }

  const totalChars = messages.reduce((acc, m) => acc + m.content.length, 0)
  if (totalChars > 8000) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'message limit exceeded' }) }
  }

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  if (lastUserMessage) {
    const lower = lastUserMessage.content.toLowerCase()
    if (INJECTION_PATTERNS.some(p => lower.includes(p))) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'invalid request' }) }
    }
  }

  const system =
    visitorName && typeof visitorName === 'string'
      ? `${systemPrompt}\n\nThe visitor you are speaking with is named ${visitorName}. Address them by name occasionally to make the conversation feel personal.`
      : systemPrompt

  try {
    // Collect SSE events from the stream and return as a single text/event-stream body.
    // API Gateway buffers the full response; for true streaming deploy with a Lambda
    // Function URL using RESPONSE_STREAM invoke mode.
    const sseLines: string[] = []
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages,
      stream: true,
    })

    for await (const evt of stream) {
      sseLines.push(`data: ${JSON.stringify(evt)}\n\n`)
    }
    sseLines.push('data: [DONE]\n\n')

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/event-stream' },
      body: sseLines.join(''),
    }
  } catch {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'api error' }) }
  }
}
