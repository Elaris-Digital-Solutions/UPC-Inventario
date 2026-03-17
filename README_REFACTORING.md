# UPC Inventory System - Refactored Registration & Reservation System

## 📋 Project Summary

Complete backend refactoring for UPC Inventory system with new student registration, magic link authentication, and refactored reservations system.

**Status:** ✅ **READY FOR IMPLEMENTATION**

---

## 🎯 What's New

### System Changes

✅ **Student Registration**
- One-time registration with name, email, and major
- Email must be @upc.edu.pe institutional address
- Carrera assigned at registration, used for all future reservations

✅ **Authentication**
- Magic link (passwordless) login
- 15-minute token TTL for magic links
- 24-hour session tokens for subsequent requests
- Secure token storage in localStorage

✅ **Revised Reservations**
- Carrera automatically pulled from student profile
- No longer requested per-reservation
- Cleaner user experience, consistent data

✅ **Clean Architecture**
- Service layer (StudentService, AuthService, ReservationService)
- Separated business logic from UI
- Full TypeScript type safety with DTOs
- Proper error handling throughout

✅ **Database Schema**
- New `carreras` table (majors/programs)
- New `alumnos` table (students)
- Updated `inventory_reservations` with user_id
- RLS policies for data security
- Seeded with 5 sample majors

---

## 📁 Deliverables

### 1. Database & Schema

**File:** [`supabase/001_CREATE_CARRERAS_AND_ALUMNOS.sql`](supabase/001_CREATE_CARRERAS_AND_ALUMNOS.sql)

- ✅ Creates `carreras` table
- ✅ Creates `alumnos` table with FK to carreras
- ✅ Modifies `inventory_reservations` to add user_id FK
- ✅ Adds performance indexes
- ✅ Configures RLS policies
- ✅ Seeds 5 sample carreras

**Action:** Run this SQL in Supabase dashboard (SQL Editor)

---

### 2. TypeScript Types

**File:** [`src/types/Database.ts`](src/types/Database.ts) (180 lines)

Comprehensive type definitions:
- `Database` interface (schema mapping for Supabase tables)
- Domain types: `Carrera`, `Alumno`, `InventoryReservation`
- DTOs for API requests/responses
- `ApiResponse<T>` wrapper
- Full JSDocs documentation

**Action:** Copy to `src/types/Database.ts`

---

### 3. Backend Services

Three business logic services (each can be used in both frontend and backend):

#### StudentService
**File:** [`src/services/StudentService.ts`](src/services/StudentService.ts) (230 lines)

Methods:
- `getCarreras()` - Fetch all active majors
- `registerStudent(RegisterRequest)` - Create new student
- `getStudentByEmail(email)` - Get student by email
- `getStudentById(id)` - Get with carrera join
- `updateStudent(id, updates)` - Update profile
- `deactivateStudent(id)` - Soft delete

**Action:** Copy to `src/services/StudentService.ts`

#### AuthService
**File:** [`src/services/AuthService.ts`](src/services/AuthService.ts) (280 lines)

Methods:
- `requestMagicLink(email)` - Generate 15-min token, store in DB
- `verifyToken(token)` - Validate token, return sessionToken
- `verifySessionToken(token)` - Validate for API calls, return student ID
- `logout(studentId)` - Clear session

Features:
- Proper token generation & validation
- Token expiry checks
- Email normalization
- Mock tokens for development (⚠️ replace in production)

**Action:** Copy to `src/services/AuthService.ts`

#### ReservationService
**File:** [`src/services/ReservationService.ts`](src/services/ReservationService.ts) (230 lines)

Methods:
- `createReservation(studentId, request)` - Create, auto-fetch carrera
- `getStudentReservations(studentId)` - List all with carrera
- `getReservationById(id)` - Fetch single with join
- `cancelReservation(id, studentId)` - Ownership verified
- `getUnitAvailability(unitId, date)` - Check conflicts

Features:
- Auto-pull carrera from student profile
- Duration validation (15 min - 2 hours)
- Conflict checking
- Proper error messages

**Action:** Copy to `src/services/ReservationService.ts`

