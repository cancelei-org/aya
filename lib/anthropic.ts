import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Model configurations
export const MODELS = {
  // High-performance model for complex tasks
  OPUS: process.env.CLAUDE_MODEL_OPUS || 'claude-opus-4-1-20250805',
  // Fast model for general tasks
  SONNET: process.env.CLAUDE_MODEL_SONNET || 'claude-sonnet-4-20250514',
}

// Helper to determine which model to use based on task type
export function getModelForTask(taskType: 'requirements' | 'chat' | 'analysis' | 'vision' | 'system-design'): string {
  switch (taskType) {
    case 'requirements':
    case 'vision':
    case 'system-design':
      return MODELS.OPUS
    case 'chat':
    case 'analysis':
    default:
      return MODELS.SONNET
  }
}