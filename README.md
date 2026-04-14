# InPharma Meter

Live audience polling tool for pharmaceutical symposia and academic events. Participants scan a QR code or enter a room code to vote from their phones; results update in real-time on the presentation screen.

## Features

- **Multiple choice** questions with animated bar charts
- **Word cloud** questions with d3-cloud layout
- **Rating scale** questions with average display
- **Real-time updates** via Server-Sent Events (SSE)
- **QR code generation** for easy participant access
- **Embed view** for integrating live results into slides
- **Mobile-first** participant interface

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** + Tailwind CSS 4
- **SQLite** via Prisma ORM + better-sqlite3
- **SSE** for real-time communication
- **d3-cloud** for word cloud visualization

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/Pavel-Kravchenko/InPharma_polling_tool.git
cd InPharma_polling_tool

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Default DATABASE_URL is already set to local SQLite

# 4. Run database migrations
npx prisma migrate dev

# 5. (Optional) Seed sample data
npx prisma db seed

# 6. Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./prisma/dev.db"
```

For production, this should point to a persistent SQLite file path on your server.

## Application Views

| View | URL | Purpose |
|------|-----|---------|
| Landing | `/` | Entry point with join and admin links |
| Admin | `/admin` | Create presentations, manage questions, control live sessions |
| Participant | `/join` | Mobile voting interface (enter room code) |
| Embed | `/embed/{questionId}` | Presentation-ready live results |

## Deploying to a Server

### Option A: Railway (Recommended)

Railway supports persistent disks and long-lived connections, which are required for SQLite and SSE.

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add a persistent volume mounted at `/data`
4. Set environment variables:
   ```
   DATABASE_URL=file:/data/inpharma.db
   NODE_ENV=production
   PORT=3000
   ```
5. Update the build command in Railway settings:
   ```
   npm run build && npx prisma migrate deploy
   ```
6. Start command:
   ```
   npm run start
   ```

### Option B: Fly.io

1. Install the Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Create the app:
   ```bash
   fly launch
   ```
3. Create a persistent volume:
   ```bash
   fly volumes create data --size 1 --region ams
   ```
4. Create a `fly.toml`:
   ```toml
   [build]
     builder = "heroku/buildpacks:22"

   [env]
     DATABASE_URL = "file:/data/inpharma.db"
     NODE_ENV = "production"
     PORT = "3000"

   [mounts]
     source = "data"
     destination = "/data"

   [[services]]
     internal_port = 3000
     protocol = "tcp"
     [services.concurrency]
       hard_limit = 250
       soft_limit = 200

     [[services.ports]]
       handlers = ["http"]
       port = 80

     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   ```
5. Deploy:
   ```bash
   fly deploy
   ```

### Option C: Any VPS (Ubuntu/Debian)

```bash
# 1. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# 2. Clone and install
git clone https://github.com/Pavel-Kravchenko/InPharma_polling_tool.git
cd InPharma_polling_tool
npm ci --production=false

# 3. Configure environment
echo 'DATABASE_URL="file:/var/lib/inpharma/inpharma.db"' > .env
sudo mkdir -p /var/lib/inpharma

# 4. Build and migrate
npm run build
npx prisma migrate deploy

# 5. Start with a process manager
npm install -g pm2
pm2 start npm --name "inpharma" -- start
pm2 save
pm2 startup
```

To serve over HTTPS, put a reverse proxy in front (nginx or Caddy):

```nginx
# /etc/nginx/sites-available/inpharma
server {
    listen 80;
    server_name poll.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for SSE
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

## Embedding in Presentations

The embed view (`/embed/{questionId}`) is a full-screen, chrome-free display of live results.

**PowerPoint:** Insert > Add-ins > "Web Viewer" > paste the embed URL.

**Google Slides / Keynote:** Open the embed URL in a browser tab and switch to it during the presentation.

The embed URL for each question is available in the admin panel via the "Embed" button.

## API Reference

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/presentations` | List all presentations |
| `POST` | `/api/presentations` | Create presentation |
| `GET` | `/api/presentations/{id}` | Get presentation with questions |
| `DELETE` | `/api/presentations/{id}` | Delete presentation |
| `POST` | `/api/presentations/{id}/activate` | Set active question |
| `GET` | `/api/presentations/join/{roomCode}` | Join by room code |
| `POST` | `/api/questions` | Create question |
| `PUT` | `/api/questions/{id}` | Update question |
| `DELETE` | `/api/questions/{id}` | Delete question |
| `PUT` | `/api/questions/reorder` | Reorder questions |
| `POST` | `/api/questions/{id}/vote` | Submit vote |
| `GET` | `/api/questions/{id}/results` | Get results |
| `POST` | `/api/questions/{id}/reset` | Reset votes |
| `GET` | `/api/sse/presentation/{id}` | SSE stream: question changes |
| `GET` | `/api/sse/question/{id}` | SSE stream: vote updates |

## Security Notes

- **No authentication on admin panel.** This is an MVP designed for event use. For public-facing deployments, restrict access to `/admin` via your reverse proxy (e.g., IP allowlist or basic auth).
- **No rate limiting on vote endpoints.** For high-stakes polls, add rate limiting at the proxy level.
- **SQLite is single-server only.** Do not run multiple instances pointing at the same database file.
- The `.env` file and `prisma/dev.db` are gitignored and never committed.

## License

Private project. All rights reserved.
