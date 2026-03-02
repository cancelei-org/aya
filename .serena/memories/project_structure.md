# Project Directory Structure

## Root Level
```
orboh/
├── app/                    # Next.js App Router
├── components/             # React components (feature-based)
├── lib/                    # Business logic
├── utils/                  # Helper functions
├── types/                  # TypeScript definitions
├── prisma/                 # Database schema
├── public/                 # Static assets
├── styles/                 # Global CSS
├── tests/                  # Test files
├── __tests__/             # Test suites
├── server/                 # Proxy server
├── docs/                   # Documentation
├── scripts/                # Build/utility scripts
├── .kiro/                  # Spec-driven dev files
│   ├── steering/          # Project steering docs
│   └── specs/             # Feature specifications
└── .serena/               # Serena memory files
```

## Key Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript config
- `next.config.ts` - Next.js configuration
- `prisma/schema.prisma` - Database schema
- `eslint.config.mjs` - ESLint rules
- `.env.local` - Environment variables
- `CLAUDE.md` - Claude Code instructions

## Active Feature Specs
Located in `.kiro/specs/`:
- production-inventory-management
- aya-hardware-requirements-dialogue
- hardware-debug-vlm
- perplexity-pricing-integration
- firmware-context-analyzer