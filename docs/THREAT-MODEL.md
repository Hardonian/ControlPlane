# Threat Model

This document describes the threat model for the ControlPlane ecosystem and provides short-form templates for per-repo security analysis.

## Ecosystem Threat Model

### Scope

**In Scope:**
- ControlPlane orchestrator and services (JobForge, TruthCore, Runners)
- Contract validation and schema enforcement
- Inter-service communication
- Job execution and data flow
- Public API endpoints

**Out of Scope:**
- Infrastructure security (handled by platform)
- Third-party integrations (analyzed separately)
- Client applications (consumers of the API)

### Assets

| Asset | Sensitivity | Description |
|-------|-------------|-------------|
| Job payloads | High | Business logic and data |
| Execution results | High | Computed data and outputs |
| System state | Medium | Job queues, runner status |
| Health metrics | Low | Performance data |

### Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|------------|
| External Attacker | Disruption, data theft | Network access |
| Malicious Runner | Bypass controls | Internal access |
| Compromised Service | Lateral movement | Internal access |
| Insider | Unauthorized access | Full access |

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                        External Network                      │
│  (Untrusted - Internet)                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS + API Keys
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Gateway                          │
│  (Authentication, Rate Limiting)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ mTLS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Internal Network (DMZ)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   JobForge   │  │  TruthCore   │  │   Runners    │        │
│  │   (Control)  │  │  (Storage)   │  │  (Execution) │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘               │
│                       (Zero Trust)                             │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  Redis (Queue)    PostgreSQL (Persistence)                  │
└─────────────────────────────────────────────────────────────┘
```

### Threat Scenarios

#### STRIDE Analysis

**Spoofing (Authentication)**
- Threat: Unauthorized services claim to be legitimate runners
- Current: ❌ No authentication between services
- Mitigation: Service-to-service authentication (mTLS or JWT)
- Risk: High | Likelihood: Medium

**Tampering (Integrity)**
- Threat: Job payloads modified in transit
- Current: ❌ No integrity verification
- Mitigation: Request signing or mTLS
- Risk: Medium | Likelihood: Low

**Repudiation (Non-repudiation)**
- Threat: Actions cannot be attributed
- Current: ✅ Audit logs present
- Mitigation: Structured logging with correlation IDs
- Risk: Low | Likelihood: Low

**Information Disclosure (Confidentiality)**
- Threat: Sensitive data exposed in logs or responses
- Current: ⚠️ Partial - error details may leak
- Mitigation: Log sanitization, field-level encryption
- Risk: Medium | Likelihood: Medium

**Denial of Service (Availability)**
- Threat: System overwhelmed with requests
- Current: ⚠️ Basic - no rate limiting
- Mitigation: Rate limiting, circuit breakers, resource quotas
- Risk: High | Likelihood: High

**Elevation of Privilege (Authorization)**
- Threat: Runner accesses other runners' jobs
- Current: ❌ No authorization framework
- Mitigation: RBAC, scope validation
- Risk: Medium | Likelihood: Medium

### Risk Matrix

| Threat | Severity | Likelihood | Risk | Priority |
|--------|----------|------------|------|----------|
| Service Spoofing | High | Medium | **High** | P1 |
| Denial of Service | High | High | **High** | P1 |
| Data Tampering | Medium | Low | **Medium** | P2 |
| Info Disclosure | Medium | Medium | **Medium** | P2 |
| Privilege Escalation | Medium | Medium | **Medium** | P2 |
| Repudiation | Low | Low | **Low** | P3 |

## Per-Repo Short Form Template

Use this template for each repository's security documentation:

```markdown
## [Repo Name] Security Analysis

### Trust Boundary
- Position: [Internal/External/Both]
- Trust Level: [Trusted/Untrusted]

### Assets
| Asset | Sensitivity | Storage |
|-------|-------------|---------|
| [Asset] | [High/Med/Low] | [Location] |

### Threats (STRIDE)

**Spoofing**
- Status: [✅/⚠️/❌]
- Mitigation: [Description or "Not implemented"]
- Risk: [High/Med/Low]

**Tampering**
- Status: [✅/⚠️/❌]
- Mitigation: [Description]
- Risk: [High/Med/Low]

**Repudiation**
- Status: [✅/⚠️/❌]
- Mitigation: [Description]
- Risk: [High/Med/Low]

**Information Disclosure**
- Status: [✅/⚠️/❌]
- Mitigation: [Description]
- Risk: [High/Med/Low]

**Denial of Service**
- Status: [✅/⚠️/❌]
- Mitigation: [Description]
- Risk: [High/Med/Low]

**Elevation of Privilege**
- Status: [✅/⚠️/❌]
- Mitigation: [Description]
- Risk: [High/Med/Low]

### Security Checklist

- [ ] Authentication implemented
- [ ] Authorization enforced
- [ ] Input validation
- [ ] Secrets management
- [ ] Logging/auditing
- [ ] Error handling (no info leak)
- [ ] Dependency scanning
- [ ] SAST enabled
```

## ControlPlane Threat Model (Completed Template)

### Trust Boundary
- Position: Internal/External
- Trust Level: Trusted (with authentication)

### Assets
| Asset | Sensitivity | Storage |
|-------|-------------|---------|
| Job payloads | High | Redis, PostgreSQL |
| Execution results | High | PostgreSQL |
| Runner credentials | Critical | Environment/secrets store |
| System state | Medium | Redis |
| Health metrics | Low | Redis |

### Threats

**Spoofing**
- Status: ❌
- Current: No authentication between services
- Planned: mTLS for service-to-service, API keys for external
- Risk: High

**Tampering**
- Status: ⚠️
- Current: HTTP only, no integrity checks
- Planned: HTTPS everywhere, request signing for critical ops
- Risk: Medium

**Repudiation**
- Status: ✅
- Current: Structured logging with correlation IDs
- Risk: Low

**Information Disclosure**
- Status: ⚠️
- Current: Error messages may leak implementation details
- Planned: Error sanitization, field-level encryption for sensitive data
- Risk: Medium

**Denial of Service**
- Status: ⚠️
- Current: No rate limiting
- Planned: Rate limiting, circuit breakers, resource quotas
- Risk: High

**Elevation of Privilege**
- Status: ❌
- Current: No authorization framework
- Planned: RBAC with runner scoping
- Risk: Medium

## Mitigation Roadmap

### Phase 1: Authentication & Transport (P1)
- [ ] mTLS between services
- [ ] API key authentication for external access
- [ ] HTTPS enforcement

### Phase 2: Authorization & Validation (P2)
- [ ] RBAC implementation
- [ ] Input validation hardening
- [ ] Runner isolation

### Phase 3: Monitoring & Hardening (P3)
- [ ] Rate limiting
- [ ] Circuit breakers
- [ ] Security monitoring
- [ ] Penetration testing

## Security Architecture

### Current State (Development)
```
External ──HTTP──► JobForge ──HTTP──► Runners
                      │
                      └─HTTP──► TruthCore
```

### Target State (Production)
```
External ──HTTPS+APIKey──► Gateway ──mTLS──► JobForge ──mTLS──► Runners
                                              │
                                              └─mTLS──► TruthCore
                                              │
                                              └─mTLS──► Redis/DB
```

## References

- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [STRIDE](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [SECURITY.md](./SECURITY.md)
- [Security Workflow](../.github/workflows/security.yml)
