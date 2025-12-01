# Light House - Development Roadmap

## Overview

Light House is being developed in 18 phases, progressing from a job-ready MVP through SaaS maturity to AI-enhanced capabilities. This roadmap outlines the planned evolution of the platform.

**Current Status: Phase 7 (End-to-End MVP Complete)**

---

## Phases 1-10: Job-Ready MVP

The first 10 phases establish a production-ready uptime monitoring application suitable for portfolio demonstration and initial deployment.

### Phase 1-3: Foundation
- ✅ Project scaffolding (Go backend, Next.js frontend)
- ✅ Database schema and models (Organizations, Users, Checks, Results, Logs)
- ✅ Authentication system (JWT, bcrypt, signup/login endpoints)

### Phase 4-7: Core Features **(CURRENT)**
- ✅ Check CRUD operations with organization scoping
- ✅ Background worker for automated check execution
- ✅ Frontend UI (dashboard, check detail, create/edit forms)
- ✅ Real-time status tracking and historical results display

### Phase 8-10: Production Readiness
- [ ] Comprehensive test suite (unit, integration, E2E)
- [ ] Error handling improvements and logging enhancements
- [ ] Hosted demo deployment (cloud provider TBD)
- [ ] Basic documentation and API reference
- [ ] Performance optimization (caching, query optimization)

---

## Phases 11-14: SaaS-Ready Platform

These phases transform Light House from a demo application into a production SaaS offering with commercial capabilities.

### Phase 11-12: Monetization
- [ ] Stripe integration for subscription billing
- [ ] Usage-based pricing tiers (check limits, interval frequency)
- [ ] Payment webhooks and subscription lifecycle management
- [ ] Customer billing portal and invoice generation

### Phase 13-14: Enterprise Features
- [ ] Enhanced multi-tenant security hardening
- [ ] User onboarding flow with email verification
- [ ] Team management and role-based permissions
- [ ] Operational dashboards (health metrics, system monitoring)
- [ ] Advanced notification channels (email, Slack, webhooks)
- [ ] Check templates and bulk operations

---

## Phases 15-18: AI Enhancement Layer

The final phases introduce intelligent features that differentiate Light House through AI-powered automation and insights.

### Phase 15-16: Natural Language Configuration
- [ ] AI-powered check creation from natural language descriptions
- [ ] Intelligent parsing of service requirements into check configurations
- [ ] Suggested check parameters based on service type (API, website, database)
- [ ] Conversational interface for check management

### Phase 17: Repository Intelligence
- [ ] GitHub/GitLab repository scanning for service detection
- [ ] Automatic check suggestions based on discovered endpoints
- [ ] Infrastructure-as-code analysis (Docker Compose, Kubernetes manifests)
- [ ] API documentation parsing (OpenAPI/Swagger) for endpoint discovery

### Phase 18: AI Monitoring Advisor
- [ ] Alert tuning recommendations based on check history
- [ ] Noisy check detection and suppression suggestions
- [ ] Weak check identification (never fails, always fails, inconsistent)
- [ ] Optimal interval recommendations based on service patterns
- [ ] Anomaly detection for response times and failure patterns
- [ ] Automated health report generation with insights

---

## Technical Milestones

### Completed
- Multi-tenant architecture with organization isolation
- JWT-based authentication and authorization
- Background worker with interval-based scheduling
- RESTful API with full CRUD operations
- Responsive frontend with Next.js 14
- Docker Compose development environment

### Upcoming
- Test coverage and CI/CD pipeline (Phase 8-9)
- Production deployment with monitoring (Phase 10)
- Stripe integration and billing (Phase 11-12)
- Advanced security hardening (Phase 13)
- AI model integration (OpenAI API or open-source LLM) (Phase 15+)

---

## Architecture Evolution

**Current Architecture (Phase 7):**
- Monolithic Go API with background worker
- Client-side rendered Next.js frontend
- PostgreSQL with GORM
- Docker Compose for local development

**Planned Architecture (Phase 14+):**
- API Gateway with rate limiting
- Separate worker service for check execution
- Redis for caching and job queuing
- Server-side rendering for improved performance
- Kubernetes deployment for scalability

**Future Architecture (Phase 18):**
- Microservices for AI features (check analyzer, repo scanner)
- Vector database for semantic search and recommendations
- Event-driven architecture with message queues
- Real-time WebSocket updates for live monitoring

---

## Success Criteria

**Phase 10 (Job-Ready MVP):**
- Fully functional uptime monitoring system
- Deployed demo accessible to potential employers
- Clean codebase with tests and documentation
- Professional UI/UX suitable for production use

**Phase 14 (SaaS-Ready):**
- Paying customer capability with Stripe
- Multi-tenant security audit passed
- Operational monitoring and alerting in place
- Customer onboarding and support workflows

**Phase 18 (AI-Enhanced):**
- AI features demonstrating measurable value (reduced false positives, improved coverage)
- Differentiated product positioning in uptime monitoring market
- Scalable architecture supporting enterprise customers
- Automated insights reducing manual configuration burden

---

*This roadmap is subject to revision based on technical discoveries, market feedback, and strategic priorities. See [mvp-spec.md](./mvp-spec.md) for detailed current implementation status.*
