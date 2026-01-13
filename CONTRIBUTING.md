# Contributing to Zikalyze

Thank you for your interest in contributing to Zikalyze! This document provides guidelines for contributing securely and effectively.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Security Requirements](#security-requirements)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)

## 📜 Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or bun
- Git
- A Supabase account (for backend features)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/zikalyze/zikalyze.git
cd zikalyze

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

Create a `.env` file based on `.env.example` (if available). Never commit sensitive credentials.

## 🔒 Security Requirements

**All contributions MUST follow these security guidelines.**

### 1. Input Validation

Always validate user inputs using Zod schemas:

```typescript
import { z } from 'zod';

// ✅ CORRECT: Validate all inputs
const inputSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().trim().min(1).max(100),
  amount: z.number().positive().max(1000000),
});

// ❌ WRONG: Never trust raw input
const unsafeData = req.body; // Don't do this!
```

### 2. No Hardcoded Secrets

```typescript
// ✅ CORRECT: Use environment variables
const apiKey = Deno.env.get('API_KEY');

// ❌ WRONG: Never hardcode secrets
const apiKey = 'sk_live_abc123'; // NEVER do this!
```

### 3. SQL Injection Prevention

```typescript
// ✅ CORRECT: Use parameterized queries
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);

// ❌ WRONG: Never concatenate SQL
const query = `SELECT * FROM users WHERE id = '${userId}'`; // NEVER!
```

### 4. XSS Prevention

```typescript
// ✅ CORRECT: React auto-escapes JSX
<div>{userContent}</div>

// ❌ WRONG: Never use dangerouslySetInnerHTML with user content
<div dangerouslySetInnerHTML={{ __html: userContent }} /> // NEVER!
```

### 5. Authentication Checks

```typescript
// ✅ CORRECT: Always verify auth in edge functions
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) {
  return new Response('Unauthorized', { status: 401 });
}

// ❌ WRONG: Never trust client-side auth alone
```

### 6. RLS Policies Required

All new database tables MUST have Row-Level Security policies:

```sql
-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Add policies for each operation
CREATE POLICY "Users can view own data"
ON new_table FOR SELECT
USING (auth.uid() = user_id);
```

### 7. Sensitive Data Handling

| Data Type | Requirement |
|-----------|-------------|
| Passwords | Never store; use Supabase Auth |
| API Keys | Store in Supabase Secrets only |
| TOTP Secrets | Encrypt with AES-256-GCM |
| Session Tokens | Hash with SHA-256 |
| IP Addresses | Mask in user-facing views |
| Email Addresses | Fetch from auth, don't duplicate |

## 💻 Development Workflow

### Branch Naming

```
feature/description    # New features
fix/description        # Bug fixes
security/description   # Security improvements
docs/description       # Documentation updates
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new chart component
fix: resolve authentication race condition
security: add input validation to API endpoint
docs: update README with setup instructions
chore(deps): update dependencies
```

## 🔄 Pull Request Process

### Before Submitting

1. **Run all checks locally:**
   ```bash
   npm run lint          # ESLint
   npx tsc --noEmit      # TypeScript
   npm run build         # Build test
   npm audit             # Dependency audit
   ```

2. **Security self-review checklist:**
   - [ ] All user inputs are validated
   - [ ] No hardcoded secrets or API keys
   - [ ] New database tables have RLS policies
   - [ ] Edge functions verify authentication
   - [ ] No console.log of sensitive data
   - [ ] Error messages don't leak sensitive info

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Security improvement
- [ ] Documentation update

## Security Checklist
- [ ] Input validation implemented
- [ ] No secrets in code
- [ ] RLS policies added (if applicable)
- [ ] Auth checks in place
- [ ] No sensitive data logging

## Testing
Describe how you tested the changes

## Screenshots (if applicable)
```

### Review Process

1. **Automated checks must pass:**
   - Dependency Audit
   - CodeQL Analysis
   - Secret Scanning
   - ESLint + TypeScript
   - Build Test

2. **Manual review focuses on:**
   - Security implications
   - Code quality
   - Performance impact
   - Documentation

3. **Approval requirements:**
   - At least 1 maintainer approval
   - All security checks passing
   - No unresolved comments

## 📝 Coding Standards

### TypeScript

```typescript
// Use strict typing
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// Avoid 'any' type
const processUser = (user: User): void => { // ✅
const processUser = (user: any): void => {  // ❌
```

### React Components

```typescript
// Use functional components with TypeScript
interface Props {
  title: string;
  onAction: () => void;
}

const MyComponent: React.FC<Props> = ({ title, onAction }) => {
  return <button onClick={onAction}>{title}</button>;
};
```

### File Organization

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # Base UI components (shadcn)
│   └── dashboard/   # Feature-specific components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── pages/           # Route pages
└── integrations/    # External service integrations

supabase/
├── functions/       # Edge functions
└── migrations/      # Database migrations
```

### Styling

- Use Tailwind CSS utility classes
- Use semantic design tokens from `index.css`
- Never hardcode colors; use CSS variables

```tsx
// ✅ CORRECT: Use design tokens
<div className="bg-background text-foreground" />

// ❌ WRONG: Don't hardcode colors
<div className="bg-[#1a1a1a] text-white" />
```

## 🧪 Testing Requirements

### What to Test

- **Edge functions**: Input validation, auth checks, error handling
- **Components**: User interactions, accessibility
- **Utilities**: Edge cases, error conditions

### Security Tests

When adding new features, consider:

1. What happens with malicious input?
2. Can unauthenticated users access this?
3. Can users access other users' data?
4. Are error messages safe to display?

## 📚 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)

## ❓ Questions?

- Open a [GitHub Discussion](../../discussions)
- Check existing [Issues](../../issues)
- Review closed PRs for examples

---

Thank you for contributing securely! 🔐
