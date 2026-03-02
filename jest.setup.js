import '@testing-library/jest-dom'

// Mock fetch for test environment
global.fetch = jest.fn()

// Global test setup
global.console = {
  ...console,
  // Suppress console.log in tests unless VERBOSE env var is set
  log: process.env.VERBOSE ? console.log : jest.fn(),
  warn: console.warn,
  error: console.error,
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock performance API if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
  }
}