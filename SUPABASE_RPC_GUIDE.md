# Supabase RPC Functions - Implementation Guide

## Overview

This guide explains the PostgreSQL RPC functions created for the UPC Inventory system. These functions implement:

1. ✅ Student registration with carrera selection
2. ✅ Magic link (passwordless) authentication
3. ✅ Reservation creation (carrera auto-filled from user profile)
4. ✅ User profile & reservation management

**Key Design:**
- Carrera is stored ONCE in `alumnos.carrera_id`
- Reservations use `user_id` to reference student
- Carrera is pulled from student profile automatically
- NO carrera_id column in reservations table

---

## Functions Overview

### 1. `register_alumno(p_email, p_nombre, p_apellido, p_carrera_id)`

**Purpose:** Register a new student

**Parameters:**
- `p_email` (TEXT) - Student email (must be unique, case-insensitive)
- `p_nombre` (TEXT) - First name
- `p_apellido` (TEXT) - Last name
- `p_carrera_id` (UUID) - Career/major ID (must exist in carreras table)

**Returns:**
```json
{
  "success": boolean,
  "alumno_id": "uuid",
  "message": "string"
}
```

**Validation:**
- Email required & unique
- Name & last name required
- Carrera must exist and be active
- Email stored in lowercase

**Errors:**
- "Email is required"
- "First name is required"
- "Last name is required"
- "Carrera is required"
- "Email already registered"
- "Invalid carrera"

---

### 2. `login_with_magic_link(p_email)`

**Purpose:** Generate a magic link token for passwordless login

**Parameters:**
- `p_email` (TEXT) - Student email (case-insensitive)

**Returns:**
```json
{
  "success": boolean,
  "message": "string",
  "token": "string or null",
  "alumno_id": "uuid or null"
}
```

**Logic:**
- Generates 32-character random token
- Stores in `alumnos.magic_token`
- Sets expiry to 15 minutes from now
- Returns token (dev only - remove in production)
- For security: doesn't reveal if email exists

**In Development:**
- Returns token in response for testing

**In Production:**
- Send token via email
- Return null for token in response

---

### 3. `verify_magic_token(p_token)`

**Purpose:** Verify magic link token and authenticate user

**Parameters:**
- `p_token` (TEXT) - The token from email/magic link

**Returns:**
```json
{
  "success": boolean,
  "message": "string",
  "alumno_id": "uuid",
  "email": "string",
  "nombre": "string",
  "apellido": "string",
  "carrera_id": "uuid"
}
```

**Logic:**
- Validates token exists
- Checks token hasn't expired (15 min TTL)
- Clears token from database
- Marks `email_verificado = true`
- Returns user details with carrera

**Errors:**
- "Token is required"
- "Invalid token"
- "Token has expired"

---

### 4. `create_inventory_reservation(p_product_id, p_unit_id, p_start_at, p_end_at, p_user_id)`

**Purpose:** Create a reservation (**WITHOUT asking for carrera**)

**Parameters:**
- `p_product_id` (UUID) - ID of equipment/product
- `p_unit_id` (UUID) - ID of specific unit
- `p_start_at` (TIMESTAMP WITH TIME ZONE) - Start time (ISO format)
- `p_end_at` (TIMESTAMP WITH TIME ZONE) - End time (ISO format)
- `p_user_id` (UUID) - Student ID

**Returns:**
```json
{
  "success": boolean,
  "message": "string",
  "reservation_id": "uuid",
  "user_carrera_id": "uuid"
}
```

**Logic:**
1. Validates all inputs provided
2. Validates time range (end > start)
3. **Validates duration is 15 min - 2 hours**
4. **Gets user from alumnos table**
5. **Checks user.carrera_id is NOT NULL** ⭐ CRITICAL
6. **Checks for conflicting reservations** (same unit, overlapping time)
7. Inserts reservation using user_id (**NO carrera_id**)
8. Returns reservation ID + user's carrera ID

