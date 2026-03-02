// Removed unused variables: emailCache, lastFetch, CACHE_DURATION

export async function isEmailAllowed(email: string): Promise<boolean> {
  console.log(`[Auth] Checking email: ${email}`);

  // Development mode: allow all emails for testing
  if (process.env.NODE_ENV === 'development') {
    console.log('[Auth] Development mode: allowing all emails');
    return true;
  }

  // Production mode: allow all registered emails
  // Email validation is handled by NextAuth, so we just need to verify it's a valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(email);

  if (isValidEmail) {
    console.log(`[Auth] Valid email format, allowing access for: ${email}`);
    return true;
  }

  console.log(`[Auth] Invalid email format: ${email}`);
  return false;
}
