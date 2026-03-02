# Task Completion Checklist

When completing any development task, ensure to:

## Before Committing
1. **Run linting**: `npm run lint` - Fix any ESLint errors
2. **Run type checking**: `npm run build` or `npx tsc --noEmit`
3. **Run tests**: `npm test` - Ensure all tests pass
4. **Check formatting**: Prettier should auto-format on save

## After Implementation
1. **Test functionality**: Manually verify the feature works
2. **Check browser console**: No errors or warnings
3. **Verify database changes**: If schema changed, run migrations
4. **Update documentation**: If API or major feature changed

## For Spec-Driven Tasks
1. **Update task status**: Mark completed tasks in tasks.md
2. **Verify spec compliance**: Changes align with design.md
3. **Run `/spec-status`**: Check overall progress

## Important Notes
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files
- NEVER proactively create documentation unless requested
- Follow existing code patterns and conventions
- Ensure no secrets/keys are committed