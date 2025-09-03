# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Package | Version | Supported |
| ------- | ------- | --------- |
| @neuronetiq/marketplace-contracts | 0.2.x | ✅ |
| @neuronetiq/marketplace-cli | 0.2.x | ✅ |
| Templates | latest | ✅ |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly:

### 🔒 **Private Disclosure (Preferred)**

**Email**: security@neuronetiq.com

**Include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested remediation (if known)

**Response Time:**
- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 72 hours
- **Resolution Timeline**: Communicated within 1 week

### 🚨 **Critical Vulnerabilities**

For critical security issues that could impact live trading systems:

**Contact**: emergency@neuronetiq.com
**Phone**: +1 (555) 123-4567 (24/7 security hotline)

## Security Model

### **Token Security**

**API Key Management:**
- ✅ **Hashing**: All API keys hashed with Argon2id + salt + pepper
- ✅ **Storage**: Never stored in plaintext, shown only once on creation
- ✅ **Rotation**: Automatic expiration and manual rotation support
- ✅ **Scoping**: Infrastructure tokens scoped per deployment
- ✅ **Redaction**: Automatic token masking in logs (vk_***, sit_***)

**Token Lifecycle:**
1. **Creation**: Cryptographically secure random generation
2. **Storage**: Argon2id hash with unique salt and global pepper
3. **Usage**: Bearer token authentication with rate limiting
4. **Rotation**: Graceful rotation with overlap period
5. **Revocation**: Immediate invalidation capability

### **Infrastructure Security**

**Authentication:**
- ✅ **Multi-factor**: SSO (GitHub/Google) + API keys for automation
- ✅ **Session Management**: JWT tokens with 30-day expiration
- ✅ **Token Introspection**: Server-side validation with caching
- ✅ **Rate Limiting**: Per-deployment quotas (60 req/min default)

**Data Protection:**
- ✅ **Encryption in Transit**: TLS 1.2+ for all API communications
- ✅ **Encryption at Rest**: Database encryption for sensitive data
- ✅ **Input Validation**: Zod schema validation on all endpoints
- ✅ **Output Sanitization**: No sensitive data in error messages

### **Deployment Security**

**Container Security:**
- ✅ **Non-root Containers**: All templates use non-privileged users
- ✅ **Minimal Images**: Alpine-based images with security updates
- ✅ **Secret Injection**: Runtime environment variables only
- ✅ **Network Isolation**: Restricted egress to required endpoints

**RunPod Integration:**
- ✅ **Scoped Permissions**: Vendor tokens limited to own resources
- ✅ **Resource Limits**: CPU, memory, and cost budgets enforced
- ✅ **Health Monitoring**: Automatic detection of compromised deployments
- ✅ **Emergency Shutdown**: Immediate termination capability

## Vulnerability Response Process

### **Severity Levels**

| Level | Description | Response Time | Public Disclosure |
|-------|-------------|---------------|-------------------|
| **Critical** | Remote code execution, data breach | 24 hours | After patch deployed |
| **High** | Privilege escalation, token compromise | 72 hours | After patch deployed |
| **Medium** | Denial of service, information disclosure | 1 week | After patch deployed |
| **Low** | Minor information leakage | 2 weeks | With next release |

### **Response Process**

1. **Triage**: Security team validates and assigns severity
2. **Investigation**: Root cause analysis and impact assessment
3. **Patch Development**: Fix development and testing
4. **Coordinated Disclosure**: Notification to affected parties
5. **Public Release**: Security advisory and patch deployment
6. **Post-mortem**: Process improvement and prevention measures

## Security Best Practices

### **For Vendors**

**Token Management:**
- 🔒 Never commit API keys to version control
- 🔒 Use environment variables for all secrets
- 🔒 Rotate tokens regularly (90 days recommended)
- 🔒 Use minimal scopes for API keys
- 🔒 Monitor token usage for anomalies

**Deployment Security:**
- 🔒 Keep containers updated with security patches
- 🔒 Use non-root users in Docker containers
- 🔒 Implement proper input validation
- 🔒 Log security events (without sensitive data)
- 🔒 Monitor for unusual activity patterns

**Data Handling:**
- 🔒 Don't log sensitive trading data
- 🔒 Implement proper error handling
- 🔒 Use secure communication channels
- 🔒 Follow data retention policies
- 🔒 Encrypt sensitive data at rest

### **For NeuroNetIQ Platform**

**Infrastructure Hardening:**
- 🔒 Regular security audits and penetration testing
- 🔒 Automated vulnerability scanning
- 🔒 Network segmentation and access controls
- 🔒 Comprehensive audit logging
- 🔒 Incident response procedures

**Vendor Management:**
- 🔒 Vendor identity verification
- 🔒 Performance monitoring and anomaly detection
- 🔒 Resource usage tracking and billing
- 🔒 Compliance monitoring and enforcement
- 🔒 Emergency vendor suspension capability

## Compliance & Regulations

### **Financial Services**

- ✅ **Data Privacy**: GDPR and CCPA compliance
- ✅ **Financial Regulations**: FCA and SEC guidelines adherence
- ✅ **Audit Trails**: Comprehensive logging for regulatory review
- ✅ **Data Retention**: Configurable retention policies
- ✅ **Cross-border**: Geographic restrictions and data sovereignty

### **Industry Standards**

- ✅ **SOC 2 Type II**: Security controls and monitoring
- ✅ **ISO 27001**: Information security management
- ✅ **PCI DSS**: Payment card industry standards (if applicable)
- ✅ **NIST Framework**: Cybersecurity framework alignment

## Contact Information

**Security Team**: security@neuronetiq.com  
**Emergency Contact**: emergency@neuronetiq.com  
**General Support**: support@neuronetiq.com  
**Compliance**: compliance@neuronetiq.com

**Security Hotline**: +1 (555) 123-4567 (24/7)  
**Business Hours**: Monday-Friday, 9 AM - 6 PM UTC

---

**Last Updated**: January 3, 2025  
**Next Review**: April 3, 2025
