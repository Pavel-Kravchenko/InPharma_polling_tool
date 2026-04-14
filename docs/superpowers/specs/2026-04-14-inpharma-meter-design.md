# InPharma meter — Design Spec

A live audience polling tool for pharmaceutical symposia and academic events. Participants scan a QR code or enter a room code to vote from their phones; results update in real-time and are embedded directly into presentation slides.

## Branding

- **Logo:** InPharma 2026 logo with ECG heartbeat line (file: `Screenshot 2026-04-14 at 19.50.30.png`)
- **Navy blue:** `#1a3a5c` — primary text, headers, sidebar
- **Orange/coral:** `#e8632b` — accent, active states, highlights
- **Cream:** `#f5f0e8` — embed/presentation backgrounds
- **White:** `#ffffff` — admin and participant card backgrounds

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | Single codebase for all three views, SSR for fast load |
| UI | React 19 + Tailwind CSS | Component-based, responsive, fast to build |
| Database | SQLite via Prisma | Zero-config, single-file DB, sufficient for 500+ users |
| Real-time | Server-Sent Events (SSE) | Simpler than WebSockets, works through all CDNs/proxies |
| Word cloud | d3-cloud | Proper cloud layout algorithm with scattered positioning |
| QR codes | `qrcode` npm package | Generate QR codes pointing to join URL |
| Hosting | Vercel free tier (or Railway if SSE needs long-lived connections) | Zero cost, managed deployment |

## Data Model (SQLite via Prisma)

```
Presentation
  id          String   @id @default(cuid())
  title       String
  roomCode    String   @unique       // 4-digit code
  createdAt   DateTime @default(now())
  questions   Question[]

Question
  id             String   @id @default(cuid())
  presentationId String
  presentation   Presentation @relation(fields: [presentationId])
  type           String       // "multiple_choice" | "word_cloud" | "rating_scale"
  title          String
  options        String?      // JSON array for MC options; null for word cloud/scale
  scaleMin       Int?         // For rating_scale: min value (default 1)
  scaleMax       Int?         // For rating_scale: max value (default 5)
  scaleMinLabel  String?      // e.g. "Not at all"
  scaleMaxLabel  String?      // e.g. "Very confident"
  order          Int
  isActive       Boolean  @default(false)
  votes          Vote[]

Vote
  id         String   @id @default(cuid())
  questionId String
  question   Question @relation(fields: [questionId])
  value      String       // MC: option index; word cloud: text; scale: number
  deviceId   String       // Browser-generated UUID (localStorage) — not for auth, just grouping
  createdAt  DateTime @default(now())
```

## Three Views

### 1. Admin Panel — `/admin`

**Purpose:** Create presentations, manage questions, control live sessions.

**Layout:** Sidebar (presentation list) + main area (question list for selected presentation).

**Features:**
- Create/delete presentations
- Add/edit/reorder/delete questions (MC, word cloud, rating scale)
- Generate and display QR code + room code
- Activate a question (pushes it live to all participants)
- View live vote counts per question
- "Embed URL" button per question — copies `/embed/{questionId}` to clipboard
- Reset votes (per question or all)
- Show connected participant count

**No authentication for MVP.** Admin is accessed by URL. A simple password can be added later.

### 2. Participant View — `/join`

**Purpose:** Mobile-first voting interface for attendees.

**Flow:**
1. Scan QR code or visit URL → enter 4-digit room code
2. See the currently active question
3. Vote:
   - **Multiple choice:** Tap one option, hit Submit
   - **Word cloud:** Type a word/phrase, submit (up to 3 answers)
   - **Rating scale:** Tap a number (1-5 or 1-10), hit Submit
4. See "Thanks! Waiting for next question..." after voting
5. Auto-advances when organizer activates the next question (via SSE)

**No login required.** A `deviceId` (UUID in localStorage) tracks which device voted to show "already voted" state if they revisit.

**Design:** Large tap targets, big text, minimal chrome. Works on any phone browser.

### 3. Embed View — `/embed/{questionId}`

**Purpose:** Presentation-ready live results. One URL per question, pasted into slides.

**Design:**
- Clean, minimal — no controls, no navigation
- Cream background (`#f5f0e8`) matching the InPharma brand
- InPharma logo in top-right corner (small)
- Question title at top
- Live-updating visualization:
  - **Multiple choice:** Vertical bar chart with vote counts above bars, option labels below
  - **Word cloud:** d3-cloud scattered layout, words sized by frequency, multi-colored
  - **Rating scale:** Horizontal bar chart per rating value, average displayed
