# Prowider Mini Lead Distribution System

A production-grade lead distribution platform built with enterprise-quality architecture, focusing on backend correctness, concurrency safety, fair allocation logic, webhook idempotency, and real-time dashboard updates.

## Overview

This system manages the distribution of customer service requests (leads) to service providers using a sophisticated allocation engine. The system ensures fair distribution through mandatory provider assignments and round-robin allocation, while maintaining data integrity through database transactions and idempotency checks.

## Tech Stack

### Frontend
- **Next.js 15.1.6** with App Router
- **React 19.0.0** with Server Components
- **TypeScript 5** for type safety
- **Tailwind CSS 3.4.1** for styling
- **@tanstack/react-query 5.62.3** for data fetching and caching

### Backend
- **Next.js API Routes** / Route Handlers
- **PostgreSQL** as the database
- **Prisma ORM 6.1.0** for database operations
- **Zod 3.24.1** for runtime validation

### Realtime
- **Server-Sent Events (SSE)** for lightweight real-time updates

### Development Tools
- **ESLint 8** with Next.js config
- **tsx 4.22.1** for TypeScript execution
- **PostCSS 8** with Autoprefixer

## Features

1. **Public Service Request Form** - Customers submit service requests with validation
2. **Automatic Lead Distribution** - System assigns providers using enterprise-grade allocation engine
3. **Provider Dashboard** - Real-time view of quotas and assigned leads
4. **Webhook System** - Secure webhook endpoint with idempotency for quota resets
5. **Test Tools** - Concurrency testing, webhook idempotency testing, stress testing

## Quick Start

Get the application running in 5 minutes:

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Set up database
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed

# 4. Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Setup Instructions

### Prerequisites
- **Node.js 18+** installed
- **PostgreSQL** database running locally or accessible
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

1. Clone the repository and navigate to the project directory:
```bash
git clone <repository-url>
cd prowider-mini-lead-distribution-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your database connection:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/prowider_lead_db?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database Setup

1. Generate Prisma client:
```bash
npx prisma generate
```

2. Run database migrations:
```bash
npx prisma migrate dev --name init
```

3. Seed the database with initial data:
```bash
npx prisma db seed
```

The seed script creates:
- **3 Services**: Service 1, Service 2, Service 3
- **8 Providers**: Provider 1-8 with monthlyQuota=10, remainingQuota=10
- **Allocation State**: Initial round-robin state for each service (currentIndex=0)

### Running the Application

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate dev` - Create and run database migration
- `npx prisma db seed` - Seed database with initial data
- `npx prisma studio` - Open Prisma Studio for database management

## Project Structure

