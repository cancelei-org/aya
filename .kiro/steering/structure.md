# Project Structure

## Root Directory Organization

```
AYA/
├── app/                    # Next.js App Router (pages and layouts)
├── components/             # React UI components (organized by feature)
├── lib/                    # Business logic and utilities
├── types/                  # TypeScript type definitions
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets
├── styles/                 # Global CSS styles
├── tests/                  # Test files (unit and integration)
├── server/                 # Optional Express proxy server
├── docs/                   # Project documentation
├── .kiro/                  # Kiro spec-driven development files
└── cypress/                # E2E test configurations
```

## App Directory Structure (Next.js App Router)

### Core Application Structure
```
app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Home page component
├── globals.css             # Global styles and Tailwind imports
├── favicon.ico             # Application favicon
├── auth/
│   └── signin/
│       └── page.tsx        # Authentication page
├── layout/
│   └── AppLayout.tsx       # Main application layout component
├── providers/
│   └── StateProviders.tsx  # Context providers setup
├── providers.tsx           # Provider composition
├── effects/
│   └── SyncEffects.tsx     # Data synchronization effects
└── handlers/
    └── EventHandlers.tsx   # Global event handling logic
```

### Routing Conventions
- **File-based routing**: Each folder represents a route segment
- **Layout inheritance**: `layout.tsx` files define nested layouts
- **Page components**: `page.tsx` files define route endpoints
- **API routes**: Would be in `app/api/` (not currently used, using Next.js API routes in `pages/api/`)

## Components Directory Structure

### Feature-Based Organization
```
components/
├── ai-search/              # AI-powered component search functionality
├── canvas/                 # Interactive system diagram components
├── cards/                  # Reusable card components
├── chat/                   # AI chat panel and related functionality
├── context/                # Context-aware UI components
├── debug/                  # Development and debugging tools
├── edges/                  # Flow diagram edge components
├── editor/                 # Rich text editing components
├── layout/                 # Layout and navigation components
├── management/             # Data management interfaces
├── modals/                 # Modal dialog components
├── monitoring/             # Performance and cache monitoring
├── nodes/                  # Flow diagram node components
├── parts/                  # Parts management UI components
├── requirements/           # Requirements definition components
├── ui/                     # Base UI primitives (shadcn/ui style)
├── visualization/          # Data visualization components
└── warnings/               # Warning and error display components
```

### Component Architecture Patterns
- **Feature folders**: Group related components by domain functionality
- **Atomic design influence**: `ui/` contains base primitives, feature folders contain composed components
- **Co-located tests**: Test files in `__tests__/` subdirectories near components
- **State separation**: Logic in separate files (e.g., `ChatPanelLogic.tsx` + `ChatPanelUI.tsx`)

## Business Logic Organization

### Library Structure
```
lib/
├── ai/                     # AI integration utilities
├── auto-devlog/            # Development logging automation
├── db/                     # Database operation helpers
├── managers/               # Business logic managers
├── storage/                # Data storage abstractions
├── validators/             # Data validation logic
├── openai.ts               # OpenAI API client
├── prisma.ts               # Prisma client configuration
├── utils.ts                # General utility functions
└── formspree.ts            # Form handling utilities
```

### Architectural Principles
- **Manager pattern**: Complex business logic encapsulated in manager classes
- **Single responsibility**: Each file focuses on one domain area
- **Database abstraction**: Prisma client wrapped in helper functions
- **Validation separation**: Input validation separated from business logic

## Type System Organization

### TypeScript Definitions
```
types/
├── index.ts                # Re-exports and common types
├── api.ts                  # API request/response types
├── canvas.ts               # Canvas and diagram types
├── chat.ts                 # Chat and messaging types
├── compatibility.ts        # Hardware compatibility types
├── debug.ts                # Debugging and development types
├── parts.ts                # Hardware parts and components
├── project.ts              # Project management types
├── requirements.ts         # Requirements definition types
├── socket.ts               # Real-time communication types
└── ui.ts                   # UI component prop types
```

### Type Organization Patterns
- **Domain-driven**: Types grouped by business domain
- **Interface consistency**: Consistent naming patterns across related types
- **Export strategy**: Central re-export from `index.ts` for commonly used types
- **API contract types**: Separate files for API interfaces

## Database Schema Organization

### Prisma Structure
```
prisma/
├── schema.prisma           # Database schema definition
└── migrations/             # Database migration history
    └── [timestamp]_[name]/ # Individual migration folders
        └── migration.sql   # SQL migration commands
```

### Schema Design Patterns
- **Entity-relationship modeling**: Clear relationships between domain entities
- **Migration-first approach**: Schema changes through migrations
- **Type generation**: Automatic TypeScript type generation from schema

## File Naming Conventions

### Component Files
- **PascalCase**: `ComponentName.tsx` for React components
- **Descriptive names**: `ChatPanelLogic.tsx`, `PartsManagementTable.tsx`
- **Test files**: `ComponentName.test.tsx` in `__tests__/` directories
- **Type files**: `domain.ts` for TypeScript definitions

### Directory Naming
- **kebab-case**: `ai-search/`, `auto-devlog/` for multi-word directories
- **camelCase**: `utils/`, `managers/` for single-word directories
- **Descriptive names**: Directory names clearly indicate purpose

### File Organization Patterns
- **Feature co-location**: Related files grouped in same directory
- **Separation of concerns**: Logic, UI, and types in separate files when complex
- **Index files**: `index.ts` files for clean imports from directories

## Import Organization Patterns

### Import Structure
```typescript
// 1. External libraries
import React from 'react'
import { NextPage } from 'next'

// 2. Internal utilities and types
import { cn } from '@/lib/utils'
import { ComponentProps } from '@/types'

// 3. Component imports
import { Button } from '@/components/ui/button'
import { ChatPanel } from '@/components/chat/ChatPanel'

// 4. Relative imports (avoid when possible)
import './ComponentName.module.css'
```

### Path Mapping
- **Absolute imports**: `@/` alias maps to root directory
- **Consistent pathing**: Always use `@/` prefix for internal imports
- **Type imports**: Use `import type` for type-only imports

## Key Architectural Principles

### Code Organization Philosophy
- **Domain-driven design**: Features grouped by business domain, not technical layer
- **Composition over inheritance**: React composition patterns throughout
- **Separation of concerns**: UI, logic, and data access clearly separated
- **Type safety**: TypeScript strict mode with comprehensive type coverage

### Scalability Considerations
- **Feature modularity**: New features can be added as new component directories
- **API boundary clarity**: Clear separation between client and server logic
- **Database evolution**: Migration-based schema evolution
- **Component reusability**: Base UI components support theming and customization

### Development Workflow Integration
- **Hot reloading**: Next.js fast refresh for rapid development
- **Type checking**: Continuous TypeScript validation
- **Code quality**: ESLint and Prettier integration
- **Testing structure**: Co-located tests with clear naming conventions