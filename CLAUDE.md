# Claude Code Spec-Driven Development with SuperClaude Framework

This project implements Kiro-style Spec-Driven Development enhanced with SuperClaude Framework for systematic workflow automation and intelligent agent coordination.

## SuperClaude Framework Integration

### Behavioral Modes
The SuperClaude Framework provides 5 adaptive behavioral modes:
- **Balanced** (default): Standard development workflow
- **Brainstorming** (`/sc:brainstorm`): Creative exploration and ideation
- **Orchestration** (`/sc:orchestrate`): Multi-agent coordination for complex tasks
- **Token Efficiency** (`/sc:optimize`): Minimal token usage for resource optimization
- **Deep Analysis** (`/sc:analyze`): Comprehensive code analysis and investigation
- **Rapid Prototyping** (`/sc:prototype`): Quick MVP development

### Intelligent Agent System
14 specialized agents available for automatic dispatch:
- Architecture, Code Analysis, Testing, Documentation
- Performance, Security, Database, Frontend, Backend
- DevOps, Integration, Optimization, Debugging, Planning

### Workflow Pattern
**Systematic Approach**: Understand → Plan → Execute → Validate
- **Parallel Operations**: Maximize efficiency through intelligent batching
- **Evidence-Based**: All claims verifiable through testing or documentation
- **Tool Optimization**: Always use the most powerful tool available

## Project Context

### Project Steering
- Product overview: `.kiro/steering/product.md`
- Technology stack: `.kiro/steering/tech.md`
- Project structure: `.kiro/steering/structure.md`
- Custom steering docs for specialized contexts

### Active Specifications
- Current spec: Check `.kiro/specs/` for active specifications
- Use `/spec-status [feature-name]` to check progress
- production-inventory-management: Redis-based production planning and inventory management system
- aya-hardware-requirements-dialogue: Interactive hardware requirements definition with AYA dialogue system
- hardware-debug-vlm: Hardware Debug Support using Vision Language Model controlled by voice
- perplexity-pricing-integration: Real-time electronic component pricing using Perplexity API to replace mock data system
- firmware-context-analyzer: GitHub repository analysis for firmware library and hardware requirement extraction

## Spec-Driven Development Workflow

### Phase 0: Steering Generation (Recommended)

#### Kiro Steering (`.kiro/steering/`)
```
/steering-init          # Generate initial steering documents
/steering-update        # Update steering after changes
/steering-custom        # Create custom steering for specialized contexts
```

**Note**: For new features or empty projects, steering is recommended but not required. You can proceed directly to spec-requirements if needed.

### Phase 1: Specification Creation
```
/spec-init [feature-name]           # Initialize spec structure only
/spec-requirements [feature-name]   # Generate requirements → Review → Edit if needed
/spec-design [feature-name]         # Generate technical design → Review → Edit if needed
/spec-tasks [feature-name]          # Generate implementation tasks → Review → Edit if needed
```

### Phase 2: Progress Tracking
```
/spec-status [feature-name]         # Check current progress and phases
```

## SuperClaude Commands

### Behavioral Mode Commands
```
/sc:brainstorm    # Activate brainstorming mode for creative exploration
/sc:orchestrate   # Enable multi-agent coordination for complex tasks
/sc:optimize      # Switch to token-efficient mode for resource optimization
/sc:analyze       # Enter deep analysis mode for comprehensive investigation
/sc:prototype     # Rapid prototyping mode for quick MVP development
/sc:status        # Display current SuperClaude mode and configuration
```

### Agent Dispatch
Agents are automatically dispatched based on task context when in orchestration mode.
Manual agent invocation available through Task tool with specific agent types.

## Spec-Driven Development Workflow

Kiro's spec-driven development follows a strict **3-phase approval workflow**:

### Phase 1: Requirements Generation & Approval
1. **Generate**: `/spec-requirements [feature-name]` - Generate requirements document
2. **Review**: Human reviews `requirements.md` and edits if needed
3. **Approve**: Manually update `spec.json` to set `"requirements": true`

### Phase 2: Design Generation & Approval
1. **Generate**: `/spec-design [feature-name]` - Generate technical design (requires requirements approval)
2. **Review**: Human reviews `design.md` and edits if needed
3. **Approve**: Manually update `spec.json` to set `"design": true`

### Phase 3: Tasks Generation & Approval
1. **Generate**: `/spec-tasks [feature-name]` - Generate implementation tasks (requires design approval)
2. **Review**: Human reviews `tasks.md` and edits if needed
3. **Approve**: Manually update `spec.json` to set `"tasks": true`

### Implementation
Only after all three phases are approved can implementation begin.

**Key Principle**: Each phase requires explicit human approval before proceeding to the next phase, ensuring quality and accuracy throughout the development process.

## Development Rules

