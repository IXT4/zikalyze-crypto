# Security Policy

## 🔒 Our Commitment to Security

Zikalyze takes security seriously. We are committed to ensuring the safety and privacy of our users' data. This document outlines our security practices and how to report vulnerabilities.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

We only provide security updates for the latest version. Please ensure you are running the most recent release.

## 🛡️ Security Features

Zikalyze implements defense-in-depth security:

- **Row-Level Security (RLS)**: 46 policies protecting 14 database tables
- **Encryption**: AES-256-GCM for 2FA secrets, SHA-256 for session tokens
- **Authentication**: Email/password with 2FA (TOTP), rate limiting, session management
- **Input Validation**: Comprehensive server-side validation on all edge functions
- **Privacy**: IP address masking, no PII duplication, encrypted local storage

## 📢 Reporting a Vulnerability

We appreciate responsible disclosure of security vulnerabilities.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report vulnerabilities through one of these channels:

1. **GitHub Security Advisories** (Preferred)
   - Go to the [Security tab](../../security/advisories) of this repository
   - Click "Report a vulnerability"
   - Provide detailed information about the issue

2. **Email**
   - Send details to: **security@zikalyze.app**
   - Use our PGP key (if available) for sensitive information

### What to Include

Please provide as much information as possible:

- **Description**: Clear explanation of the vulnerability
- **Impact**: What could an attacker achieve?
- **Steps to Reproduce**: Detailed reproduction steps
- **Affected Components**: Which parts of the system are affected
- **Suggested Fix**: If you have recommendations
- **Your Contact Info**: So we can follow up

### Example Report

```
Title: [VULNERABILITY TYPE] in [COMPONENT]

Description:
A brief description of the security issue.

Impact:
What an attacker could do with this vulnerability.

Steps to Reproduce:
1. Step one
2. Step two
3. Step three

Affected Versions:
- Version X.X.X

Suggested Remediation:
Recommended fix or mitigation.
```

## ⏱️ Response Timeline

| Action | Timeline |
|--------|----------|
| Initial acknowledgment | Within 48 hours |
| Severity assessment | Within 5 business days |
| Resolution timeline provided | Within 10 business days |
| Security patch released | Based on severity (see below) |

### Severity-Based Response

| Severity | Target Resolution |
|----------|-------------------|
| Critical | 24-72 hours |
| High | 1-2 weeks |
| Medium | 2-4 weeks |
| Low | Next release cycle |

## 🏆 Recognition

We believe in recognizing security researchers who help us improve:

- Public acknowledgment in our security advisories (with permission)
- Listing in our Hall of Fame (coming soon)
- Reference letter upon request

## 🔐 Security Best Practices for Users

### Account Security
- Enable Two-Factor Authentication (2FA)
- Use a strong, unique password
- Review active sessions regularly
- Log out from shared devices

### API Keys & Secrets
- Never share API keys publicly
- Rotate credentials periodically
- Use environment variables, not hardcoded values

### Reporting Suspicious Activity
If you notice suspicious activity on your account:
1. Change your password immediately
2. Review and revoke active sessions
3. Enable 2FA if not already enabled
4. Contact us if you believe your account was compromised

## ⚖️ Safe Harbor

We support safe harbor for security researchers who:

- Act in good faith to avoid privacy violations, data destruction, or service interruption
- Only interact with accounts you own or have explicit permission to test
- Do not exploit vulnerabilities beyond what is necessary to demonstrate the issue
- Report vulnerabilities promptly and do not disclose publicly until we've had reasonable time to address them

We will not pursue legal action against researchers who follow these guidelines.

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)

## 📝 Policy Updates

This security policy may be updated periodically. Major changes will be announced through:
- GitHub repository notifications
- Application changelog
- Email to registered users (for critical updates)

---

**Last Updated**: January 2026

Thank you for helping keep Zikalyze and our users safe! 🙏
