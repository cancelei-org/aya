# Contributing to AYA

Thank you for your interest in contributing to AYA! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/AYA.git`
3. Copy the environment template: `cp .env.example .env.local`
4. Fill in your own API keys in `.env.local`
5. Install dependencies: `npm install`
6. Set up the database: `npm run db:push`
7. Start the dev server: `npm run dev`

## Development Workflow

This project follows **Spec-Driven Development** with the Kiro workflow:

1. Check active specs in [`.kiro/specs/`](.kiro/specs/)
2. Use `/spec-status [feature]` to see what's in progress
3. Follow the Requirements → Design → Tasks → Implementation cycle

## Pull Request Guidelines

- Create a feature branch from `main`: `git checkout -b feat/your-feature`
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
  - `feat:` new feature
  - `fix:` bug fix
  - `docs:` documentation changes
  - `refactor:` code refactoring
  - `test:` adding or updating tests
- Keep PRs focused on a single concern
- Include tests for new functionality
- Run `npm run lint` and `npm test` before submitting

## API Keys

Never commit real API keys. The project uses the following external services:

| Service | Purpose | Required |
|---------|---------|----------|
| Anthropic Claude | AI assistant core | Yes |
| OpenAI | Legacy (being migrated) | Optional |
| Perplexity | Real-time component pricing | Optional |
| Google Custom Search | Purchase link lookup | Optional |
| Octopart/Nexar | Component data | Optional |

See `.env.example` for the full list of environment variables.

## Code Style

- TypeScript strict mode
- ESLint + Prettier enforced via pre-commit hooks
- Tailwind CSS for styling
- Radix UI primitives for accessible components

## Reporting Issues

Please use [GitHub Issues](../../issues) to report bugs or request features. Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version)
