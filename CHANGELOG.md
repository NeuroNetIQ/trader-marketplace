# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial marketplace infrastructure
- TypeScript contracts package with Zod schemas
- CLI tool for model deployment and management
- Next.js web application with API routes
- RunPod signal HTTP template
- GitHub Actions for CI/CD
- Comprehensive documentation

### Features
- **Contracts (@neuronetiq/marketplace-contracts@0.1.0)**
  - Signal, consensus, and optimizer inference schemas
  - TypeScript types with full type safety
  - Utility functions for idempotency and validation
  - HTTP header constants and helpers

- **CLI (@neuronetiq/marketplace-cli@0.1.0)**
  - `mp login` - Authenticate with marketplace
  - `mp init` - Create models from templates
  - `mp validate` - Test model endpoints
  - `mp dev` - Development server with hot reload
  - `mp deploy` - Deploy to RunPod
  - `mp register` - Register models in catalog
  - `mp heartbeat` - Health monitoring
  - `mp link-infra` - Connect to trading infrastructure

- **Web Application**
  - Public model catalog with real-time status
  - Vendor authentication and management
  - API routes for deployments and heartbeats
  - Integration documentation and guides

- **RunPod Template**
  - Production-ready HTTP server
  - Automatic Infrastructure integration
  - Docker deployment optimization
  - Comprehensive logging and monitoring

### Infrastructure
- Vercel deployment for web application
- PostgreSQL database with migrations
- Redis for caching and rate limiting
- GitHub Actions for automated publishing
- Docker support for templates

## [0.1.0] - 2025-01-02

### Added
- Initial release of ML Marketplace
- Complete end-to-end workflow for external ML developers
- Integration with NeuroNetIQ trading infrastructure
- Support for signal, consensus, and optimizer models
- Production-ready deployment to RunPod
- Public marketplace catalog
- Comprehensive CLI tooling
