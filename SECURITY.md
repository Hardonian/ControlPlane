# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please DO NOT:**
- Create public GitHub issues for security vulnerabilities
- Post vulnerabilities on social media or public forums
- Submit pull requests that expose vulnerabilities publicly

**Please DO:**
- Email security reports to: **security@controlplane.io**
- Include detailed steps to reproduce
- Provide impact assessment if possible
- Allow reasonable time for disclosure (90 days)

### Response Timeline

| Timeframe | Action |
|-----------|--------|
| 24 hours  | Acknowledge receipt |
| 72 hours  | Initial assessment |
| 14 days   | Fix or mitigation plan |
| 90 days   | Public disclosure (coordinated) |

### What to Include

Your report should include:

1. **Description**: What is the vulnerability?
2. **Impact**: What could an attacker do?
3. **Reproduction**: Step-by-step instructions
4. **Environment**: Versions, configuration
5. **Mitigation**: Any suggested fixes (optional)

### Recognition

We will:
- Credit you in the security advisory (unless you prefer anonymity)
- Add you to our security hall of fame (with permission)
- Provide a timeline for the fix

## Security Measures

### Current Implementations

- ✅ **Pinned Dependencies**: All GitHub Actions use SHA-pinned versions
- ✅ **Dependency Scanning**: Weekly automated vulnerability scans
- ✅ **Secret Scanning**: TruffleHog for credential detection
- ✅ **Static Analysis**: CodeQL for code security
- ✅ **Audit Trail**: Structured logging with correlation IDs
- ✅ **Input Validation**: Schema-based contract validation

### In Progress

- 🔄 **Authentication**: mTLS for service-to-service
- 🔄 **Authorization**: RBAC implementation
- 🔄 **Rate Limiting**: Request throttling
- 🔄 **Encryption**: Field-level encryption for sensitive data

### Planned

- 📋 **Security Monitoring**: SIEM integration
- 📋 **Penetration Testing**: Regular third-party audits
- 📋 **Compliance**: SOC 2 preparation

## Security Architecture

### Trust Model

ControlPlane operates on a **defense in depth** strategy:

1. **Perimeter**: API gateway with authentication
2. **Network**: mTLS between services
3. **Application**: Contract validation, input sanitization
4. **Data**: Encryption at rest and in transit
5. **Monitoring**: Audit logs, anomaly detection

### Data Protection

| Data Type | Protection |
|-----------|-----------|
| Job payloads | TLS in transit, encrypted at rest |
| Credentials | Environment variables, secrets manager |
| Logs | Structured, sanitized, access controlled |
| Metrics | Aggregated, anonymized |

## Known Limitations

### Development Mode

The current implementation is optimized for local development with the following limitations:

- **No authentication**: Services trust each other on the same network
- **No mTLS**: HTTP only (production should use mTLS)
- **No API keys**: Currently unauthenticated
- **No rate limiting**: No protection against DoS

### Production Hardening

Before deploying to production:

1. Enable mTLS between all services
2. Implement API key authentication
3. Add rate limiting and DDoS protection
4. Enable field-level encryption
5. Set up security monitoring
6. Conduct penetration testing

See [Threat Model](./docs/THREAT-MODEL.md) for detailed security analysis.

## Security Checklist

For contributors and maintainers:

### Code Changes

- [ ] No hardcoded credentials or secrets
- [ ] Input validation on all entry points
- [ ] Error handling without information leakage
- [ ] Dependencies updated and scanned
- [ ] No new hard-coded dependencies

### Infrastructure

- [ ] Services run as non-root
- [ ] Minimal container images
- [ ] Resource limits configured
- [ ] Health checks implemented
- [ ] Secrets externalized

### Documentation

- [ ] Security considerations documented
- [ ] Threat model updated if needed
- [ ] Breaking security changes noted

## Contact

- **Security Team**: security@controlplane.io
- **General Questions**: Open a GitHub discussion (not for vulnerabilities)
- **Emergency**: Use security email with [URGENT] prefix

## References

- [Threat Model](./docs/THREAT-MODEL.md)
- [Security Workflow](./.github/workflows/security.yml)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)

## Hall of Fame

We thank the following security researchers who have responsibly disclosed vulnerabilities:

*(List will be populated as reports are received)*

---

Last updated: 2024-03