### Kiro Spec-Driven Rules
1. **Consider steering**: Run `/steering-init` before major development (optional for new features)
2. **Follow the 3-phase approval workflow**: Requirements → Design → Tasks → Implementation
3. **Manual approval required**: Each phase must be explicitly approved by human review
4. **No skipping phases**: Design requires approved requirements; Tasks require approved design
5. **Update task status**: Mark tasks as completed when working on them
6. **Keep steering current**: Run `/steering-update` after significant changes
7. **Check spec compliance**: Use `/spec-status` to verify alignment

### SuperClaude Behavioral Rules (Priority System)
**🔴 CRITICAL** (Never compromise):
- **Safety First**: Security/data rules always win
- **Git Workflow**: Always feature branches, never work on main/master
- **Root Cause Analysis**: Investigate WHY failures occur, never skip validation
- **Temporal Awareness**: Always verify current date from env context

**🟡 IMPORTANT** (Strong preference):
- **Task Pattern**: Understand → Plan → TodoWrite(3+ tasks) → Execute → Validate
- **Implementation Completeness**: No partial features, TODO comments, or mock objects
- **Scope Discipline**: Build ONLY what's asked, MVP first, no enterprise bloat
- **Professional Honesty**: No marketing language, evidence-based claims only
- **Workspace Hygiene**: Clean temporary files, maintain professional workspace

**🟢 RECOMMENDED** (Apply when practical):
- **Tool Optimization**: Best tool selection, parallel operations, batch processing
- **Code Organization**: Consistent naming, logical directory structure
- **File Organization**: claudedocs/ for reports, tests/ for tests, scripts/ for utilities

## Automation

This project uses Claude Code hooks to:
- Automatically track task progress in tasks.md
- Check spec compliance
- Preserve context during compaction
- Detect steering drift

### Task Progress Tracking

When working on implementation:
1. **Manual tracking**: Update tasks.md checkboxes manually as you complete tasks
2. **Progress monitoring**: Use `/spec-status` to view current completion status
3. **TodoWrite integration**: Use TodoWrite tool to track active work items
4. **Status visibility**: Checkbox parsing shows completion percentage

## Getting Started

1. Initialize steering documents: `/steering-init`
2. Create your first spec: `/spec-init [your-feature-name]`
3. Follow the workflow through requirements, design, and tasks

## Production Environment Notes

### Railway Deployment - Claude API Model Configuration
**⚠️ IMPORTANT**: In the Railway production environment, Claude API model names are configured as environment variables. This means:

- **Model upgrades in code are ineffective**: Changing model names in `lib/anthropic.ts` or `.env.local` will NOT affect production
- **Production models are fixed**: The actual models used are determined by Railway's environment variables:
  - `CLAUDE_MODEL_OPUS`: Production Opus model version
  - `CLAUDE_MODEL_SONNET`: Production Sonnet model version
- **To upgrade models in production**: You must update the environment variables in Railway dashboard, not in the codebase

Example:
```typescript
// This change in lib/anthropic.ts will work locally but NOT in production:
export const MODELS = {
  OPUS: 'claude-opus-4-1-20250805',  // ← Ignored in Railway
  SONNET: 'claude-sonnet-4-20250514'  // ← Ignored in Railway
}

// Production uses Railway's env vars instead:
// CLAUDE_MODEL_OPUS=claude-opus-xxx (set in Railway)
// CLAUDE_MODEL_SONNET=claude-sonnet-xxx (set in Railway)
```

**Action required for model upgrades**: 
1. Go to Railway dashboard
2. Navigate to Environment Variables
3. Update `CLAUDE_MODEL_OPUS` and `CLAUDE_MODEL_SONNET`
4. Redeploy the application

## Kiro Steering Details

Kiro-style steering provides persistent project knowledge through markdown files:

### Core Steering Documents
- **product.md**: Product overview, features, use cases, value proposition
- **tech.md**: Architecture, tech stack, dev environment, commands, ports
- **structure.md**: Directory organization, code patterns, naming conventions

### Custom Steering
Create specialized steering documents for:
- API standards
- Testing approaches
- Code style guidelines
- Security policies
- Database conventions
- Performance standards
- Deployment workflows

### Inclusion Modes
- **Always Included**: Loaded in every interaction (default)
- **Conditional**: Loaded for specific file patterns (e.g., `"*.test.js"`)
- **Manual**: Loaded on-demand with `#filename` reference

## SuperClaude Framework Summary

The SuperClaude Framework enhances Claude Code with:
- **5 Behavioral Modes**: Balanced, Brainstorming, Orchestration, Token Efficiency, Deep Analysis, Rapid Prototyping
- **14 Intelligent Agents**: Automatic dispatch based on task context
- **Systematic Workflow**: Understand → Plan → Execute → Validate
- **Priority Rules System**: Critical (🔴), Important (🟡), Recommended (🟢)
- **Tool Optimization**: Parallel operations, batch processing, best tool selection

Configuration files:
- `.claude/superclaude.json`: Main SuperClaude configuration
- `.claude/agents.json`: Agent definitions and dispatch rules
- `.claude/commands/sc-*.sh`: SuperClaude command scripts

The framework integrates seamlessly with existing Kiro spec-driven workflow while adding powerful automation and intelligence capabilities.