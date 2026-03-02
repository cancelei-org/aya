# AYA - AI-powered Hardware Assistant

**AYA** is an open-source, AI-powered hardware development platform that serves as a complete digital partner for hardware engineers. It combines visual system design, component management, compatibility analysis, and AI-assisted technical consultation in a single web application.

## Features

- **Visual System Design** — Interactive drag-and-drop system diagrams powered by [@xyflow/react](https://reactflow.dev/)
- **Component Management** — Centralized tracking of parts, ordering status, pricing, and specifications
- **Compatibility Analysis** — Automated voltage, communication protocol, and power compatibility checking
- **AI Technical Assistant** — GPT-4 powered consultation for component selection and troubleshooting
- **Auto-Save** — Real-time project persistence with automatic recovery on reload
- **File Uploads** — Attach images, PDFs, and Excel files to projects
- **Undo/Redo** — Full edit history (Ctrl+Z / Ctrl+Y)
- **Resizable 3-Panel UI** — PBS (Project Breakdown Structure), main workspace, and AI chat
- **GitHub Integration** — Software-hardware compatibility verification via repository analysis

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Diagram | @xyflow/react 12 |
| Backend | Next.js API Routes, NextAuth.js |
| Database | PostgreSQL 13+, Prisma 6 |
| AI | OpenAI GPT-4, Anthropic Claude |
| File Processing | multer, xlsx, puppeteer |

## Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended)
- PostgreSQL 13+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/aya-hardware.git
cd aya-hardware

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
```

### Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.local.example .env.local
```

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/aya_dev"

NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Optional: component pricing
NEXT_PUBLIC_OCTOPART_API_KEY="your-octopart-key"
```

### Database Setup

```bash
# Create database (run in psql)
CREATE DATABASE aya_dev;

# Run migrations
npm run db:setup
```

### Run

```bash
# Development (with Turbopack)
npm run dev

# Development (without Turbopack, if you hit build issues)
npm run dev:safe
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

### System Diagram

Right-click the canvas to add a component node. Drag between node ports to create connections. Double-click a node label to rename it.

### Parts Management

Open the **Parts Management** tab to fill in component details (voltage, communication protocol, model number). These fields feed into the compatibility checker.

### Compatibility Check

Click **Compatibility Check** to automatically analyze:
- Voltage conflicts (e.g. 5 V vs 3.3 V mismatches)
- Communication protocol conflicts (I2C, SPI, UART, etc.)
- Power supply vs consumption balance

### AI Chat

Ask the AI assistant in the right panel for component recommendations, wiring advice, or design review. Attach datasheets (PDF/image) for contextual analysis.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+S | Manual save |
| F5 | Reload (data is preserved) |

## Development

```bash
# Run tests
npm test

# Lint
npm run lint

# Build
npm run build

# Prisma Studio (database GUI)
npm run db:studio

# Database migration
npm run db:migrate
```

## Troubleshooting

**Module not found**
```bash
rm -rf node_modules package-lock.json && npm install
```

**Database connection error**
- Ensure PostgreSQL is running: `brew services start postgresql@15` (macOS) or `sudo systemctl start postgresql` (Linux)
- Verify `DATABASE_URL` in `.env.local`

**AI chat not working**
- Check `OPENAI_API_KEY` is set and valid in `.env.local`

**Turbopack build error**
- Use `npm run dev:safe` to run without Turbopack

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