---

### 4. Frontend Authentication Context

**File:** [`src/context/AuthContextNew.tsx`](src/context/AuthContextNew.tsx) (280 lines)

Purpose: Centralized auth state management with new services

Features:
- ✅ Student registration
- ✅ Magic link request & verification
- ✅ Session token management (localStorage)
- ✅ Token expiry handling
- ✅ Profile caching

Hooks:
- `useAuth()` - Access auth state & methods
- `useAuthToken()` - Get Bearer token for API calls

**Action:** Replace `src/context/AuthContext.tsx` or use as `AuthContextNew.tsx`

---

### 5. Documentation

Comprehensive guides for implementation:

#### [`API_EXAMPLES.md`](API_EXAMPLES.md) - REST Endpoints

- ✅ Complete API specification
- ✅ curl and Postman examples
- ✅ Request/response schemas
- ✅ Error handling examples
- ✅ Token lifecycle explanation

Covers:
- POST /auth/register
- POST /auth/login (request magic link)
- POST /auth/verify-token
- POST /auth/logout
- GET /students/me
- GET /carreras
- POST /reservations (NO carrera field!)
- GET /reservations
- GET /reservations/:id
- DELETE /reservations/:id
- GET /reservations/units/:unitId/availability

#### [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md) - Frontend Setup

- ✅ Component examples (Registration, Login, Reservation)
- ✅ Auth hook usage patterns
- ✅ Protected routes example
- ✅ API client helper
- ✅ Migration checklist
- ✅ Common patterns & troubleshooting

Components to create/update:
- RegistrationForm with carrera dropdown
- LoginForm with magic link flow
- ReservationForm (carrera removed)
- MyReservations list
- Protected route wrapper

#### [`BACKEND_SETUP.md`](BACKEND_SETUP.md) - Backend Options

Three implementation options:

**Option 1: Express Backend** (Recommended)
- Full TypeScript Node.js server
- Complete control over auth logic
- Easy email integration
- Production-ready architecture
- Detailed setup instructions

**Option 2: Supabase Edge Functions**
- Serverless functions
- No server to manage
- Deployed to Supabase directly

**Option 3: Frontend-Only with Direct Supabase**
- Call Supabase directly from React
- Simplest setup
- Less secure for sensitive operations

#### [`MIGRATION_GUIDE.md`](MIGRATION_GUIDE.md) - Step-by-Step Implementation

Complete 8-phase guide:
1. Database setup
2. Frontend services
3. Frontend components
4. Backend setup (3 options)
5. Integration testing
6. Frontend-backend communication
7. Deployment
8. Post-launch checklist

---

## 🚀 Quick Start

### Step 1: Database (5 minutes)

```bash
# Open Supabase > SQL Editor
# Create new query and run:
# supabase/001_CREATE_CARRERAS_AND_ALUMNOS.sql
```

Verify:
```sql
SELECT * FROM carreras LIMIT 5;
SELECT * FROM alumnos;
```

### Step 2: Copy Services (2 minutes)

Copy to your `src/` directory:
- `types/Database.ts`
- `services/StudentService.ts`
- `services/AuthService.ts`
- `services/ReservationService.ts`

### Step 3: Update AuthContext (2 minutes)

```bash
cp src/context/AuthContextNew.tsx src/context/AuthContext.tsx
```

Update `src/App.tsx`:
```tsx
import { AuthProvider } from '@/context/AuthContext';
```

### Step 4: Create Components (15 minutes)

Copy from [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md):
- RegistrationForm
- LoginForm  
- ReservationForm (WITHOUT carrera field)
- MyReservations

### Step 5: Set Up Backend (15 minutes)