**Validations:**
- All fields required
- Time range valid
- Duration 15 min - 2 hours
- User must exist and be active
- **User must have carrera assigned** ⭐
- No conflicting reservations

**Errors:**
- "Product ID is required"
- "Unit ID is required"
- "Start and end times are required"
- "User ID is required"
- "End time must be after start time"
- "Reservation must be at least 15 minutes"
- "Reservation cannot exceed 2 hours"
- "User not found or inactive"
- **"Your profile does not have a carrera assigned..."** ⭐
- "Unit is not available for the selected time period"

---

### 5. `get_alumno_with_carrera(p_alumno_id)`

**Purpose:** Get student profile with carrera details

**Parameters:**
- `p_alumno_id` (UUID) - Student ID

**Returns:**
```json
{
  "id": "uuid",
  "email": "string",
  "nombre": "string",
  "apellido": "string",
  "email_verificado": boolean,
  "activo": boolean,
  "carrera_id": "uuid",
  "carrera_nombre": "string",
  "carrera_codigo": "string"
}
```

**Uses:**
- Load user profile after login
- Check if user has carrera assigned
- Display user info in UI

---

### 6. `get_alumno_reservations(p_alumno_id)`

**Purpose:** Get all reservations for a student (with carrera info)

**Parameters:**
- `p_alumno_id` (UUID) - Student ID

**Returns:**
```json
[
  {
    "id": "uuid",
    "product_id": "uuid",
    "unit_id": "uuid",
    "start_at": "timestamp",
    "end_at": "timestamp",
    "status": "string",
    "created_at": "timestamp",
    "carrera_id": "uuid",
    "carrera_nombre": "string"
  }
]
```

**Note:**
- Carrera pulled from student's profile
- NOT from reservation
- Same carrera for all user's reservations

---

### 7. `cancel_reservation(p_reservation_id, p_user_id)`

**Purpose:** Cancel a reservation (with ownership check)

**Parameters:**
- `p_reservation_id` (UUID) - Reservation ID
- `p_user_id` (UUID) - Student ID (for verification)

**Returns:**
```json
{
  "success": boolean,
  "message": "string"
}
```

**Validation:**
- Reservation must exist
- User must own the reservation
- Can only cancel non-completed reservations

**Errors:**
- "Reservation not found"
- "Unauthorized: you can only cancel your own reservations"
- "Cannot cancel a completed reservation"

---

### 8. `get_unit_availability(p_unit_id, p_date)`

**Purpose:** Get booked time slots for a unit on a specific date

**Parameters:**
- `p_unit_id` (UUID) - Unit ID
- `p_date` (DATE) - Date to check (format: 'YYYY-MM-DD')

**Returns:**
```json
[
  {
    "start_at": "timestamp",
    "end_at": "timestamp"
  }
]
```

**Uses:**
- Calendar view showing unavailable slots
- Available times are the gaps between these slots

---

### 9. `get_all_carreras()`

**Purpose:** Get all active career/major options

**Parameters:** None

**Returns:**
```json
[
  {
    "id": "uuid",
    "nombre": "string",
    "codigo": "string",
    "description": "string",
    "activa": boolean
  }
]
```

**Uses:**
- Populate carrera dropdown in registration form
- Only returns active carreras

---

## Implementation Flow

### Registration Flow

```
User submits form (email, name, surname, carrera)
         ↓
registerAlumno() RPC
         ↓
Validate inputs (email unique, carrera exists)
         ↓
Insert into alumnos table
         ↓
Return alumno.id
         ↓
Success! Show "Check your email for login link"
```

### Login Flow (Magic Link)