```
prowider-mini-lead-distribution-system/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── events/              # SSE endpoint for real-time updates
│   │   ├── leads/               # Lead creation and retrieval
│   │   ├── providers/           # Provider data endpoints
│   │   ├── test/                # Testing utilities
│   │   └── webhooks/            # Webhook handlers
│   ├── dashboard/               # Provider dashboard page
│   ├── request-service/         # Service request form
│   ├── test-tools/              # Testing utilities page
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── lib/                         # Utility libraries
│   ├── allocation-config.ts     # Allocation rules configuration
│   ├── prisma.ts                # Prisma client singleton
│   └── validators/              # Zod validation schemas
├── prisma/                      # Database
│   ├── migrations/              # Database migrations
│   ├── schema.prisma           # Prisma schema
│   └── seed.ts                 # Database seed script
├── services/                    # Business logic
│   └── allocation-service.ts    # Lead allocation engine
├── .env.example                 # Environment variables template
├── .eslintrc.json              # ESLint configuration
├── next.config.js              # Next.js configuration
├── package.json                # Dependencies and scripts
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## Database Schema

### Provider
- `id`: Unique identifier
- `name`: Provider name
- `monthlyQuota`: Maximum leads per month (default: 10)
- `remainingQuota`: Available quota for current month
- `createdAt`, `updatedAt`: Timestamps

### Service
- `id`: Unique identifier
- `name`: Service name (unique)
- `createdAt`: Timestamp

### Lead
- `id`: Unique identifier
- `customerName`: Customer's name
- `phoneNumber`: Customer's phone number
- `city`: Customer's city
- `description`: Service request description
- `serviceId`: Foreign key to Service
- `createdAt`: Timestamp

**Unique Constraint**: `(phoneNumber, serviceId)` - Prevents duplicate leads for same service

### LeadAssignment
- `id`: Unique identifier
- `leadId`: Foreign key to Lead
- `providerId`: Foreign key to Provider
- `assignedAt`: Assignment timestamp

**Unique Constraint**: `(leadId, providerId)` - Prevents duplicate assignments

### AllocationState
- `id`: Unique identifier
- `serviceId`: Foreign key to Service (unique)
- `currentIndex`: Current position in round-robin allocation
- `updatedAt`: Timestamp

**Purpose**: Persists round-robin state across server restarts

### WebhookEvent
- `id`: Unique identifier
- `eventId`: Webhook event ID (unique)
- `processedAt`: Processing timestamp

**Purpose**: Tracks processed webhook events for idempotency

## Allocation Configuration

The allocation rules are defined in `lib/allocation-config.ts`:

### Mandatory Assignment Rules

Every lead MUST be assigned to exactly 3 providers total.

**Service 1**: Provider 1 always receives (if quota available)
**Service 2**: Provider 5 always receives (if quota available)
**Service 3**: Provider 1 AND Provider 4 always receive (if quota available)

Mandatory providers only receive leads if they have remaining quota.

### Fair Allocation Rules

After mandatory assignment, remaining providers are selected using persistent round-robin:

**Service 1 Pool**: Providers 2, 3, 4
**Service 2 Pool**: Providers 6, 7, 8
**Service 3 Pool**: Providers 2, 3, 5, 6, 7, 8

### Configuration File

```typescript
// lib/allocation-config.ts
export const MANDATORY_PROVIDERS: Record<number, number[]> = {
  1: [1],      // Service 1: Provider 1 always receives
  2: [5],      // Service 2: Provider 5 always receives
  3: [1, 4],   // Service 3: Provider 1 AND Provider 4 always receive
}

export const FAIR_ALLOCATION_POOLS: Record<number, number[]> = {
  1: [2, 3, 4],           // Service 1: Providers 2, 3, 4
  2: [6, 7, 8],           // Service 2: Providers 6, 7, 8
  3: [2, 3, 5, 6, 7, 8],  // Service 3: Providers 2, 3, 5, 6, 7, 8
}

export const REQUIRED_ASSIGNMENTS = 3  // Each lead must be assigned to 3 providers
```

## Allocation Algorithm

### Round-Robin Implementation

1. System maintains `currentIndex` in `AllocationState` table for each service
2. When assigning remaining slots:
   - Start at `currentIndex % poolSize`
   - Check if provider has quota and isn't already assigned
   - If yes, assign and move to next provider
   - If no, skip and move to next provider
   - Increment `currentIndex` after each check
3. State persists in database, surviving server restarts
4. No random selection - deterministic and fair
5. Exhausted providers are automatically skipped

### Allocation Engine Flow

```
1. Receive lead creation request
2. Start Prisma transaction
3. Check for duplicate lead (phoneNumber + serviceId)
4. Create lead record
5. Assign mandatory providers (if quota available)
6. Calculate remaining slots needed
7. Fetch current allocation state for service
8. Use round-robin to fill remaining slots
9. Update allocation state
10. Commit transaction
11. Emit real-time update event
```

## Concurrency Handling

### Transaction Safety

All lead creation and assignment operations occur within a single Prisma transaction:

```typescript
await prisma.$transaction(async (tx) => {
  // All operations here are atomic
  // If any fails, all changes are rolled back
})
```

### Race Condition Prevention

**Quota Updates**: Use atomic decrement operations
```typescript
await tx.provider.update({
  where: { id: providerId },
  data: { remainingQuota: { decrement: 1 } },
})
```

**Duplicate Prevention**: Database-level unique constraints
- `(phoneNumber, serviceId)` on Lead table
- `(leadId, providerId)` on LeadAssignment table

**Allocation State**: Updated within transaction, preventing concurrent modifications

### Serializable-Safe Logic

The allocation engine is designed to be serializable:
- No reads outside transaction that affect decisions
- All state reads and writes happen within transaction
- Prisma's default isolation level (Read Committed) is sufficient due to unique constraints

### Testing Concurrency

Use the Test Tools page to generate 10 concurrent leads:
1. Navigate to `/test-tools`
2. Click "Generate Concurrent Leads"
3. System creates 10 leads simultaneously
4. Verify no quota over-assignment
5. Verify no duplicate assignments
6. Verify fair distribution

## Webhook Idempotency

### Purpose

Webhook idempotency ensures that the same webhook event cannot be processed twice, even if the webhook is retried. This is critical for payment provider integrations where retries are common.

### Implementation

1. **Event ID**: Each webhook payload includes a unique `eventId`
2. **Pre-Processing Check**: Before processing, check if `eventId` exists in `WebhookEvent` table
3. **Skip if Processed**: If event exists, skip processing and return success
4. **Mark as Processed**: After successful processing, insert `eventId` into `WebhookEvent` table
5. **Transaction Safety**: All checks and updates happen within a single transaction

### Flow

```
1. Receive webhook with eventId
2. Start transaction
3. Check if eventId exists in WebhookEvent
4. If exists: Return "already processed" (skip)
5. If not exists:
   a. Process webhook (reset quotas)
   b. Insert eventId into WebhookEvent
