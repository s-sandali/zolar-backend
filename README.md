# Zolar Backend API

> **Solar Energy Monitoring System - Backend Service**
>
> A production-ready REST API for managing solar panel units, monitoring energy generation, detecting anomalies, processing payments, and providing analytics for solar energy systems.

---
**Deployed API backend**: [https://fed-4-back-end-sandali.onrender.com](https://fed-4-back-end-sandali.onrender.com)

**Deployed API frontend**: [https://fed-4-back-end-sandali.onrender.com](https://fed-4-front-end-sandali.netlify.app)  

**Deployed data URL**: [https://fed-4-back-end-sandali.onrender.com](https://fed-4-data-api-sandali.onrender.com)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Authentication & Authorization](#authentication--authorization)
- [Database Schema](#database-schema)
- [Background Jobs](#background-jobs)
- [Anomaly Detection](#anomaly-detection)
- [Payment Integration](#payment-integration)
- [Webhooks](#webhooks)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Scripts](#scripts)

---

## Overview

The Zolar Backend is the core API service that powers the Zolar solar energy monitoring platform. It handles:

- User authentication and role-based access control
- Solar unit management and monitoring
- Real-time energy generation tracking
- Intelligent anomaly detection with 5+ detection algorithms
- Weather-integrated performance analytics
- Automated invoice generation and Stripe payment processing
- Real-time webhooks from Clerk (auth) and Stripe (payments)
- Background data synchronization with external IoT data sources


---

## Architecture

The project follows a **clean 4-layer architecture** pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  • Express routes                                           │
│  • HTTP request/response handling                           │
│  • Middleware (auth, validation, logging, error handling)   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                          │
│  • Business logic and use cases                             │
│  • Data aggregation and transformation                      │
│  • Anomaly detection algorithms                             │
│  • Background jobs (sync, invoicing, detection)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
│  • DTOs and Zod validation schemas                          │
│  • Custom error classes                                     │
│  • Type definitions and interfaces                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
│  • Database models (Mongoose)                               │
│  • External service integrations (Clerk, Stripe, Weather)   │
│  • Cron job schedulers                                      │
│  • Database connection and seeding                          │
└─────────────────────────────────────────────────────────────┘
```

**Key Architectural Principles**:
- **Separation of Concerns**: Each layer has a distinct responsibility
- **Dependency Inversion**: High-level modules don't depend on low-level details
- **Type Safety**: Full TypeScript with strict mode + Zod runtime validation
- **Error Handling**: Centralized global error handler with custom error types
- **Security First**: JWT authentication, webhook signature verification, CORS

---

## Features

### Core Functionality
- ✅ **Solar Unit Management**: CRUD operations for solar panel installations
- ✅ **Energy Monitoring**: Track energy generation with 2-hour interval granularity
- ✅ **User Management**: Clerk-based authentication with admin/user roles
- ✅ **Real-time Weather Integration**: Open-Meteo API for weather-adjusted analytics

### Advanced Features
- 🔍 **Intelligent Anomaly Detection**: 5 detection algorithms running every 6 hours
  - Nighttime generation detection (sensor malfunction)
  - Zero generation during clear sky (system failure)
  - Energy exceeding physical capacity (data corruption)
  - Weather-performance mismatch (sensor issues)
  - Frozen generation detection (communication failure)

- 📊 **Comprehensive Analytics**:
  - Weather-adjusted performance metrics
  - Anomaly distribution and trends
  - System health scoring (0-100)
  - Best/worst performing days analysis

- 💳 **Payment Processing**:
  - Stripe embedded checkout integration
  - Automated monthly invoice generation
  - Webhook-based payment confirmation
  - Retry payment support

- 🔄 **Background Automation**:
  - Daily data synchronization from external data API
  - Automated monthly invoice generation
  - Scheduled anomaly detection scans

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 5.1.0 |
| **Language** | TypeScript (ES2017, strict mode) |
| **Database** | MongoDB with Mongoose ODM |
| **Authentication** | Clerk (@clerk/express) |
| **Payments** | Stripe API |
| **Validation** | Zod |
| **Scheduling** | node-cron |
| **Date Handling** | date-fns |
| **HTTP Client** | axios |
| **Development** | ts-node, nodemon, dotenv |

---

## Project Structure

```
zolar-back-end/
├── src/
│   ├── api/                              # API Layer
│   │   ├── middlewares/
│   │   │   ├── authentication-middleware.ts    # Clerk JWT verification
│   │   │   ├── authorization-middleware.ts     # Admin role check
│   │   │   ├── global-error-handling-middleware.ts
│   │   │   ├── logger-middleware.ts
│   │   │   └── sync/
│   │   │       └── sync-middleware.ts          # Data sync before response
│   │   ├── analytics.ts                 # Analytics routes
│   │   ├── anomalies.ts                 # Anomaly management routes
│   │   ├── energy-generation-record.ts  # Energy data routes
│   │   ├── invoice.ts                   # Invoice routes
│   │   ├── payment.ts                   # Stripe payment routes
│   │   ├── solar-unit.ts                # Solar unit CRUD routes
│   │   ├── users.ts                     # User routes
│   │   ├── weather.ts                   # Weather data routes
│   │   └── webhooks.ts                  # Clerk webhook handler
│   │
│   ├── application/                     # Business Logic Layer
│   │   ├── background/
│   │   │   ├── generate-invoices.ts     # Monthly invoice generation
│   │   │   └── sync-energy-generation-records.ts  # Data sync job
│   │   ├── analytics.ts                 # Analytics calculations
│   │   ├── anomalies.ts                 # Anomaly CRUD operations
│   │   ├── anomaly-detection.ts         # Detection algorithms
│   │   ├── energy-generation-record.ts  # Energy data logic
│   │   ├── invoice.ts                   # Invoice business logic
│   │   ├── payment.ts                   # Payment processing
│   │   ├── solar-unit.ts                # Solar unit management
│   │   ├── users.ts                     # User management
│   │   └── weather.ts                   # Weather API integration
│   │
│   ├── domain/                          # Domain Layer
│   │   ├── dtos/
│   │   │   └── solar-unit.ts            # Zod validation schemas
│   │   ├── errors/
│   │   │   └── errors.ts                # Custom error classes
│   │   └── types.ts                     # Type definitions
│   │
│   ├── infrastructure/                  # Infrastructure Layer
│   │   ├── entities/
│   │   │   ├── Anomaly.ts               # Anomaly model
│   │   │   ├── EnergyGenerationRecord.ts
│   │   │   ├── Invoice.ts
│   │   │   ├── SolarUnit.ts
│   │   │   └── User.ts
│   │   ├── anomaly-detection-scheduler.ts  # Anomaly detection cron
│   │   ├── db.ts                        # Database connection
│   │   ├── scheduler.ts                 # Background job scheduler
│   │   └── seed.ts                      # Database seeding
│   │
│   ├── scripts/                         # Utility Scripts
│   │   ├── clear-anomalies.ts
│   │   ├── clear-data.ts
│   │   ├── debug-frozen.ts
│   │   └── test-detection.ts
│   │
│   ├── global.d.ts                      # Global TypeScript declarations
│   └── index.ts                         # Application entry point
│
├── .env                                 # Environment variables
├── ngrok.yml                            # Ngrok tunnel configuration
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account (or local MongoDB)
- Clerk account (authentication provider)
- Stripe account (payment processing)
- ngrok (for local webhook testing)

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd zolar-back-end
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/zolar

# Server
PORT=8000

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Frontend URLs (comma-separated for CORS)
FRONTEND_URL=http://localhost:5173,https://your-frontend-url.com
```

4. **Seed the database** (optional):
```bash
npm run seed
```

This creates:
- Test user: `sandalisandagomi@gmail.com` (admin role)
- Test solar unit: `SU-0001` (5000W capacity)

5. **Start the development server**:
```bash
npm run dev
```

The API will be available at `http://localhost:8000`

### Setting Up Webhooks (Local Development)

For local webhook testing with Clerk and Stripe:

1. **Install ngrok**:
```bash
npm install -g ngrok
```

2. **Configure ngrok.yml** (already in project):
```yaml
version: 3
agent:
  authtoken: YOUR_NGROK_TOKEN
endpoints:
  - name: api
    url: https://your-subdomain.ngrok-free.dev
    upstream:
      url: http://localhost:8000
```

3. **Start ngrok tunnel**:
```bash
ngrok start --config=ngrok.yml
```

4. **Configure webhook endpoints**:
   - **Clerk Dashboard**: `https://your-subdomain.ngrok-free.dev/api/webhooks/clerk`
   - **Stripe Dashboard**: `https://your-subdomain.ngrok-free.dev/api/stripe/webhook`

---

## API Endpoints

### Base URL
- **Local**: `http://localhost:8000/api`
- **Production**: `https://fed-4-back-end-sandali.onrender.com/api`

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhooks/clerk` | Clerk user lifecycle webhook |
| `POST` | `/stripe/webhook` | Stripe payment event webhook |

### Protected Endpoints (Authentication Required)

#### Solar Units

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/solar-units` | Admin | Get all solar units |
| `POST` | `/solar-units` | Admin | Create solar unit |
| `GET` | `/solar-units/me` | User | Get user's solar unit (with sync) |
| `GET` | `/solar-units/:id` | Admin | Get solar unit by ID |
| `PUT` | `/solar-units/:id` | Admin | Update solar unit |
| `DELETE` | `/solar-units/:id` | Admin | Delete solar unit |

#### Energy Generation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/energy-generation-records/solar-unit/:id` | User | Get energy records |

#### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/users` | User | Get all users |

#### Weather

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/weather/current/:solarUnitId` | User | Get current weather with solar impact |

#### Anomalies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/anomalies/me` | User | Get user's anomalies |
| `GET` | `/anomalies` | Admin | Get all anomalies |
| `GET` | `/anomalies/stats` | User | Get anomaly statistics |
| `PATCH` | `/anomalies/:id/acknowledge` | User | Acknowledge anomaly |
| `PATCH` | `/anomalies/:id/resolve` | User | Resolve anomaly |
| `POST` | `/anomalies/trigger-detection` | User | Manual detection trigger |
| `POST` | `/anomalies/trigger-sync` | User | Manual data sync |
| `GET` | `/anomalies/debug` | User | Debug data status |

#### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/analytics/weather-performance/:solarUnitId` | User | Weather-adjusted performance |
| `GET` | `/analytics/anomaly-distribution/:solarUnitId` | User | Anomaly distribution |
| `GET` | `/analytics/system-health/:solarUnitId` | User | System health score |

#### Invoices

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/invoices` | User | Get user's invoices |
| `GET` | `/invoices/pending-count` | User | Get pending invoice count |
| `GET` | `/invoices/:id` | User | Get invoice by ID |
| `GET` | `/invoices/admin/all` | Admin | Get all invoices |

#### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/payments/create-checkout-session` | User | Create Stripe checkout |
| `GET` | `/payments/session-status` | User | Get payment status |

---

## Authentication & Authorization

### Authentication Flow (Clerk)

1. **Frontend**: User signs in via Clerk
2. **Clerk**: Returns JWT token
3. **Frontend**: Sends JWT in `Authorization: Bearer <token>` header
4. **Backend**: `clerkMiddleware()` validates JWT
5. **Backend**: `authenticationMiddleware` checks `auth.userId`
6. **Success**: Proceed to route handler
7. **Failure**: Returns `401 Unauthorized`

**Implementation**: [src/api/middlewares/authentication-middleware.ts](src/api/middlewares/authentication-middleware.ts:1)

### Authorization Flow (Admin Check)

1. After authentication, extract `publicMetadata.role` from JWT
2. If not in JWT, query MongoDB User collection
3. Check if `role === "admin"`
4. **Success**: Proceed to admin route
5. **Failure**: Returns `403 Forbidden`

**Implementation**: [src/api/middlewares/authorization-middleware.ts](src/api/middlewares/authorization-middleware.ts:1)

### User Synchronization (Webhooks)

Clerk events automatically sync to MongoDB:

- **`user.created`** → Create User document
- **`user.updated`** → Update User.role
- **`user.deleted`** → Delete User document

**Implementation**: [src/api/webhooks.ts](src/api/webhooks.ts:1)

---

## Database Schema

### User
```typescript
{
  firstName: string
  lastName: string
  role: "admin" | "user"
  email: string (unique, lowercase)
  clerkUserId: string (unique)
}
```

### SolarUnit
```typescript
{
  userId: ObjectId (ref: "User")
  serialNumber: string (unique)
  installationDate: Date
  capacity: number (watts)
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE"
  location: {
    latitude: number (-90 to 90)
    longitude: number (-180 to 180)
    city?: string
    country?: string
  }
}
```

### EnergyGenerationRecord
```typescript
{
  solarUnitId: ObjectId (ref: "SolarUnit")
  energyGenerated: number (Wh)
  timestamp: Date
  intervalHours: number (0.1-24, default: 2)
  // Weather data (synced from data-api)
  weatherCondition?: "clear" | "partly_cloudy" | "overcast" | "rain"
  cloudCover?: number (0-100%)
  temperature?: number (°C)
  precipitation?: number (mm)
  solarIrradiance?: number (W/m²)
  windSpeed?: number (km/h)
}
```

### Invoice
```typescript
{
  solarUnitId: ObjectId (ref: "SolarUnit")
  userId: ObjectId (ref: "User")
  billingPeriodStart: Date
  billingPeriodEnd: Date
  totalEnergyGenerated: number (kWh)
  paymentStatus: "PENDING" | "PAID" | "FAILED"
  paidAt?: Date
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```
**Indexes**: userId+createdAt, paymentStatus, solarUnitId+billingPeriodStart

### Anomaly
```typescript
{
  solarUnitId: ObjectId (ref: "SolarUnit", indexed)
  type: "NIGHTTIME_GENERATION" | "ZERO_GENERATION_CLEAR_SKY" |
        "ENERGY_EXCEEDING_THRESHOLD" | "HIGH_GENERATION_BAD_WEATHER" |
        "LOW_GENERATION_CLEAR_WEATHER" | "SUDDEN_PRODUCTION_DROP" |
        "ERRATIC_OUTPUT" | "FROZEN_GENERATION" (indexed)
  severity: "CRITICAL" | "WARNING" | "INFO" (indexed)
  detectedAt: Date (indexed)
  affectedPeriod: { start: Date, end?: Date }
  energyRecordIds: ObjectId[] (ref: "EnergyGenerationRecord")
  description: string
  metadata: {
    expectedValue?: number
    actualValue?: number
    deviation?: number
    threshold?: string
  }
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "FALSE_POSITIVE" (indexed)
  acknowledgedAt?: Date
  acknowledgedBy?: ObjectId (ref: "User")
  resolvedAt?: Date
  resolutionNotes?: string
}
```
**Compound Indexes**: solarUnitId+detectedAt, solarUnitId+status+severity

---

## Background Jobs

### 1. Data Synchronization
**Schedule**: Daily at 00:00 (midnight)
**Cron**: `0 0 * * *`
**Job**: `syncEnergyGenerationRecords()`

**Process**:
1. Fetch all solar units from MongoDB
2. For each unit, get latest synced timestamp
3. Call Data API with `sinceTimestamp` parameter
4. Validate data with Zod schemas
5. Insert new records into MongoDB
6. Log sync results

**Implementation**: [src/application/background/sync-energy-generation-records.ts](src/application/background/sync-energy-generation-records.ts:1)

### 2. Invoice Generation
**Schedule**: Daily at 01:00 AM
**Cron**: `0 1 * * *`
**Job**: `generateMonthlyInvoices()`

**Process**:
1. Fetch all active solar units
2. For each unit, check if monthly billing period has elapsed (based on installation date)
3. Calculate total energy generated in billing period
4. Create invoice with status "PENDING"
5. Log invoice creation

**Implementation**: [src/application/background/generate-invoices.ts](src/application/background/generate-invoices.ts:1)

### 3. Anomaly Detection
**Schedule**: Every 6 hours
**Cron**: `0 */6 * * *`
**Job**: `runAnomalyDetectionForAllUnits()`

**Process**:
1. Fetch all solar units
2. For each unit, run 5 detection algorithms
3. Save detected anomalies (with deduplication)
4. Log detection results

**Implementation**: [src/infrastructure/anomaly-detection-scheduler.ts](src/infrastructure/anomaly-detection-scheduler.ts:1)

---

## Anomaly Detection

### AnomalyDetector Class
**File**: [src/application/anomaly-detection.ts](src/application/anomaly-detection.ts:1)

### Detection Algorithms

#### 1. Nighttime Generation Detection
- **Type**: `NIGHTTIME_GENERATION`
- **Severity**: CRITICAL
- **Logic**: Energy > 10Wh between 19:00-06:00 UTC
- **Indicates**: Sensor malfunction or data recording error

#### 2. Zero Generation Clear Sky Detection
- **Type**: `ZERO_GENERATION_CLEAR_SKY`
- **Severity**: CRITICAL
- **Logic**: 0Wh during peak hours (10:00-14:00 UTC)
- **Indicates**: System failure, panel disconnection, inverter malfunction

#### 3. Energy Exceeding Threshold Detection
- **Type**: `ENERGY_EXCEEDING_THRESHOLD`
- **Severity**: CRITICAL
- **Logic**: Energy > (Capacity × intervalHours)
- **Indicates**: Data corruption or sensor miscalculation

#### 4. Weather-Performance Mismatch Detection
- **Types**:
  - `HIGH_GENERATION_BAD_WEATHER` (WARNING)
  - `LOW_GENERATION_CLEAR_WEATHER` (WARNING)
- **Logic**:
  - High output (>500Wh) during rain/overcast conditions
  - Low output (<200Wh) during clear sky peak hours
- **Indicates**: Weather sensor malfunction or panel issues

#### 5. Frozen Generation Detection
- **Type**: `FROZEN_GENERATION`
- **Severity**: WARNING
- **Logic**: ≥4 consecutive identical energy values (excluding nighttime zeros)
- **Indicates**: Frozen sensors or communication failure

### Deduplication
Before saving anomalies, the system checks for existing anomalies with:
- Same solar unit
- Same type
- Same affected period
- Status not "RESOLVED"

**Implementation**: Prevents duplicate alerts for the same issue

---

## Payment Integration

### Stripe Embedded Checkout Flow

1. **User requests payment** for an invoice
2. **Backend creates Stripe Checkout Session**:
   ```typescript
   stripe.checkout.sessions.create({
     ui_mode: "embedded",
     line_items: [{
       price: STRIPE_PRICE_ID,
       quantity: invoice.totalEnergyGenerated  // kWh
     }],
     mode: "payment",
     metadata: { invoiceId: invoice._id }
   })
   ```
3. **Frontend displays embedded checkout** using `clientSecret`
4. **Stripe processes payment**
5. **Stripe sends webhook** to `/api/stripe/webhook`
6. **Backend updates invoice**:
   - `paymentStatus` = "PAID"
   - `paidAt` = current timestamp

**Security**:
- Verifies user owns invoice before creating session
- Validates webhook signature using `STRIPE_WEBHOOK_SECRET`
- Uses metadata to link checkout session to invoice

**Implementation**:
- [src/application/payment.ts](src/application/payment.ts:1)
- [src/api/payment.ts](src/api/payment.ts:1)

---

## Webhooks

### Clerk Webhook
**Endpoint**: `POST /api/webhooks/clerk`
**File**: [src/api/webhooks.ts](src/api/webhooks.ts:1)

**Events Handled**:
1. **`user.created`**: Creates User document in MongoDB
2. **`user.updated`**: Updates User.role from publicMetadata
3. **`user.deleted`**: Deletes User from MongoDB

**Security**:
- Verifies webhook signature using `CLERK_WEBHOOK_SIGNING_SECRET`
- Requires raw body for signature verification

**CRITICAL**: Must be placed BEFORE `express.json()` middleware in [src/index.ts](src/index.ts:1)

### Stripe Webhook
**Endpoint**: `POST /api/stripe/webhook`
**File**: [src/api/payment.ts](src/api/payment.ts:1)

**Events Handled**:
1. **`checkout.session.completed`**: Payment succeeded immediately
2. **`checkout.session.async_payment_succeeded`**: Async payment succeeded
3. **`checkout.session.async_payment_failed`**: Payment failed

**Actions**:
- Updates Invoice.paymentStatus ("PAID" or "FAILED")
- Sets Invoice.paidAt timestamp

**Security**:
- Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
- Requires raw body for signature verification

**CRITICAL**: Must be placed BEFORE `express.json()` middleware in [src/index.ts](src/index.ts:1)

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URL` | MongoDB connection string | `mongodb+srv://...` |
| `PORT` | Server port | `8000` |
| `CLERK_PUBLISHABLE_KEY` | Clerk public key | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_test_...` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk webhook secret | `whsec_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `STRIPE_PRICE_ID` | Stripe price ID for invoices | `price_...` |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated) | `http://localhost:5173,https://...` |

---

## Deployment

### Production Deployment (Render)

**Deployed URL**: [https://fed-4-back-end-sandali.onrender.com](https://fed-4-back-end-sandali.onrender.com)

**Build Command**:
```bash
npm run build
```

**Start Command**:
```bash
npm start
```

**Environment Variables**: Set all variables from `.env` in Render dashboard

**Important Configuration**:
- **Health Check Path**: `/` (returns 200 OK)
- **Region**: Choose closest to MongoDB Atlas cluster
- **Auto-Deploy**: Enable for main branch

### MongoDB Atlas Setup

1. Create MongoDB Atlas cluster
2. Whitelist Render IP addresses (or allow all: `0.0.0.0/0`)
3. Create database user with read/write permissions
4. Copy connection string to `MONGODB_URL`

### Webhook Configuration

**Clerk**:
1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://fed-4-back-end-sandali.onrender.com/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret to `CLERK_WEBHOOK_SIGNING_SECRET`

**Stripe**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://fed-4-back-end-sandali.onrender.com/api/stripe/webhook`
3. Subscribe to: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start development server with hot reload |
| `build` | `npm run build` | Compile TypeScript to JavaScript |
| `start` | `npm start` | Run production build |
| `seed` | `npm run seed` | Seed database with test data |
| `clear:anomalies` | `npm run clear:anomalies` | Delete all anomalies |
| `clear:data` | `npm run clear:data` | Full database reset |
| `debug:frozen` | `npm run debug:frozen` | Debug frozen detection |
| `test:detection` | `npm run test:detection` | Test anomaly detection |

---

## Development Tips

### Testing Anomaly Detection

1. **Seed the data-api** with test anomalies:
```bash
cd ../zolar-data-api
npm run seed
```

2. **Trigger manual detection**:
```bash
curl -X POST http://localhost:8000/api/anomalies/trigger-detection \
  -H "Authorization: Bearer <your-clerk-token>"
```

3. **Check results**:
```bash
curl http://localhost:8000/api/anomalies/me \
  -H "Authorization: Bearer <your-clerk-token>"
```

### Testing Payment Flow

1. **Use Stripe test cards**:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

2. **Test webhook locally**:
```bash
stripe listen --forward-to localhost:8000/api/stripe/webhook
```

3. **Trigger test webhook**:
```bash
stripe trigger checkout.session.completed
```

### Database Inspection

**MongoDB Compass**: Connect using `MONGODB_URL` to inspect data visually

**MongoDB Shell**:
```bash
mongosh "mongodb+srv://..."
use zolar
db.energygenerationrecords.find().limit(10)
db.anomalies.countDocuments({ status: "OPEN" })
```

---

## Common Issues & Solutions

### Issue: Webhooks not working locally
**Solution**: Use ngrok tunnel and configure webhook URLs in Clerk/Stripe dashboards

### Issue: CORS errors from frontend
**Solution**: Add frontend URL to `FRONTEND_URL` in `.env` (comma-separated for multiple)

### Issue: Anomaly detection not running
**Solution**: Check cron job logs. Verify energy records exist in database. Run `npm run test:detection`

### Issue: Payment session creation fails
**Solution**: Verify `STRIPE_PRICE_ID` is correct. Check invoice belongs to authenticated user.

---

## API Documentation

For detailed API request/response examples, import the following into Postman or Thunder Client:

**Base URL**: `http://localhost:8000/api`

**Authentication Header**:
```
Authorization: Bearer <clerk-jwt-token>
```

Get your token from the Clerk session in the frontend application.

---

## License

This project is part of a fullstack development bootcamp assignment.

---

## Contributors

- **Developer**: Sandali Sandagomi
- **Course**: Fullstack Development Bootcamp - Day 17

---

## Support

For issues or questions:
1. Check the [Common Issues](#common-issues--solutions) section
2. Review the [API Endpoints](#api-endpoints) documentation
3. Inspect server logs for detailed error messages
4. Contact: sandalisandagomi@gmail.com

---

**Built with ❤️ using TypeScript, Express, MongoDB, Clerk, and Stripe**