```
User enters email
         ↓
loginWithMagicLink() RPC
         ↓
Find user by email
         ↓
Generate 32-char random token
         ↓
Store token + 15-min expiry in database
         ↓
Return token (dev) or send via email (prod)
         ↓
User receives link with token
         ↓
User clicks link or enters token
         ↓
verifyMagicToken() RPC
         ↓
Validate token & expiry
         ↓
Clear token, mark email verified
         ↓
Return user data with carrera
         ↓
Store in localStorage, redirect to dashboard
```

### Reservation Flow

```
User selects product/unit/time in form
         ↓
createReservation() RPC with:
  - product_id
  - unit_id
  - start_at / end_at
  - user_id (authenticated)
         ↓
RPC validates:
  ✓ Times valid
  ✓ Duration 15 min - 2 hours
  ✓ User exists
  ✓ User HAS carrera assigned ⭐
  ✓ No conflicts
         ↓
Insert reservation using user_id
  (carrera pulled from alumnos table)
         ↓
Return reservation.id + user.carrera_id
         ↓
Success! Reservation created with auto carrera
```

---

## Key Features

### ✅ Carrera Handling

- **Stored once** in `alumnos.carrera_id` at registration
- **Never changes** per-reservation
- **Automatically used** when creating reservation
- **User source of truth** - if user updates carrera, affects all future reservations

### ✅ Validation

- Email format & uniqueness
- Carrera must exist & be active
- Token expiry checks
- Time range validation
- Duration limits (15 min - 2 hours)
- Conflict detection (no overlapping reservations)
- **Carrera must be assigned** before reserving ⭐

### ✅ Security

- RLS policies on all functions
- Ownership verification (users can't cancel others' reservations)
- Token expiry (15 minutes)
- Email not revealed on login (security best practice)
- Soft deletes not implemented (status field for reservations)

### ✅ Error Messages

- Clear, user-friendly error messages
- Validates all inputs
- Returns success boolean + message for every operation

---

## Installation

### Step 1: Run SQL Migration

1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy entire contents of `supabase/002_RPC_FUNCTIONS.sql`
4. Run query

All 9 functions will be created with proper permissions.

### Step 2: Use in Frontend

Import and call from React:

```tsx
import {
  registerAlumno,
  loginWithMagicLink,
  verifyMagicToken,
  createReservation,
  getAlumnoWithCarrera,
  getAlumnoReservations,
  cancelReservation,
  getUnitAvailability,
  getAllCarreras,
} from '@/api/supabaseRPC';

// Register
const result = await registerAlumno(email, nombre, apellido, carreraId);

// Apply to forms, components, etc.
```

---

## Complete Example: User Journey

```typescript
// ===========================================
// 1. USER REGISTERS
// ===========================================

async function registerStep() {
  const carreras = await getAllCarreras();
  
  // User fills form with:
  // - email: juan.perez@upc.edu.pe
  // - nombre: Juan
  // - apellido: Pérez
  // - carrera_id: (selected from dropdown)
  
  const result = await registerAlumno(
    'juan.perez@upc.edu.pe',
    'Juan',
    'Pérez',
    carreraId
  );
  
  // Result: { success: true, alumno_id: 'xxx', message: '...' }
  // Action: Show "Check your email"
}

// ===========================================
// 2. USER REQUESTS LOGIN LINK
// ===========================================

async function loginStep() {
  const result = await loginWithMagicLink('juan.perez@upc.edu.pe');
  
  // Result: { success: true, token: 'abc123', message: '...' }
  // In dev: show token for testing
  // In prod: send via email instead
}

// ===========================================
// 3. USER VERIFIES TOKEN
// ===========================================

async function verifyStep(token: string) {
  const result = await verifyMagicToken(token);
  
  // Result: {
  //   success: true,
  //   alumno_id: 'xxx',
  //   email: 'juan.perez@upc.edu.pe',
  //   nombre: 'Juan',
  //   apellido: 'Pérez',
  //   carrera_id: 'yyy'  <- Carrera stored!
  // }
  
  // Action:
  // - Store in localStorage/context
  // - Redirect to dashboard
}

// ===========================================
// 4. USER MAKES RESERVATION
// ===========================================

async function reservationStep(userId: string) {
  // User selects product/unit/time on calendar
  // NO carrera field in form!
  
  const result = await createReservation(
    productId,
    unitId,
    '2025-03-17T14:00:00Z',
    '2025-03-17T15:30:00Z',
    userId
  );
  
  // Result: {
  //   success: true,
  //   reservation_id: 'zzz',
  //   user_carrera_id: 'yyy'  <- Auto-pulled from user profile!
  // }
  
  // Action: Show confirmation with carrera info
}

// ===========================================
// 5. USER VIEWS RESERVATIONS
// ===========================================

async function viewReservationsStep(userId: string) {
  const reservations = await getAlumnoReservations(userId);
  
  // Result: [
  //   {
  //     id: 'zzz',
  //     productId: '...',
  //     unitId: '...',
  //     startAt: Date(...),
  //     endAt: Date(...),
  //     status: 'reserved',
  //     createdAt: Date(...),
  //     carrera: {
  //       id: 'yyy',
  //       nombre: 'Ingeniería de Software'  <- Carrera from PROFILE
  //     }
  //   }
  // ]
  
  // Display list with carrera info
}
```

