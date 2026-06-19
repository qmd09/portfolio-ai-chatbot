# portfolio-ai-chatbot

An AI-powered chat widget named **Alfred** — a digital butler that answers questions about Tony Dinh's career, skills, and projects on behalf of his portfolio site. Visitors register with name and email before chatting; conversations stream token-by-token via SSE.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, TypeScript 5, Vite 5 |
| Animations | Framer Motion 11 |
| Markdown rendering | react-markdown 9 + remark-gfm |
| API proxy | Express 4, express-rate-limit 7 |
| AI | Anthropic SDK 0.39 (`claude-sonnet-4-6`) |
| Visitor storage | AWS DynamoDB (SDK v3) |
| Lambda alt | AWS Lambda + API Gateway v2 |
| Runtime (TypeScript) | `tsx` in dev and production proxy |
| Bundler | Vite (frontend only — proxy runs as TypeScript source) |

## Project structure

```
src/
  components/
    Chat/          # ChatWidget, ChatBubble, ChatInput, ChatSuggestions, VisitorGate
    Robot/         # RobotSVG — the floating trigger button
  constants/
    systemPrompt.ts  # Alfred's full persona, Tony's background, skills, salary target
  hooks/
    useChat.ts     # All streaming state, SSE parsing, AbortController, token budget
    useVisitor.ts  # localStorage persistence + visitor registration POST
  server/
    proxy.ts       # Express server: /api/visitor (DynamoDB) and /api/chat (Anthropic SSE)
lambda/
  chat/
    index.ts       # AWS Lambda handler — mirrors proxy.ts for API Gateway v2
  tsconfig.json    # Separate tsconfig for Lambda (CommonJS output)
```

No `src/server` is excluded from the frontend `tsconfig.json` — it has its own `tsconfig.server.json`.

## Local development setup

```bash
cp .env.example .env   # fill in ANTHROPIC_API_KEY at minimum
npm install
npm run dev:full       # starts Vite (port 5173) + Express proxy (port 3001) concurrently
```

The Vite dev proxy (`vite.config.ts`) forwards all `/api/*` requests to `localhost:3001`, so the frontend and proxy appear same-origin during development.

To run frontend only (no AI, no visitor tracking):
```bash
npm run dev
```

To build for production:
```bash
npm run build    # tsc + vite build → dist/
npm run proxy    # runs the Express server via tsx (serves the built frontend separately)
```

## Environment variables

From `.env.example`:

```
ANTHROPIC_API_KEY      # Required. Fails fast on startup if missing.
VITE_API_URL           # Base URL of the deployed proxy. Empty string in local dev
                       # (Vite proxy handles /api/* automatically).
                       # Set to https://your-railway-app.railway.app in production.
AWS_ACCESS_KEY_ID      # Only needed for local dev. Lambda uses its IAM role.
AWS_SECRET_ACCESS_KEY  # Only needed for local dev.
AWS_REGION             # Defaults to ap-southeast-2
VISITORS_TABLE         # DynamoDB table name. Defaults to alfred-visitors
ALLOWED_ORIGINS        # Comma-separated CORS origins for the proxy.
                       # Defaults to localhost:5173 and localhost:5177 in dev.
                       # Set to your production frontend domain in prod.
PORT                   # Proxy listen port. Defaults to 3001.
```

## Coding conventions

**State and data flow:** All chat state lives in `useChat`. All visitor state lives in `useVisitor`. `ChatWidget` composes them — it owns no state of its own beyond `isOpen`.

**Streaming:** `useChat.sendMessage` opens a `fetch` with `AbortController`, reads `response.body` as a `ReadableStream`, splits on `\n`, parses `data:` SSE lines as JSON, and appends `text_delta` events to the last message in state. The `finally` block always resets `isStreaming` and clears the abort ref.

**Styling:** No CSS framework. All layout uses inline styles with literal hex values. `index.css` handles global resets, keyframe animations (`cursorPulse`, `robotPulse`), markdown scoping (`.assistant-message`), and the mobile breakpoint for `.chat-panel`.

