# Complete Migration & Implementation Guide

This document provides a complete step-by-step guide to implement the new registration and reservation system.

---

## Overview

You're transitioning from Supabase Auth + simple reservations to a custom authentication system with student registration and carrera-based reservations.

**What Changes:**
- ✅ One-time registration (name + email + carrera)
- ✅ Magic link authentication (passwordless)
- ✅ Carrera stored with student, not per-reservation
- ✅ Clean service architecture (StudentService, AuthService, ReservationService)
- ✅ TypeScript types (Database.ts with DTOs)

**What Stays the Same:**
- ✅ Supabase PostgreSQL database
- ✅ React + Vite frontend
- ✅ Tailwind CSS styling
- ✅ Existing inventory products & units

---

## Phase 1: Database Setup

### 1.1 Execute SQL Migration

Run the migration to create new tables:

```bash
# In Supabase SQL Editor
# Path: supabase > SQL Editor
# Create new query and paste contents of:
# supabase/001_CREATE_CARRERAS_AND_ALUMNOS.sql
```

**File:** [supabase/001_CREATE_CARRERAS_AND_ALUMNOS.sql](supabase/001_CREATE_CARRERAS_AND_ALUMNOS.sql)

This creates:
- `carreras` table (5 sample majors)
- `alumnos` table with foreign key to carreras
- Updates `inventory_reservations` with `user_id` FK to alumnos
- Adds indexes and RLS policies
- Seeds initial data

**Verification:**

```sql
-- Check tables exist
SELECT * FROM carreras LIMIT 5;
SELECT * FROM alumnos LIMIT 5;
SELECT * FROM inventory_reservations LIMIT 5;

-- Verify foreign keys
SELECT 
  u.id,
  u.nombre,
  u.apellido,
  c.nombre as carrera,
  COUNT(ir.id) as reservation_count
FROM alumnos u
LEFT JOIN carreras c ON u.carrera_id = c.id
LEFT JOIN inventory_reservations ir ON u.id = ir.user_id
GROUP BY u.id, u.nombre, u.apellido, c.nombre;
```

### 1.2 Update RLS Policies (if needed)

The migration includes RLS, but verify in Supabase dashboard:

```
Authentication > Policies
```

You should see:
- `carreras` - readable by everyone
- `alumnos` - readable by authenticated users
- `inventory_reservations` - readable/writable by owner

---

## Phase 2: Frontend Services

### 2.1 Add New Service Files

Copy these to your `src/services/`:

1. **[src/types/Database.ts](src/types/Database.ts)**
   - TypeScript interfaces for all DB tables
   - DTOs for API requests/responses
   - Type aliases (Carrera, Alumno, InventoryReservation)

2. **[src/services/StudentService.ts](src/services/StudentService.ts)**
   - `getCarreras()` - fetch majors for dropdown
   - `registerStudent(request)` - create student profile
   - `getStudentByEmail(email)` - login lookups
   - `getStudentById(id)` - fetch profile with carrera join

3. **[src/services/AuthService.ts](src/services/AuthService.ts)**
   - `requestMagicLink(email)` - generate 15-min token
   - `verifyToken(token)` - validate and return sessionToken
   - `verifySessionToken(token)` - validate for API calls
   - `logout(studentId)` - clear session

4. **[src/services/ReservationService.ts](src/services/ReservationService.ts)**
   - `createReservation(studentId, request)` - create with auto carrera
   - `getStudentReservations(studentId)` - list all
   - `getReservationById(id)` - single reservation
   - `cancelReservation(id, studentId)` - ownership check
   - `getUnitAvailability(unitId, date)` - check conflicts

**Verification:**

```bash
# TypeScript should compile
npm run type-check
# or
npx tsc --noEmit
```

No compile errors should appear.

### 2.2 Update AuthContext

**Option A: Recommended - Use New Context**

Replace old AuthContext with new one:

```bash
# Backup old context
cp src/context/AuthContext.tsx src/context/AuthContext.tsx.backup

# Use new context
cp src/context/AuthContextNew.tsx src/context/AuthContext.tsx
```

**Option B: Gradual Migration**

Keep both contexts and import as needed:

```tsx
// New registrations
import { AuthProvider, useAuth } from '@/context/AuthContextNew';

// Old auth (legacy)
import { useAuth as useLegacyAuth } from '@/context/AuthContext';
```

Then migrate page by page.

### 2.3 Update App.tsx

```tsx
// src/App.tsx
import { AuthProvider } from '@/context/AuthContext';  // or AuthContextNew
import Router from '@/Router';

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
```

---

## Phase 3: Frontend Components

### 3.1 Create Registration Form