6. Commit transaction
7. Return success
```

### Testing Idempotency

Use the Test Tools page:
1. Navigate to `/test-tools`
2. Click "Test Idempotency"
3. System sends same webhook 3 times
4. First request processes, subsequent 2 skip
5. Verify only 1 quota reset occurred

## API Endpoints

### POST /api/leads
Create a new lead with automatic provider assignment.

**Request Body**:
```json
{
  "customerName": "John Doe",
  "phoneNumber": "5551234567",
  "city": "New York",
  "serviceId": 1,
  "description": "Need service for my home"
}
```

**Validation Rules**:
- `customerName`: Required, string, min 2 characters
- `phoneNumber`: Required, string, must be valid phone format
- `city`: Required, string, min 2 characters
- `serviceId`: Required, integer, must exist in database
- `description`: Required, string, min 10 characters

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "lead": {
      "id": 1,
      "customerName": "John Doe",
      "phoneNumber": "5551234567",
      "city": "New York",
      "description": "Need service for my home",
      "serviceId": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "assignments": [
      {
        "id": 1,
        "leadId": 1,
        "providerId": 1,
        "assignedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "assignedProviderIds": [1, 2, 3]
  }
}
```

**Response** (Error - Duplicate Lead):
```json
{
  "success": false,
  "error": "A lead with this phone number already exists for this service"
}
```