**TypeScript:** Three separate `tsconfig` files: `tsconfig.json` (frontend), `tsconfig.server.json` (Express proxy), `lambda/tsconfig.json` (Lambda, CommonJS output). All have `strict: true`.

**ESM throughout:** `"type": "module"` in `package.json`. The Lambda uses `module: "CommonJS"` in its own tsconfig to satisfy the default Lambda runtime.

**File naming:** React components are PascalCase (`ChatWidget.tsx`). Hooks are camelCase with `use` prefix. Server files are lowercase (`proxy.ts`).

## Key architectural decisions

**System prompt is a server-side constant.** `src/constants/systemPrompt.ts` is imported directly into `proxy.ts`. The client still sends a `systemPrompt` field in the POST body (legacy — it was previously used server-side) but the server ignores it. Do not revert this — the server must own the prompt or any caller can override Alfred's persona.

**Two deployment paths in one repo.** The Express path (Railway) supports true streaming SSE. The Lambda path (`lambda/`) does not stream — API Gateway buffers the full response. If you deploy via Lambda, use a Lambda Function URL with `InvokeMode: RESPONSE_STREAM` to restore streaming behaviour. Until then, the Lambda is a non-streaming fallback.

**Rate limiting requires `trust proxy`.** `app.set('trust proxy', 1)` is set before the rate limiter. Without it, Railway's reverse proxy IP appears as every visitor's IP, making the limiter fire for everyone simultaneously after the first 20 requests.

**DynamoDB writes are fire-and-forget.** `/api/visitor` catches DynamoDB errors and responds `{ ok: true }` regardless. Visitor tracking failing must never block the chat.

**Token budget is client-side only.** `MAX_SESSION_TOKENS = 4000` with `APPROX_TOKENS_PER_CHAR = 0.25` is an approximation enforced in the browser. The server enforces an 8000-character cap on total message content but does not count tokens.

## Common tasks

**Updating Alfred's persona or Tony's information:**
Edit `src/constants/systemPrompt.ts`. This is the single source of truth. Changes take effect immediately on the next server restart (the module is imported at startup).

**Changing the Anthropic model:**
`proxy.ts` and `lambda/chat/index.ts` both hardcode `model: 'claude-sonnet-4-6'`. Update both if switching models.

**Adding a new suggestion chip:**
Edit the `suggestions` array in `src/components/Chat/ChatSuggestions.tsx`.

**Deploying to Railway:**
Railway uses `nixpacks.toml` → `npm install && npm run proxy`. Set `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS`, and `VITE_API_URL` in the Railway environment variables panel.

**Deploying via Docker:**
```bash
docker build -t alfred .
docker run -p 3001:3001 --env-file .env alfred
```

**Deploying the Lambda:**
The Lambda handler is in `lambda/chat/index.ts`. It is not wired to any deployment tooling in this repo — deploy manually or add a Serverless/SAM config.

## Things to avoid / known gotchas

- **Do not move the system prompt back to the client.** Sending it in the POST body means any caller can override it. The current architecture keeps it server-side.
- **Do not remove `app.set('trust proxy', 1)`** from `proxy.ts`. Rate limiting breaks silently without it when deployed behind Railway.
- **The Lambda does not stream.** Don't use it for production without enabling Lambda Function URL response streaming.
- **`npm run proxy` runs TypeScript source directly via `tsx`.** There is no compilation step. `tsx` is a devDependency but must be present at runtime; `npm install` (not `npm ci --omit=dev`) is required in production if using the Docker/nixpacks path.
- **No tests exist.** TypeScript strict mode and `noUnusedLocals`/`noUnusedParameters` provide some safety net.
- **`VITE_API_URL` must be empty string (not unset) for local dev.** The endpoint is constructed as `${import.meta.env.VITE_API_URL ?? ''}/api/chat`. An unset var evaluates to `undefined` producing `undefined/api/chat`.