- Total vote/response count in bottom-right
- Updates in real-time via SSE (bars animate as votes come in)

**Embed into slides:** Use PowerPoint's "Web Add-in" or open the URL in a browser window positioned over/alongside the slide deck. Google Slides supports iframe embedding via the "Insert > Embed" feature for Google Workspace users.

## Real-Time Architecture (SSE)

```
Admin clicks "Activate Q2"
  → POST /api/presentations/{id}/activate  { questionId }
  → Server sets isActive=true on Q2, false on others
  → Server pushes SSE event: { type: "question_changed", questionId }
  → All participant browsers receive event → load new question
  → All embed views receive event (if watching presentation-level stream)

Participant submits vote
  → POST /api/questions/{id}/vote  { value, deviceId }
  → Server saves vote to DB
  → Server pushes SSE event: { type: "vote", questionId, results: {...} }
  → Embed view receives event → animates updated chart
```

**SSE endpoints:**
- `GET /api/sse/presentation/{presentationId}` — participant stream (question changes)
- `GET /api/sse/question/{questionId}` — embed stream (vote updates for one question)

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/presentations` | List all presentations |
| POST | `/api/presentations` | Create presentation (generates room code) |
| DELETE | `/api/presentations/{id}` | Delete presentation |
| GET | `/api/presentations/{id}` | Get presentation with questions |
| POST | `/api/presentations/{id}/activate` | Set active question |
| GET | `/api/presentations/join/{roomCode}` | Join by room code → get active question |
| POST | `/api/questions` | Create question |
| PUT | `/api/questions/{id}` | Update question |
| DELETE | `/api/questions/{id}` | Delete question |
| PUT | `/api/questions/reorder` | Reorder questions |
| POST | `/api/questions/{id}/vote` | Submit vote |
| GET | `/api/questions/{id}/results` | Get current results |
| POST | `/api/questions/{id}/reset` | Reset votes |
| GET | `/api/sse/presentation/{id}` | SSE: question changes |
| GET | `/api/sse/question/{id}` | SSE: vote updates |

## Page Structure (Next.js App Router)

```
app/
  page.tsx                          # Landing / redirect
  join/
    page.tsx                        # Room code entry
    [roomCode]/
      page.tsx                      # Participant voting view
  admin/
    page.tsx                        # Admin dashboard
    [presentationId]/
      page.tsx                      # Edit questions for a presentation
  embed/
    [questionId]/
      page.tsx                      # Embed view (presentation-ready results)
  api/
    presentations/
      route.ts                      # GET, POST
      [id]/
        route.ts                    # GET, DELETE
        activate/route.ts           # POST
      join/[roomCode]/route.ts      # GET
    questions/
      route.ts                      # POST
      [id]/
        route.ts                    # GET, PUT, DELETE
        vote/route.ts               # POST
        results/route.ts            # GET
        reset/route.ts              # POST
      reorder/route.ts              # PUT
    sse/
      presentation/[id]/route.ts    # SSE stream
      question/[id]/route.ts        # SSE stream
```

## Deployment

**Primary: Railway free tier.**
- Persistent disk for SQLite (data survives redeploys)
- No function timeout limits — SSE connections stay open as long as needed
- Simple `Dockerfile` or `nixpacks` deployment

Vercel is not ideal here: serverless function timeouts (10s on free tier) would kill SSE connections, and its ephemeral filesystem loses the SQLite database on each redeploy.

**Alternative: Fly.io free tier.**
- Also supports persistent volumes and long-lived connections
- Slightly more CLI setup than Railway

## Verification Plan

1. **Local dev:** `npm run dev`, open admin at `localhost:3000/admin`
2. **Create a presentation:** Verify room code is generated, QR code displays
3. **Add one of each question type:** MC, word cloud, rating scale
4. **Open participant view** on phone (or second browser tab) — enter room code
5. **Activate a question** from admin — verify participant view updates
6. **Vote** from participant view — verify embed view updates in real-time
7. **Test with multiple tabs** — open 10+ participant tabs, vote concurrently
8. **Embed test:** Open embed URL, paste into a Google Slides iframe or PowerPoint web viewer
9. **Mobile test:** Access participant view on actual phone via local network
