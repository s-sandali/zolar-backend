# Zolar Backend API

> **Solar Energy Monitoring System - Backend Service**

A production-ready REST API for managing solar panel units, monitoring energy generation, detecting anomalies, processing payments, and providing analytics.

## 🌐 Deployed Links

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | [https://fed-4-front-end-sandali.netlify.app](https://fed-4-front-end-sandali.netlify.app) | ✅ Live |
| **Backend API** | [https://fed-4-back-end-sandali.onrender.com](https://fed-4-back-end-sandali.onrender.com) | ✅ Live |
| **Data API** | [https://fed-4-data-api-sandali.onrender.com](https://fed-4-data-api-sandali.onrender.com) | ✅ Live |


---

## 📑 Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Key Functionalities](#key-functionalities)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Deployed Links](#deployed-links)

---

## 🎯 Project Overview

The Zolar Backend is the core API service powering the solar energy monitoring platform. It handles user authentication, solar unit management, real-time energy tracking, intelligent anomaly detection with 5+ algorithms, weather-integrated analytics, automated invoice generation, and Stripe payment processing.

**Tech Stack**: Express.js 5 • TypeScript • MongoDB • Mongoose • Clerk • Stripe • node-cron • Zod • Open-Meteo API

---


**Clean 4-Layer Architecture**: API → Application → Domain → Infrastructure

**Background Jobs**:
- **Daily Sync** (00:00): Fetch energy data from Data API
- **Invoice Generation** (01:00): Create monthly invoices
- **Anomaly Detection** (every 6 hours): Scan for system issues

---

## ⚡ Key Functionalities

### Core Features
- 👤 **User Management**: Clerk-based authentication, role-based access (user/admin), webhook sync
- ⚙️ **Solar Unit Management**: CRUD operations, location tracking, status monitoring
- 📊 **Energy Monitoring**: Track energy generation with 2-hour interval granularity, weather data integration
- 🌤️ **Weather Integration**: Real-time weather from Open-Meteo API, solar impact score calculation

### Intelligent Anomaly Detection

5 detection algorithms running every 6 hours:

| Algorithm | Severity | Detection Logic |
|-----------|----------|----------------|
| **Nighttime Generation** | CRITICAL | Energy > 10Wh during 19:00-06:00 (sensor malfunction) |
| **Zero Generation Clear Sky** | CRITICAL | 0Wh during peak hours 10:00-14:00 (system failure) |
| **Energy Exceeding Capacity** | CRITICAL | Output > physical capacity × interval (data corruption) |
| **Weather Mismatch** | WARNING | High output in rain OR low output in clear weather |
| **Frozen Generation** | WARNING | ≥4 consecutive identical values (stuck sensors) |

### Advanced Analytics
- 📈 **Weather-Adjusted Performance**: Expected vs actual energy based on weather conditions
- 🎯 **System Health Score**: 0-100 rating with weighted factors (anomalies, performance, uptime, resolution)
- 📊 **Anomaly Distribution**: Breakdown by type, severity, status with trend analysis

### Payment Processing
- 💳 **Stripe Integration**: Embedded checkout, automated invoice generation, webhook confirmation
- 📄 **Invoice Management**: Monthly billing, payment status tracking, retry support

### API Security
- 🔒 **JWT Authentication**: Clerk middleware validates all protected routes
- ✅ **Webhook Verification**: Signature validation for Clerk and Stripe webhooks
- 🛡️ **CORS**: Whitelisted origins only, credential support
- 🔐 **Input Validation**: Zod schemas for all request bodies

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account ([https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas))
- Clerk account ([https://clerk.com](https://clerk.com))
- Stripe account ([https://stripe.com](https://stripe.com))
- ngrok (for local webhook testing) ([https://ngrok.com](https://ngrok.com))

### Installation Steps

1. **Navigate to project directory**:
```bash
cd zolar-back-end
```

2. **Install dependencies**:
```bash
npm install
```

3. **Create `.env` file** (see [Environment Variables](#environment-variables) section below)

4. **Seed the database** (creates test user & solar unit):
```bash
npm run seed
```

This creates:
- Test user: `sandalisandagomi@gmail.com` (admin role)
- Test solar unit: `SU-0001` (5000W capacity)

5. **Start development server**:
```bash
npm run dev
```

6. **Access the API**:
```
http://localhost:8000
```

### Webhook Setup (Local Development)

For Clerk and Stripe webhooks to work locally:

1. **Install ngrok**:
```bash
npm install -g ngrok
```

2. **Start ngrok tunnel** (use existing `ngrok.yml` config):
```bash
ngrok start --config=ngrok.yml
```

3. **Configure webhook endpoints**:
   - **Clerk Dashboard** → Webhooks → Add endpoint:
     - URL: `https://your-ngrok-url.ngrok-free.dev/api/webhooks/clerk`
     - Events: `user.created`, `user.updated`, `user.deleted`

   - **Stripe Dashboard** → Developers → Webhooks → Add endpoint:
     - URL: `https://your-ngrok-url.ngrok-free.dev/api/stripe/webhook`
     - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm run seed` | Seed database with test data |
| `npm run clear:anomalies` | Delete all anomalies |
| `npm run test:detection` | Test anomaly detection algorithms |

---

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/zolar

# Server
PORT=8000

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# CORS (comma-separated for multiple origins)
FRONTEND_URL=http://localhost:5173,https://fed-4-front-end-sandali.netlify.app
```

### How to Get API Keys

**MongoDB Atlas** ([https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)):
1. Create a free cluster
2. Go to "Database Access" → Create database user
3. Go to "Network Access" → Add IP address (0.0.0.0/0 for development)
4. Click "Connect" → "Connect your application" → Copy connection string

**Clerk** ([https://dashboard.clerk.com](https://dashboard.clerk.com)):
1. Create an application
2. Go to "API Keys"
3. Copy:
   - Publishable key → `CLERK_PUBLISHABLE_KEY`
   - Secret key → `CLERK_SECRET_KEY`
4. Go to "Webhooks" → Create endpoint → Copy signing secret → `CLERK_WEBHOOK_SIGNING_SECRET`

**Stripe** ([https://dashboard.stripe.com](https://dashboard.stripe.com)):
1. Go to "Developers" → "API keys"
2. Copy:
   - Secret key (test mode) → `STRIPE_SECRET_KEY`
3. Go to "Products" → Create a product → Copy price ID → `STRIPE_PRICE_ID`
4. Go to "Developers" → "Webhooks" → Add endpoint → Copy signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 🚀 Deployment

### Deploy to Render

1. **Create Web Service**:
   - Connect GitHub repository
   - Select "Node" environment

2. **Build Settings**:
   - Build command: `npm run build`
   - Start command: `npm start`

3. **Environment Variables**: Add all variables from your `.env` file in Render Dashboard → Environment

4. **Deploy**: Click "Create Web Service"

### MongoDB Atlas Setup

1. **Whitelist Render IPs**:
   - Go to "Network Access"
   - Click "Add IP Address"
   - Select "Allow access from anywhere" (0.0.0.0/0)

2. **Update connection string**: Use the MongoDB Atlas connection string in `MONGODB_URL`

### Webhook Configuration (Production)

**Clerk**:
1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://fed-4-back-end-sandali.onrender.com/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`

**Stripe**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://fed-4-back-end-sandali.onrender.com/api/stripe/webhook`
3. Subscribe to: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`

### Production Checklist
- ✅ Use production MongoDB cluster
- ✅ Use production Clerk keys (`pk_live_...`, `sk_live_...`)
- ✅ Use production Stripe keys (`sk_live_...`)
- ✅ Configure production webhook endpoints
- ✅ Add production frontend URL to `FRONTEND_URL`
- ✅ Set `NODE_ENV=production`

---



## 📞 Support

**Developer**: Sandali Sandagomi
**Email**: sandalisandagomi@gmail.com


---

**Built with ❤️ using TypeScript, Express, MongoDB, Clerk, and Stripe**
