# Backend Setup Guide

This guide explains how to set up a Node.js/Express backend to serve the API endpoints for the UPC Inventory system.

---

## Architecture Overview

The system has three main layers:

```
┌─────────────────────────────────────────────────┐
│         React Frontend (Vite)                   │
│  - AuthContextNew (login, registration)         │
│  - Components (forms, reservations)             │
│  - HTTP requests to backend API                 │
└─────────────┬───────────────────────────────────┘
              │ HTTP (Bearer tokens)
              ▼
┌─────────────────────────────────────────────────┐
│    Node.js Express Backend                      │
│  - REST API routes (/api/...)                   │
│  - Request validation & auth middleware         │
│  - Calls to business logic services             │
└─────────────┬───────────────────────────────────┘
              │ Supabase SDK
              ▼
┌─────────────────────────────────────────────────┐
│      Supabase PostgreSQL Database               │
│  - carreras, alumnos, inventory_reservations    │
│  - authentication & row-level security (RLS)    │
└─────────────────────────────────────────────────┘
```

---

## Option 1: Express Backend (Recommended)

### 1.1 Project Setup

Create a separate Node.js backend project:

```bash
mkdir upc-inventory-backend
cd upc-inventory-backend
npm init -y
npm install express cors dotenv @supabase/supabase-js typescript ts-node @types/express @types/node
npx tsc --init
```

### 1.2 Project Structure

```
upc-inventory-backend/
├── src/
│   ├── services/
│   │   ├── StudentService.ts
│   │   ├── AuthService.ts
│   │   └── ReservationService.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── students.ts
│   │   └── reservations.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── types/
│   │   └── Database.ts
│   ├── app.ts
│   └── supabaseClient.ts
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

### 1.3 Environment Variables

Create `.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server
PORT=5000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173
```

Create `.env.example` for the repository:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 1.4 Supabase Client (src/supabaseClient.ts)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

### 1.5 Copy Service Files

Copy these files from the frontend project:
- `src/services/StudentService.ts`
- `src/services/AuthService.ts`
- `src/services/ReservationService.ts`
- `src/types/Database.ts`

**Note**: Update imports to use the backend's supabaseClient.

### 1.6 Auth Middleware (src/middleware/auth.ts)

```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from '@/services/AuthService';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.slice(7);

  try {
    const studentId = await authService.verifySessionToken(token);
    if (!studentId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token',
      });
    }
    req.user = { id: studentId };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}
```

### 1.7 Route Files

#### src/routes/auth.ts

```typescript
import { Router, Request, Response } from 'express';
import { studentService } from '@/services/StudentService';
import { authService } from '@/services/AuthService';
import type { RegisterRequest } from '@/types/Database';

const router = Router();

/**
 * POST /auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, nombre, apellido, carrera_id }: RegisterRequest = req.body;

    if (!email || !nombre || !apellido || !carrera_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    await studentService.registerStudent({
      email,
      nombre,
      apellido,
      carrera_id,
    });

    const alumno = await studentService.getStudentByEmail(email);

    res.status(201).json({
      success: true,
      alumno,
    });
  } catch (error) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const result = await authService.requestMagicLink(email);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * POST /auth/verify-token
 */
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    const result = await authService.verifyToken(token);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
    });
  }
});

export default router;
```

#### src/routes/students.ts & src/routes/reservations.ts

Similar pattern - see [API_EXAMPLES.md](API_EXAMPLES.md) for endpoint specifications.

### 1.8 Main App (src/app.ts)

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from '@/routes/auth';
import studentRoutes from '@/routes/students';
import reservationRoutes from '@/routes/reservations';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/reservations', reservationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
});
```

### 1.9 Package.json Scripts

```json
{
  "scripts": {
    "dev": "ts-node src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "type-check": "tsc --noEmit"
  }
}
```

### 1.10 Running the Backend

```bash
npm run dev
# Server running on http://localhost:5000
```

Then update the frontend API base URL (update your fetch calls to use `http://localhost:5000/api`).

---

## Option 2: Supabase Edge Functions

If you prefer serverless, use Supabase Edge Functions:

### 2.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 2.2 Create an Edge Function

```bash
supabase functions new register --typescript
```

### 2.3 Function Implementation

```typescript
// supabase/functions/register/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { email, nombre, apellido, carrera_id } = await req.json();

  // Call your service logic here
  // const response = await studentService.registerStudent({ ... });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 2.4 Deploy

```bash
supabase functions deploy register
```

### 2.5 Call from Frontend

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/register`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({ email, nombre, apellido, carrera_id }),
});
```

---

## Option 3: Direct Supabase (Frontend-Only)

For simplicity, you can call Supabase directly from the frontend:

### 3.1 Update Services to Use Supabase

The services already do this! They use `supabaseClient` to call the database directly.

### 3.2 Setup RLS (Row Level Security)

Ensure RLS policies in your database allow frontend operations:

```sql
-- Allow students to view their own data
CREATE POLICY "Students can view own data"
  ON public.alumnos FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Allow insert for registration
CREATE POLICY "Allow registration"
  ON public.alumnos FOR INSERT
  WITH CHECK (true);
```

### 3.3 Considerations

**Pros:**
- No separate backend to deploy
- Direct database access
- Simple setup

**Cons:**
- Magic link token logic exposed to client
- Less control over business logic
- Security implications for sensitive operations

---

## Production Checklist

Before going live:

- [ ] Set `NODE_ENV=production`
- [ ] Use proper JWT library (jose) instead of mock tokens
- [ ] Implement email sending for magic links (remove token from response)
- [ ] Set up token invalidation blacklist
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS
- [ ] Set up CORS whitelist with specific frontend domain
- [ ] Implement rate limiting
- [ ] Add request logging and monitoring
- [ ] Test all endpoints thoroughly
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production environment (Heroku, Railway, etc.)

---

## Integration Workflow

1. **Frontend:** User submits registration form → calls `/api/auth/register`
2. **Backend:** Validates, creates student record, returns success
3. **Frontend:** User requests magic link → calls `/api/auth/login`
4. **Backend:** Generates token, sends email (or returns token in dev)
5. **Frontend:** User clicks email link → calls `/api/auth/verify-token` with token
6. **Backend:** Validates token, creates session token, returns session + user
7. **Frontend:** Stores session token in localStorage
8. **Frontend:** Subsequent requests include `Authorization: Bearer {sessionToken}`
9. **Backend:** Middleware validates token, attaches user to request
10. **Routes:** Execute business logic, return response

---

## Recommended: Express + TypeScript

We recommend the **Express backend option** because:

1. ✅ Full control over authentication logic
2. ✅ Easy to integrate email service
3. ✅ Scalable architecture
4. ✅ Type-safe with TypeScript
5. ✅ Easy to test

Quick start:

```bash
mkdir upc-inventory-backend && cd upc-inventory-backend
npminit -y
npm install express cors dotenv @supabase/supabase-js
npm install -D typescript ts-node @types/express @types/node
# Copy services from frontend
npm run dev
```

Then update frontend API calls to `http://localhost:5000/api`.