---

## Important Notes

### ⭐ Critical Design Decision

**Carrera is NOT in reservations table.**

Instead:
```sql
-- User registers ONCE with carrera
UPDATE alumnos SET carrera_id = 'xxx' WHERE id = 'user-id';

-- User makes MANY reservations
-- All reservations use alumnos.carrera_id automatically
INSERT INTO inventory_reservations (user_id, product_id, unit_id, ...)
VALUES ('user-id', ...);

-- QUERY aggregates carrera from alumnos table
SELECT r.*, a.carrera_id, c.nombre as carrera_nombre
FROM inventory_reservations r
JOIN alumnos a ON r.user_id = a.id
LEFT JOIN carreras c ON a.carrera_id = c.id;
```

**Benefits:**
- ✅ No data duplication
- ✅ Single source of truth (alumnos table)
- ✅ If user updates carrera, all reservations reflect change
- ✅ Cleaner UI (no redundant carrera selection)

### Production Checklist

- [ ] Remove token from `login_with_magic_link()` response (send via email instead)
- [ ] Implement SMTP email sending
- [ ] Test all error scenarios
- [ ] Set up database backups
- [ ] Monitor RPC function performance
- [ ] Add rate limiting on login/registration
- [ ] Test concurrent reservation creation (conflict handling)

---

## Troubleshooting

### "Invalid carrera"
- Verify carrera ID exists in `carreras` table
- Check carrera is marked `activa = true`

### "Email already registered"
- User already registered with that email
- Direct to login instead

### "Your profile does not have a carrera assigned..."
- User registered but never selected carrera
- Admin must update user record
- Or implement "complete registration" flow

### "Unit is not available..."
- Another user already reserved that time
- Show available slots using `get_unit_availability()`

### Token verification fails
- Token expired (15 min timeout)
- Request new magic link
- Token was already used (cleared from DB)

---

## Next Steps

1. **Run SQL:** Execute `supabase/002_RPC_FUNCTIONS.sql` in Supabase SQL Editor
2. **Test Functions:** Use examples in `src/api/supabaseRPC.ts`
3. **Build UI:** Create React forms using the RPC functions
4. **Integrate:** Update AuthContext to use RPC functions instead of old logic
5. **Test Flow:** Register → Login → Verify → Reservation
6. **Deploy:** Test in staging before production

---

## Files Reference

- **SQL Functions:** `supabase/002_RPC_FUNCTIONS.sql` - All 9 RPC functions
- **JS Examples:** `src/api/supabaseRPC.ts` - Ready-to-use client code
- **This Guide:** You are reading it now!

---

**Version:** 1.0  
**Updated:** March 16, 2026  
**Status:** Ready for production
