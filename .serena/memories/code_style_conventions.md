# Code Style and Conventions

## TypeScript Configuration
- Strict mode enabled
- Target: ES2017
- Module resolution: bundler
- Path alias: `@/*` maps to root directory

## File Organization
- **app/**: Next.js App Router pages and layouts
- **components/**: Feature-based organization with atomic design influence
- **lib/**: Business logic and utilities
- **types/**: TypeScript type definitions
- **utils/**: Helper functions and API integrations

## Component Patterns
- Feature folders group related components
- Separate logic and UI (e.g., ChatPanelLogic.tsx + ChatPanelUI.tsx)
- Co-located tests in `__tests__/` subdirectories
- Use Radix UI primitives for accessibility
- Tailwind CSS for styling with class-variance-authority for variants

## Naming Conventions
- Components: PascalCase (e.g., ChatPanel.tsx)
- Utilities: camelCase (e.g., formatDate.ts)
- Types/Interfaces: PascalCase with descriptive names
- API routes: kebab-case (e.g., generate-system.ts)

## Code Quality Tools
- ESLint with Next.js config
- Prettier for formatting
- Husky for pre-commit hooks
- lint-staged for staged file linting
- Commitlint for conventional commits

## Testing
- Jest for unit/integration tests
- @testing-library/react for component testing
- Test files: `*.test.ts` or `*.test.tsx`
- Cypress for E2E testing