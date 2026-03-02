# Suggested Commands for ORBOH Development

## Development Server
```bash
npm run dev              # Start with Turbopack (fast, recommended)
npm run dev:safe         # Start without Turbopack (stable)
npm run dev:all          # Start with proxy server
```

## Database Management
```bash
npm run db:setup         # Initialize database schema
npm run db:migrate       # Run Prisma migrations  
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio GUI
prisma generate          # Generate Prisma client
```

## Build & Quality Checks
```bash
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run ESLint
npm test                 # Run Jest tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
```

## Git Commands
```bash
git status               # Check current changes
git diff                 # View uncommitted changes
git add .                # Stage all changes
git commit -m "message"  # Commit with message
git push                 # Push to remote
```

## Kiro Spec Commands (slash commands in Claude Code)
```
/steering-init           # Generate initial steering documents
/spec-init [feature]     # Initialize spec structure
/spec-requirements       # Generate requirements
/spec-design            # Generate technical design
/spec-tasks             # Generate implementation tasks
/spec-status            # Check progress
```