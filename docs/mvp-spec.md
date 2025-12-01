# Light House - MVP Specification

## Overview

Light House is a lightweight uptime monitoring tool designed to track the availability and performance of web services and APIs. The application provides automated health checks, historical result tracking, and a clean web interface for managing monitoring configurations.

## Core Features

### Authentication & Multi-Tenancy
- User registration and login with JWT-based authentication
- Organization-scoped data isolation for multi-tenant architecture
- Secure password hashing with bcrypt
- Role-based access control foundations

### Uptime Checks
- Create and manage HTTP/HTTPS endpoint checks
- Configurable check intervals (60s minimum)
- Status tracking (UP/DOWN based on HTTP status codes)
- Response time monitoring
- Error message capture and logging

### Background Worker
- Automated check execution every 30 seconds
- Due-check detection based on last_checked_at + interval_seconds
- HTTP GET requests with timeout handling
- Result persistence with timestamp, status code, response time, and error details
- Check status updates based on latest results

### Frontend UI
- Next.js 14 with TypeScript and Tailwind CSS
- Responsive dashboard with check listing and status overview
- Check detail pages with historical results
- Create new check form with validation
- Real-time status badges (UP/DOWN/Pending)
- Log viewer for application events
- Client-side authentication guards

### API Endpoints
- `POST /api/v1/auth/signup` - User registration with organization creation
- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/me` - Current user profile
- `GET /api/v1/checks` - List all checks (org-scoped)
- `POST /api/v1/checks` - Create new check
- `GET /api/v1/checks/:id` - Get check details
- `PUT /api/v1/checks/:id` - Update check configuration
- `DELETE /api/v1/checks/:id` - Delete check
- `GET /api/v1/checks/:id/results` - Get check result history
- `GET /api/v1/logs` - Retrieve log events

### Infrastructure
- Go backend with Fiber web framework
- PostgreSQL database with GORM ORM
- Docker Compose orchestration for local development
- Separate containers for API, frontend, and database
- Environment-based configuration

## Technical Stack

**Backend:**
- Go 1.22+
- Fiber (web framework)
- GORM (ORM)
- PostgreSQL 16
- JWT authentication
- bcrypt password hashing

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Client-side routing and state management

**DevOps:**
- Docker & Docker Compose
- PostgreSQL with health checks
- Volume persistence for database

## Data Models

**Organization** - Multi-tenant container
- name, created_at, updated_at

**User** - Authentication and identity
- email, password_hash, org_id, created_at, updated_at

**Check** - Uptime monitoring configuration
- name, url, interval_seconds, is_active, last_status, last_checked_at, org_id

**CheckResult** - Historical check execution record
- check_id, status_code, response_time_ms, error_message, created_at

**APIKey** - API authentication (scaffold ready)
- key_hash, name, last_used_at, org_id

**LogEvent** - Application logging
- level, message, metadata, timestamp, org_id

## Current Implementation Status

The MVP currently implements Phases 1-7 of the development roadmap:
- Complete authentication system
- Organization-based multi-tenancy
- Full CRUD operations for checks
- Background worker for automated monitoring
- Functional frontend UI with all core pages
- API endpoints for all primary operations
- Docker-based development environment

See [roadmap.md](./roadmap.md) for planned enhancements and future phases.