**File:** [src/components/RegistrationForm.tsx](FRONTEND_INTEGRATION.md#2-registration-form-component)

Copy this component and customize styling as needed.

**Usage:**

```tsx
// src/pages/Register.tsx
import RegistrationForm from '@/components/RegistrationForm';

export default function Register() {
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Account</h1>
      <RegistrationForm />
    </div>
  );
}
```

### 3.2 Update Login Form

**File:** [src/components/LoginForm.tsx](FRONTEND_INTEGRATION.md#3-login-form-component)

Replace magic link from old Supabase auth with new AuthService.

**Usage:**

```tsx
// src/pages/Login.tsx
import LoginForm from '@/components/LoginForm';

export default function Login() {
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <LoginForm />
    </div>
  );
}
```

### 3.3 Update Reservation Form

**Key Change:** Remove carrera field

**Before:**

```tsx
<select name="carrera_id" required>
  <option>Select carrera...</option>
</select>
```

**After:**

```tsx
{/* Carrera auto-filled from profile */}
<div className="bg-gray-50 p-3 rounded text-sm">
  <p>{alumno?.carrera?.nombre}</p>
</div>
```

**File:** [src/components/ReservationForm.tsx](FRONTEND_INTEGRATION.md#4-updated-reservation-form-without-carrera)

### 3.4 My Reservations Component

**File:** [src/components/MyReservations.tsx](FRONTEND_INTEGRATION.md#5-my-reservations-list-component)

Displays all reservations with carrera from profile.

---

## Phase 4: Backend Setup

You have 3 options. **We recommend Express.**

### Option A: Express Backend (Recommended)

**Guide:** [BACKEND_SETUP.md - Option 1: Express Backend](BACKEND_SETUP.md#option-1-express-backend-recommended)

Quick start:

```bash
mkdir ../upc-inventory-backend
cd ../upc-inventory-backend
npm init -y
npm install express cors dotenv @supabase/supabase-js
npm install -D typescript ts-node @types/express @types/node
```

Then:
1. Copy services from frontend
2. Create route files (auth, students, reservations)
3. Create main Express app
4. Copy `.env` setup
5. Start with `npm run dev`

### Option B: Supabase Edge Functions

**Guide:** [BACKEND_SETUP.md - Option 2: Supabase Edge Functions](BACKEND_SETUP.md#option-2-supabase-edge-functions)

Single serverless function per endpoint, deployed to Supabase.

### Option C: Frontend-Only with Direct Supabase

**Guide:** [BACKEND_SETUP.md - Option 3: Direct Supabase](BACKEND_SETUP.md#option-3-direct-supabase-frontend-only)

Call Supabase directly from frontend. Simpler but less secure.

---

## Phase 5: Integration Testing

### 5.1 Test Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@upc.edu.pe",
    "nombre": "Juan",
    "apellido": "Pérez",
    "carrera_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Expected:**
```json
{
  "success": true,
  "alumno": { ... }
}
```

### 5.2 Test Magic Link

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@upc.edu.pe"
  }'
```

**Expected:**
```json
{
  "success": true,
  "message": "If an account exists...",
  "token": "abc123xyz..."  // DEV ONLY - remove in production
}
```

### 5.3 Test Token Verification

```bash
curl -X POST http://localhost:5000/api/auth/verify-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123xyz..."
  }'
```

**Expected:**
```json
{
  "success": true,
  "sessionToken": "eyJhbGc...",
  "alumno": { ... }
}
```

### 5.4 Test Reservation (with Auth)

```bash
curl -X POST http://localhost:5000/api/reservations \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "...",
    "unit_id": "...",
    "start_at": "2025-03-17T14:00:00Z",
    "end_at": "2025-03-17T15:30:00Z",
    "purpose": "Class project"
  }'
```

**Expected:**
```json
{
  "success": true,
  "reservation": { ... }
}
```

**Full examples:** [API_EXAMPLES.md](API_EXAMPLES.md)

---

## Phase 6: Frontend-Backend Communication

### 6.1 Set API Base URL

Create environment variable:

```env
# .env
VITE_API_URL=http://localhost:5000/api
```

Or for production:

```env
VITE_API_URL=https://api.upc-inventario.com/api
```

### 6.2 Create API Client Hook (Optional)

```tsx
// src/hooks/useApi.ts
export function useApi() {
  const authToken = useAuthToken();
  const baseUrl = import.meta.env.VITE_API_URL;

  const request = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: authToken }),
        ...options.headers,
      },
    });
    return response.json();
  };

  return { request };
}
```

### 6.3 Use in Components

```tsx
const { request } = useApi();