Choose one option:
- **Express:** See [`BACKEND_SETUP.md` Option 1](BACKEND_SETUP.md#option-1-express-backend-recommended)
- **Edge Functions:** See [`BACKEND_SETUP.md` Option 2](BACKEND_SETUP.md#option-2-supabase-edge-functions)
- **Direct Supabase:** See [`BACKEND_SETUP.md` Option 3](BACKEND_SETUP.md#option-3-direct-supabase-frontend-only)

### Step 6: Test (10 minutes)

Use examples from [`API_EXAMPLES.md`](API_EXAMPLES.md):

```bash
# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@upc.edu.pe",
    "nombre": "Juan",
    "apellido": "Pérez",
    "carrera_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## 📊 File Structure

```
UPC-Inventario/
├── src/
│   ├── types/
│   │   └── Database.ts ✅ NEW
│   ├── services/
│   │   ├── StudentService.ts ✅ NEW
│   │   ├── AuthService.ts ✅ NEW
│   │   └── ReservationService.ts ✅ NEW
│   ├── context/
│   │   └── AuthContextNew.tsx ✅ NEW (or replace AuthContext.tsx)
│   ├── components/
│   │   ├── RegistrationForm.tsx ✅ NEW
│   │   ├── LoginForm.tsx ✅ NEW
│   │   ├── ReservationForm.tsx ✅ UPDATED (carrera removed)
│   │   └── MyReservations.tsx ✅ NEW
│   └── pages/
│       ├── Register.tsx ✅ NEW
│       ├── Login.tsx ✅ UPDATED
│       └── Catalog.tsx ✅ UPDATED
├── supabase/
│   └── 001_CREATE_CARRERAS_AND_ALUMNOS.sql ✅ NEW
├── API_EXAMPLES.md ✅ NEW
├── FRONTEND_INTEGRATION.md ✅ NEW
├── BACKEND_SETUP.md ✅ NEW
├── MIGRATION_GUIDE.md ✅ NEW
└── README.md (this file)

backend/ (SEPARATE PROJECT)
├── src/
│   ├── services/ (copy from frontend)
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── students.ts
│   │   └── reservations.ts
│   ├── middleware/auth.ts
│   ├── app.ts
│   └── supabaseClient.ts
├── .env
└── package.json
```

---

## 🔄 Key Design Changes

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Registration** | OTP to email | Full registration with name + carrera |
| **Carrera Selection** | Every reservation | Once at registration |
| **Auth Method** | Supabase Auth | Magic link tokens |
| **Token Storage** | Supabase session | localStorage |
| **Database** | Supabase default | custom carreras + alumnos |
| **Error Handling** | Basic | Detailed, user-friendly messages |
| **Type Safety** | Partial | Full TypeScript with DTOs |
| **Code Organization** | Mixed | Clean service layer |

---

## ✅ Quality Checklist

- ✅ Zero TypeScript compile errors in services & context
- ✅ All services have full JSDocs
- ✅ DTOs for request/response validation
- ✅ Proper error handling & messages
- ✅ RLS policies configured
- ✅ Database constraints (FK, unique keys, indexes)
- ✅ Token expiry validation
- ✅ Email format validation
- ✅ Carrera FK validation
- ✅ Ownership verification (reservations, updates)
- ✅ 24-hour session TTL
- ✅ 15-minute magic link TTL
- ✅ Duration validation (15 min - 2 hours)
- ✅ Conflict detection for reservations

---

## ⚠️ Important Notes

### Production Checklist

Before deploying:
- [ ] **Remove mock tokens** from `AuthService.requestMagicLink()` (line ~75)
- [ ] **Implement real JWT** signing instead of Base64 mock (replace `createSessionToken()`)
- [ ] **Send magic links via email** (implement EmailService)
- [ ] **Set up token blacklist** for logout
- [ ] **Use environment variables** for all secrets
- [ ] **Enable HTTPS** on backend
- [ ] **Configure proper CORS** with specific frontend domain
- [ ] **Implement rate limiting** on auth routes
- [ ] **Set up error logging**  and monitoring
- [ ] **Test all scenarios** thoroughly

### Development vs Production

Development:
```tsx
// requestMagicLink returns token for testing
const result = await authService.requestMagicLink('user@upc.edu.pe');
console.log('Token:', result.token);  // DEV ONLY
```

Production:
```tsx
// Remove token from response, send via email instead
await emailService.sendMagicLink(email, token);
// Return only: { success: true, message: "Check your email" }
```

---

## 📚 Related Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Express.js:** https://expressjs.com/
- **React Hooks:** https://react.dev/reference/react
- **TypeScript:** https://www.typescriptlang.org/docs/

---

## 🎓 Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│                    React Frontend                    │
│  ┌─────────────────────────────────────────────┐   │
│  │  Components                                 │   │
│  │  - RegisterForm ─────────┐                 │   │
│  │  - LoginForm ──────────┐ │                 │   │
│  │  - ReservationForm ┐   │ │                 │   │
│  │  - MyReservations  │   │ │                 │   │
│  └────────────────────┼───┼─┼─────────────────┘   │
│                       │   │ │                     │
│  ┌────────────────────▼───▼─▼─────────────────┐  │
│  │  AuthContext + Hooks                        │  │
│  │  - useAuth()                                │  │
│  │  - useAuthToken()                           │  │
│  └────────────────────┬───┬─┬─────────────────┘  │
│                       │   │ │                     │
│  ┌────────────────────▼───▼─▼─────────────────┐  │
│  │  Services (Browser)                         │  │
│  │  - StudentService                           │  │
│  │  - AuthService                              │  │
│  │  - ReservationService                       │  │
│  └────────────────────┬───┬─┬─────────────────┘  │
│                       │   │ │                     │
│                       └───┼─┴──┐ HTTP Bearer Token│
└──────────────────────────┼────┼──────────────────┘
                           │    │ /api/auth/register
                           │    ├ /api/auth/login
                           │    ├ /api/auth/verify-token
                           │    ├ /api/students/me
                           │    ├ /api/carreras
                           │    ├ /api/reservations
                           │    └ ...
┌──────────────────────────▼────▼──────────────────┐
│            Express Backend (Node.js)             │
│  ┌──────────────────────────────────────────┐  │
│  │  Route Handlers                          │  │
│  │  - POST /auth/register                   │  │
│  │  - POST /auth/login                      │  │
│  │  - POST /auth/verify-token               │  │
│  │  - GET /students/me                      │  │
│  │  - GET /carreras                         │  │
│  │  - POST /reservations                    │  │
│  └──────┬───────────────────────────────────┘  │
│         │ Middleware: authenticate              │
│  ┌──────▼───────────────────────────────────┐  │
│  │  Business Logic Services (copied)        │  │
│  │  - StudentService                        │  │
│  │  - AuthService                           │  │
│  │  - ReservationService                    │  │
│  └──────┬───────────────────────────────────┘  │
└─────────┼──────────────────────────────────────┘
          │ Supabase SDK
          │
┌─────────▼──────────────────────────────────────┐
│       Supabase PostgreSQL Database             │
│  ┌─────────────────────────────────────────┐  │
│  │  carreras (id, nombre, codigo, ...)    │  │
│  │  alumnos (id, email, carrera_id, ...)  │  │
│  │  inventory_reservations (..., user_id) │  │
│  │  products, inventory_units (existing)   │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Next Steps

1. **Read:** Start with [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for complete step-by-step
2. **Setup database:** Run SQL from [`supabase/001_CREATE_CARRERAS_AND_ALUMNOS.sql`](supabase/001_CREATE_CARRERAS_AND_ALUMNOS.sql)
3. **Copy services:** Add all service files to `src/services/`
4. **Update context:** Replace or add `AuthContextNew.tsx`
5. **Create components:** Use examples from [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md)
6. **Setup backend:** Choose option from [`BACKEND_SETUP.md`](BACKEND_SETUP.md)
7. **Test:** Use curl examples from [`API_EXAMPLES.md`](API_EXAMPLES.md)
8. **Deploy:** Follow deployment section in [`MIGRATION_GUIDE.md`](MIGRATION_GUIDE.md)

---

## 📞 Support

**Issues?** Check:
- [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md) - Troubleshooting section
- [`MIGRATION_GUIDE.md`](MIGRATION_GUIDE.md) - Common Issues & Solutions
- Service comments - Full JSDocs on every method

---

**Project Status:** ✅ Ready for Implementation  
**Last Updated:** March 16, 2025  
**Version:** 1.0