**Response** (Error - Validation):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "phoneNumber": "Invalid phone number format"
  }
}
```

### GET /api/leads
Retrieve all leads with assignments.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customerName": "John Doe",
      "phoneNumber": "5551234567",
      "city": "New York",
      "description": "Need service for my home",
      "serviceId": 1,
      "service": {
        "id": 1,
        "name": "Service 1"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "assignments": [
        {
          "id": 1,
          "providerId": 1,
          "provider": {
            "id": 1,
            "name": "Provider 1"
          },
          "assignedAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

### GET /api/providers
Retrieve all providers with quota status and assigned leads.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Provider 1",
      "monthlyQuota": 10,
      "remainingQuota": 7,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "leadAssignments": [
        {
          "id": 1,
          "leadId": 1,
          "lead": {
            "id": 1,
            "customerName": "John Doe",
            "phoneNumber": "5551234567"
          },
          "assignedAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

### POST /api/webhooks/reset-quota
Reset all provider quotas via webhook (idempotent).

**Request Body**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Validation Rules**:
- `eventId`: Required, string, must be valid UUID v4
- `timestamp`: Required, string, ISO 8601 format

**Response** (Success - First Time):
```json
{
  "success": true,
  "message": "Quotas reset successfully",
  "data": {
    "providersReset": 8,
    "eventId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Response** (Success - Already Processed):
```json
{
  "success": true,
  "message": "Event already processed, skipping",
  "data": {
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "processedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/test/generate-leads
Generate concurrent leads for testing concurrency and allocation logic.

**Request Body**:
```json
{
  "count": 10
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "leadsGenerated": 10,
    "totalAssignments": 30,
    "providers": [
      {
        "id": 1,
        "name": "Provider 1",
        "assignmentsReceived": 4,
        "remainingQuota": 6
      }
    ]
  }
}
```

### POST /api/test/test-idempotency
Test webhook idempotency by sending the same webhook multiple times.

**Request Body**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "retries": 3
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalRequests": 3,
    "successfulProcessing": 1,
    "skippedDueToIdempotency": 2,
    "eventId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### GET /api/events
SSE endpoint for real-time dashboard updates.

**Connection**: Long-lived HTTP connection with `text/event-stream` content type

**Events**:
- `lead-created`: Emitted when a new lead is created
- `quota-reset`: Emitted when quotas are reset via webhook
- `bulk-leads-created`: Emitted when multiple leads are created concurrently

**Event Format**:
```
event: lead-created
data: {"type":"lead-created","timestamp":"2024-01-01T00:00:00.000Z"}

event: quota-reset
data: {"type":"quota-reset","timestamp":"2024-01-01T00:00:00.000Z"}
```

## Real-time Updates

The dashboard uses Server-Sent Events (SSE) for real-time updates:

1. Dashboard opens SSE connection to `/api/events`
2. Server keeps connection open
3. When lead is created or quota reset, server pushes event
4. Dashboard automatically refreshes data
5. Connection automatically reconnects if dropped

**Events**:
- `lead-created`: New lead created
- `quota-reset`: Quotas reset via webhook
- `bulk-leads-created`: Multiple leads created

## Deployment Instructions

### Environment Variables

Ensure the following environment variables are set in production:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Application URL
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

**Environment Variable Details**:
- `DATABASE_URL`: PostgreSQL connection string with schema parameter
- `NEXT_PUBLIC_APP_URL`: Public URL of the application (used for webhook callbacks and redirects)

### Production Build

```bash
npm run build
npm start
```

### Database Migration in Production

```bash
npx prisma migrate deploy
npx prisma db seed
```

**Important**: Always run migrations before seeding in production to ensure schema is up to date.

### Recommended Deployment Platforms

- **Vercel**: Best for Next.js applications with automatic deployments
- **Railway**: Good for PostgreSQL hosting and full-stack deployments
- **AWS/RDS**: For enterprise deployments with custom infrastructure
- **DigitalOcean**: Cost-effective option with App Platform
- **Render**: Simple deployment with managed PostgreSQL

### Vercel Deployment Guide

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

**Vercel-Specific Configuration**:
```javascript
// vercel.json (optional)
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### Docker Support (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/prowider_lead_db
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=prowider_lead_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Development Workflow

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended configuration
- **Prettier**: Consider adding for consistent formatting (optional)

### Git Workflow

1. Create feature branch from `main`
2. Make changes and commit with descriptive messages
3. Test locally
4. Push and create pull request
5. Code review and merge

### Commit Message Convention

```
feat: add new allocation algorithm
fix: resolve webhook idempotency issue
docs: update README with deployment instructions
refactor: simplify allocation service logic
test: add concurrency tests
```

### Database Changes

When modifying the schema:

1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name description`
3. Update seed script if needed
4. Test migration on fresh database
5. Commit migration files

### Adding New API Endpoints

1. Create route in `app/api/[endpoint]/route.ts`
2. Add validation schemas in `lib/validators/`
3. Implement business logic in `services/` if complex
4. Add error handling
5. Update README with API documentation
6. Test manually and with automated tests

## Security Considerations

### Database Security

- Never commit `.env` file with real credentials
- Use strong passwords for PostgreSQL
- Enable SSL for database connections in production
- Regularly update Prisma and dependencies

### API Security

- Input validation using Zod schemas
- SQL injection prevention via Prisma ORM
- Rate limiting (consider adding for production)
- CORS configuration (add if needed for external access)

### Webhook Security

- Validate webhook event IDs (UUID v4)
- Implement signature verification (future enhancement)
- Use HTTPS for webhook endpoints in production
- Log all webhook events for audit

### Environment Variables

- Keep sensitive data in environment variables
- Use different values for development and production
- Rotate secrets periodically
- Use secrets management in production (e.g., Vercel Environment Variables)

## Performance Considerations

### Database Optimization

- **Indexes**: Added on frequently queried fields (serviceId, providerId, phoneNumber)
- **Connection Pooling**: Prisma handles this automatically
- **Query Optimization**: Use `select` to limit returned fields
- **Batch Operations**: Use `createMany` for bulk inserts

### Caching

- **React Query**: Client-side caching for API responses
- **Server Components**: Leverage Next.js server-side rendering
- **Static Generation**: Consider for static pages (future enhancement)

### Real-time Performance

- **SSE**: Lightweight compared to WebSockets
- **Connection Management**: Automatic reconnection on client
- **Event Throttling**: Consider adding for high-volume scenarios

### Monitoring

- Add logging for critical operations
- Monitor database query performance
- Track webhook processing times
- Set up alerts for errors (future enhancement)

## Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL database

**Solutions**:
```bash
# Verify PostgreSQL is running
pg_isready

# Test connection directly
psql $DATABASE_URL

# Check if DATABASE_URL is correct
echo $DATABASE_URL
```

**Common Causes**:
- PostgreSQL not running
- Wrong credentials in DATABASE_URL
- Database doesn't exist
- Network/firewall issues

### Prisma Client Not Generated

**Problem**: Error "Prisma Client is not generated"

**Solution**:
```bash
npx prisma generate
```

**If this fails**:
```bash
# Clear Prisma cache
rm -rf node_modules/.prisma

# Reinstall dependencies
npm install

# Regenerate client
npx prisma generate
```

### Migration Conflicts

**Problem**: Migration fails due to schema conflicts

**Solutions**:
```bash
# View migration history
npx prisma migrate status

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or create a new migration
npx prisma migrate dev --name fix_conflict
```

### Port Already in Use

**Problem**: Error "Port 3000 is already in use"

**Solutions**:
```bash
# Find process using port 3000 (Windows)
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F

# Or use a different port
PORT=3001 npm run dev
```

### Build Errors

**Problem**: Build fails with TypeScript errors

**Solutions**:
```bash
# Check TypeScript errors
npx tsc --noEmit

# Fix linting issues
npm run lint

# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### Seed Data Issues

**Problem**: Seed script fails or data not appearing

**Solutions**:
```bash
# Run seed manually with verbose output
npx tsx prisma/seed.ts

# Check if data exists
npx prisma studio

# Reset and reseed
npx prisma migrate reset
npx prisma db seed
```

### Real-time Updates Not Working

**Problem**: Dashboard not updating in real-time

**Solutions**:
- Check browser console for SSE connection errors
- Verify `/api/events` endpoint is accessible
- Check if ad-blockers are blocking SSE connections
- Try refreshing the dashboard page

### Webhook Idempotency Not Working

**Problem**: Same webhook processed multiple times

**Solutions**:
- Verify eventId is unique (UUID v4)
- Check WebhookEvent table for processed events
- Ensure transaction is committing properly
- Check logs for duplicate event detection

### Allocation Not Fair

**Problem**: Some providers getting more leads than others

**Solutions**:
- Check AllocationState table for currentIndex
- Verify FAIR_ALLOCATION_POOLS configuration
- Ensure providers have remaining quota
- Check if mandatory providers are taking slots
- Reset allocation state: `UPDATE AllocationState SET currentIndex = 0`

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Home Page  │  │ Request Form │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  /api/leads  │  │ /api/webhook │  │  /api/events │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           AllocationService                           │  │
│  │  - Mandatory assignment logic                         │  │
│  │  - Round-robin fair allocation                        │  │
│  │  - Quota enforcement                                  │  │
│  │  - Idempotency checks                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Prisma ORM │  │  PostgreSQL  │  │   Database   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Testing

### Manual Testing

1. **Submit a Lead**:
   - Navigate to `/request-service`
   - Fill out the form with valid data
   - Submit and verify assignment to 3 providers
   - Check dashboard for quota updates

2. **View Dashboard**:
   - Navigate to `/dashboard`
   - Verify provider quotas are displayed correctly
   - Click on provider to see assigned leads
   - Verify lead details are accurate

3. **Test Real-time Updates**:
   - Open dashboard in one browser tab
   - Submit lead in another tab
   - Verify dashboard updates automatically without refresh
   - Check browser console for SSE events

4. **Test Concurrency**:
   - Navigate to `/test-tools`
   - Click "Generate Concurrent Leads"
   - Verify no errors or over-assignments
   - Check that each lead is assigned to exactly 3 providers
   - Verify fair distribution across providers

5. **Test Webhook Idempotency**:
   - Navigate to `/test-tools`
   - Click "Test Idempotency"
   - Verify only 1 quota reset occurred
   - Check WebhookEvent table for processed events

6. **Test Duplicate Lead Prevention**:
   - Submit a lead with phone number "5551234567" for Service 1
   - Try to submit another lead with same phone number and service
   - Verify error message about duplicate lead
   - Submit with same phone number but different service (should work)

7. **Test Quota Exhaustion**:
   - Generate enough leads to exhaust a provider's quota
   - Try to submit another lead
   - Verify provider is skipped if quota exhausted
   - Check that lead is still assigned to other providers

### Automated Testing (Future Enhancement)

Add unit tests for:
- Allocation engine logic
- Webhook idempotency
- Transaction safety
- Validation schemas

Add integration tests for:
- API endpoints
- Database operations
- Real-time updates

Add end-to-end tests for:
- Lead submission flow
- Dashboard updates
- Webhook processing

### Testing Commands

```bash
# Run tests (when implemented)
npm test

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint

# Type checking
npx tsc --noEmit
```

## Contributing

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

### Code Review Process

1. Submit pull request with clear description
2. Address review comments
3. Ensure CI/CD checks pass
4. Get approval from maintainers
5. Merge to main branch

### Reporting Issues

When reporting bugs, please include:
- Description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

## FAQ

### Q: Can I change the number of providers each lead is assigned to?

A: Yes, modify the `REQUIRED_ASSIGNMENTS` constant in `lib/allocation-config.ts`. However, ensure you have enough providers in the allocation pools.

### Q: How do I add a new service?

A: Add the service to the seed script in `prisma/seed.ts`, then update the allocation configuration in `lib/allocation-config.ts` with mandatory providers and fair allocation pools.

### Q: What happens if all providers have exhausted their quota?

A: The system will still create the lead but may not be able to assign it to the required number of providers. Consider implementing a waitlist or notification system for this scenario.

### Q: Can I use a different database than PostgreSQL?

A: Prisma supports multiple databases (MySQL, SQLite, SQL Server, MongoDB). You would need to update the `provider` in `prisma/schema.prisma` and adjust any PostgreSQL-specific queries.

### Q: How do I reset the allocation state?

A: You can reset the round-robin state by running: `UPDATE "AllocationState" SET "currentIndex" = 0;` in your database, or use the Prisma Studio to edit the AllocationState table.

### Q: Is the system production-ready?

A: The system has production-grade features like transaction safety, idempotency, and real-time updates. However, you should add monitoring, logging, authentication, and rate limiting before deploying to production.

### Q: How do I add authentication?

A: Consider using NextAuth.js, Clerk, or Auth0. You would need to protect API routes and add authentication checks to the dashboard pages.

### Q: Can I customize the allocation algorithm?

A: Yes, the allocation logic is in `services/allocation-service.ts`. You can modify the algorithm to implement different distribution strategies (weighted random, priority-based, etc.).

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing issues and discussions
- Review the documentation
- Contact the maintainers

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database managed with [Prisma](https://www.prisma.io/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Validated with [Zod](https://zod.dev/)
