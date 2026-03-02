# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (main) | Yes |

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub Issues.

Instead, report vulnerabilities by emailing: **security@orboh.io** (or open a private [GitHub Security Advisory](../../security/advisories/new))

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge your report within 48 hours and provide a resolution timeline.

## Security Best Practices for Contributors

### API Keys & Secrets
- Never commit real API keys or secrets to the repository
- Use `.env.local` for local development (it is gitignored)
- Only `.env.example` with placeholder values should be committed
- Rotate any keys that were accidentally exposed immediately

### Environment Variables
- All sensitive configuration must go through environment variables
- `NEXT_PUBLIC_` prefixed variables are exposed to the browser — never put secrets there
- Exception: `NEXT_PUBLIC_OCTOPART_API_KEY` is a client-side key by design (Octopart's requirement)

### Dependencies
- Keep dependencies up to date
- Review `npm audit` output before releases
- Avoid dependencies with known critical vulnerabilities

### Authentication
- This project uses NextAuth.js — do not bypass its session validation
- Always validate `NEXTAUTH_SECRET` is set in production
- Database credentials must never be hardcoded
