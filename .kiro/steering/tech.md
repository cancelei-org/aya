# Technology Stack

## Architecture

**Full-Stack Web Application** with modern React-based frontend and API routes for backend functionality. Uses a **monolithic architecture** with clear separation between client and server components through Next.js App Router.

### System Design
- **Frontend**: React 19 with Next.js 15 App Router
- **Backend**: Next.js API Routes with database integration
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with database sessions
- **Real-time Features**: Socket.io for future team collaboration
- **File Handling**: Multer for uploads, supporting images, PDFs, and Excel files

## Frontend Technologies

### Core Framework
- **Next.js**: 15.2.4 (App Router, Turbopack support)
- **React**: 19.0.0 (Latest stable with concurrent features)
- **TypeScript**: 5.x (Strict mode enabled)

### UI & Styling
- **Tailwind CSS**: 4.x (Utility-first CSS framework)
- **@radix-ui**: Primitive UI components for accessibility
- **class-variance-authority**: Type-safe component variants
- **clsx**: Conditional className utility
- **tailwind-merge**: Intelligent Tailwind class merging

### Specialized Libraries
- **@xyflow/react**: 12.8.1 (Interactive node-based diagrams)
- **react-resizable-panels**: 3.0.3 (Resizable UI panels)
- **react-rnd**: 10.5.2 (Draggable and resizable components)
- **@tiptap/react**: 3.0.7 (Rich text editor for documentation)
- **lucide-react**: 0.525.0 (Icon library)

## Backend Technologies

### Database & ORM
- **PostgreSQL**: 13+ (Primary database)
- **Prisma**: 6.11.0 (Type-safe ORM and query builder)
- **Redis**: 5.6.1 (Optional, for caching and sessions)

### Authentication & Security
- **NextAuth.js**: 4.24.11 (Authentication framework)
- **@next-auth/prisma-adapter**: Database session management

### External Integrations
- **OpenAI**: 4.104.0 (GPT-4 API for AI assistant)
- **Puppeteer**: 24.11.1 (Web scraping for component data)
- **Socket.io**: 4.8.1 (Real-time communication)

### File Processing
- **multer**: 1.4.5 (File upload middleware)
- **formidable**: 3.5.2 (Form data parsing)
- **xlsx**: 0.18.5 (Excel file processing)

## Development Environment

### Prerequisites
- **Node.js**: 18+ (recommended: 20+)
- **PostgreSQL**: 13+
- **npm**: 9+ (or yarn/pnpm equivalent)

### Development Tools
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with Next.js config
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run linters on staged files

### Testing Framework
- **Jest**: 29.7.0 (Unit and integration testing)
- **@testing-library/react**: 16.3.0 (React component testing)
- **@testing-library/jest-dom**: DOM testing utilities
- **Cypress**: E2E testing (configured)

## Common Development Commands

### Development Server
```bash
npm run dev              # Start with Turbopack (fast)
npm run dev:safe         # Start without Turbopack (stable)
npm run dev:all          # Start with proxy server
```

### Database Management
```bash
npm run db:setup         # Initialize database schema
npm run db:migrate       # Run Prisma migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio (GUI)
```

### Build & Deployment
```bash
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run ESLint
```

### Testing
```bash
npm test                 # Run Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## Environment Variables

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Authentication secret key (32+ characters)
- `NEXTAUTH_URL`: Application URL (http://localhost:3000 for dev)

### Optional Variables
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `NEXT_PUBLIC_OCTOPART_API_KEY`: Component pricing API
- `REDIS_URL`: Redis connection string (if using Redis)

### Development Example
```bash
DATABASE_URL="postgresql://orboh_user:password@localhost:5432/orboh_dev"
NEXTAUTH_SECRET="your-32-character-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-proj-your-openai-key"
```

## Port Configuration

### Standard Ports
- **3000**: Next.js development server (main application)
- **5432**: PostgreSQL database
- **5555**: Prisma Studio (database GUI)
- **6379**: Redis (if configured)

### Proxy Server (Optional)
- **8080**: Express proxy server for external API integration
- Configured in `/server` directory with separate package.json

## Build System

### Turbopack Integration
- **Primary**: `npm run dev` uses Turbopack for faster builds
- **Fallback**: `npm run dev:safe` uses standard Webpack
- **Production**: Standard Next.js build pipeline

### TypeScript Configuration
- **Target**: ES2017 for broad compatibility
- **Module Resolution**: Bundler mode for optimal tree-shaking
- **Path Mapping**: `@/*` aliases to root directory
- **Strict Mode**: Enabled for type safety

## Performance Considerations

### Bundle Optimization
- **Dynamic Imports**: Code splitting for large components
- **Image Optimization**: Next.js automatic image optimization
- **Font Optimization**: Automatic Google Fonts optimization

### Database Performance
- **Connection Pooling**: Prisma built-in connection pooling
- **Query Optimization**: Prisma generates optimized SQL
- **Migration Strategy**: Incremental schema updates