const handleReservation = async (data) => {
  const result = await request('/reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (result.success) {
    // ...
  }
};
```

---

## Phase 7: Deployment

### 7.1 Frontend (Netlify/Vercel)

```bash
npm run build
# Deploy dist/ folder
```

Set environment variables in dashboard:

```
VITE_API_URL=https://api.upc-inventario.com/api
```

### 7.2 Backend (Heroku/Railway)

**Heroku:**

```bash
git init
git add .
git commit -m "Initial commit"
heroku create upc-inventory-api
git push heroku main
heroku config:set SUPABASE_URL=...
heroku config:set SUPABASE_SERVICE_ROLE_KEY=...
heroku open
```

**Railway:**

```bash
railway init
# Follow prompts
railway up
```

### 7.3 Database (Supabase Production)

1. Create separate Supabase project for production
2. Run migration SQL
3. Update backend `.env` with production Supabase keys
4. Test all endpoints

---

## Phase 8: Post-Launch Checklist

- [ ] Database schema verified (carreras, alumnos, inventory_reservations)
- [ ] Services compile without errors (`npm run type-check`)
- [ ] Registration form works (creates student record)
- [ ] Login form works (sends magic link / returns token dev)
- [ ] Token verification works (returns sessionToken)
- [ ] Reservation creation works (auto pulls carrera from profile)
- [ ] Reservation form removed carrera field
- [ ] My Reservations shows all user reservations
- [ ] Auth persists across page reloads (localStorage)
- [ ] Backend API responds on correct URL
- [ ] CORS configured for frontend domain
- [ ] Magic link emails sending (production)
- [ ] JWT tokens properly signed (production, not mock)
- [ ] Rate limiting enabled
- [ ] Error logging set up
- [ ] Monitoring/alerts configured

---

## File Structure Reference

```
frontend (React + Vite)
├── src/
│   ├── services/
│   │   ├── StudentService.ts ✅ NEW
│   │   ├── AuthService.ts ✅ NEW
│   │   └── ReservationService.ts ✅ NEW
│   ├── context/
│   │   ├── AuthContext.tsx ❌ OLD (backup)
│   │   └── AuthContextNew.tsx ✅ NEW
│   ├── components/
│   │   ├── RegistrationForm.tsx ✅ NEW
│   │   ├── LoginForm.tsx ✅ UPDATED
│   │   ├── ReservationForm.tsx ✅ UPDATED (no carrera)
│   │   └── MyReservations.tsx ✅ NEW
│   ├── pages/
│   │   ├── Login.tsx ✅ UPDATED
│   │   ├── Register.tsx ✅ NEW
│   │   └── Catalog.tsx ✅ UPDATED (reservation form)
│   ├── types/
│   │   └── Database.ts ✅ NEW
│   └── App.tsx ✅ UPDATED
├── supabase/
│   ├── 001_CREATE_CARRERAS_AND_ALUMNOS.sql ✅ NEW
│   └── (existing migrations)
├── API_EXAMPLES.md ✅ NEW
├── FRONTEND_INTEGRATION.md ✅ NEW
├── BACKEND_SETUP.md ✅ NEW
└── MIGRATION_GUIDE.md ✅ YOU ARE HERE

backend (Node.js + Express) - SEPARATE PROJECT
├── src/
│   ├── services/ (copied from frontend)
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── students.ts
│   │   └── reservations.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── types/ (copied from frontend)
│   ├── app.ts
│   └── supabaseClient.ts
├── .env
├── package.json
└── tsconfig.json
```

---

## Common Issues & Solutions

### Issue: "Cannot find module 'express'"

**Solution:** Only the backend needs express, not the frontend. Make sure:
- If in frontend: use Option C (Direct Supabase)
- If in backend: install `npm install express`

### Issue: "Token has expired"

**Solution:** Magic link tokens expire after 15 minutes. User must request new one.

### Issue: "Student not found"

**Solution:** Verify student registered first, then check carrera_id is valid UUID.

### Issue: "Reservation exceeds 2 hours"

**Solution:** This is by design. Shorten reservation duration.

### Issue: "Unit is not available"

**Solution:** There's an overlapping reservation for that time slot. Choose different time.

### Issue: "Session token invalid"

**Solution:** Check:
1. Token stored in localStorage
2. Token not expired (24 hours)
3. Authorization header format: `Bearer {token}`

---

## Next Steps

1. **Start here:** [BACKEND_SETUP.md](BACKEND_SETUP.md) - choose your backend option
2. **Set up database:** Run [001_CREATE_CARRERAS_AND_ALUMNOS.sql](supabase/001_CREATE_CARRERAS_AND_ALUMNOS.sql)
3. **Update frontend:** Follow [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md)
4. **Test API:** Use [API_EXAMPLES.md](API_EXAMPLES.md) for curl/Postman examples
5. **Go live:** Deploy frontend + backend

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Express Docs:** https://expressjs.com/
- **React Hooks:** https://react.dev/reference/react/hooks
- **TypeScript:** https://www.typescriptlang.org/docs/

---

**Created:** March 16, 2025  
**Version:** 1.0  
**Status:** Ready to implement
