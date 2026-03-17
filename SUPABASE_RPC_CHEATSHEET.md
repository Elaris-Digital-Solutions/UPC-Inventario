# Supabase RPC Functions - Quick Reference

## 📋 All Functions at a Glance

| Function | Purpose | Inputs | Returns |
|----------|---------|--------|---------|
| `register_alumno` | Register new student | email, nombre, apellido, carrera_id | {success, alumno_id, message} |
| `login_with_magic_link` | Generate magic link | email | {success, token, alumno_id, message} |
| `verify_magic_token` | Verify token & login | token | {success, alumno_id, email, nombre, apellido, carrera_id, message} |
| `create_inventory_reservation` | Create reservation | product_id, unit_id, start_at, end_at, user_id | {success, reservation_id, user_carrera_id, message} |
| `get_alumno_with_carrera` | Get user profile | alumno_id | {id, email, nombre, apellido, carrera} |
| `get_alumno_reservations` | Get user's reservations | alumno_id | [{id, product_id, unit_id, start_at, end_at, status, carrera}] |
| `cancel_reservation` | Cancel reservation | reservation_id, user_id | {success, message} |
| `get_unit_availability` | Get booked slots | unit_id, date | [{start_at, end_at}] |
| `get_all_carreras` | Get all majors | none | [{id, nombre, codigo, description, activa}] |

---

## 🚀 Quick Start

### Installation
```sql
-- Run in Supabase SQL Editor
-- File: supabase/002_RPC_FUNCTIONS.sql
```

### Call from React
```typescript
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
```

---

## 🎯 Common Tasks

### Register a Student
```typescript
const result = await registerAlumno(
  'user@upc.edu.pe',
  'Juan',
  'Pérez',
  'carrera-uuid'
);

if (result.success) {
  console.log('User ID:', result.alumnoId);
} else {
  console.error('Error:', result.message);
}
```

### Login User (Magic Link)
```typescript
// Step 1: Request link
const loginResult = await loginWithMagicLink('user@upc.edu.pe');
console.log('Token:', loginResult.token); // Show in dev mode

// Step 2: Verify token
const verifyResult = await verifyMagicToken(token);
if (verifyResult.success) {
  const user = verifyResult.user;
  localStorage.setItem('user_id', user.id);
  // Redirect to dashboard
}
```

### Make a Reservation
```typescript
const result = await createReservation(
  'product-id',
  'unit-id',
  '2025-03-17T14:00:00Z',
  '2025-03-17T15:30:00Z',
  'user-id'
);

if (result.success) {
  console.log('Reservation:', result.reservationId);
  // Carrera was auto-filled from user profile!
}
```

### Get User Profile
```typescript
const user = await getAlumnoWithCarrera('user-id');
console.log(user.nombre, user.carrera.nombre);
```

### List Reservations
```typescript
const reservations = await getAlumnoReservations('user-id');
reservations.forEach(res => {
  console.log(res.startAt, res.status, res.carrera.nombre);
});
```

### Check Availability
```typescript
const booked = await getUnitAvailability('unit-id', new Date('2025-03-17'));
// Returns array of {start_at, end_at}
// Available times are the gaps
```

### Cancel Reservation
```typescript
const result = await cancelReservation('reservation-id', 'user-id');
if (result.success) {
  console.log('Cancelled');
}
```

### Get Majors (for dropdown)
```typescript
const carreras = await getAllCarreras();
// Populate select dropdown
```

---

## 🔍 Error Handling

All functions return `{success: boolean, message: string}` structure.

```typescript
const result = await registerAlumno(...);

if (!result.success) {
  // Handle errors
  switch(result.message) {
    case 'Email already registered':
      // Show "Email taken, try login instead"
      break;
    case 'Invalid carrera':
      // Show "Please select a valid major"
      break;
    default:
      // Show generic error
      console.error(result.message);
  }
}
```

---

## ⏱️ Time Formats

### Input (Reservation)
```typescript
// ISO 8601 format with timezone
const start = new Date('2025-03-17T14:00:00Z').toISOString();
const end = new Date('2025-03-17T15:30:00Z').toISOString();

// Or from date picker
const d1 = new Date(dateFromPicker);
const d2 = new Date(dateFromPicker);
d2.setHours(d2.getHours() + 1.5);
const start = d1.toISOString();
const end = d2.toISOString();
```

### Output (RPC)
```typescript
// Returned as ISO strings
const reservation = {
  start_at: "2025-03-17T14:00:00Z",
  end_at: "2025-03-17T15:30:00Z"
};

// Convert to Date objects
const startDate = new Date(reservation.start_at);
const endDate = new Date(reservation.end_at);
```

### Availability Query
```typescript
// Input: DATE format (YYYY-MM-DD)
const date = new Date('2025-03-17');
const dateStr = date.toISOString().split('T')[0]; // '2025-03-17'

const booked = await getUnitAvailability('unit-id', dateStr);
```

---

## 💾 Data Flow

### Registration Flow
```
User Form
  ↓
registerAlumno(email, nombre, apellido, carrera_id)
  ↓
INSERT INTO alumnos
  ↓
Return alumno_id
```

### Reservation Flow
```
User selects product/unit/time
  ↓
createReservation(product_id, unit_id, start_at, end_at, user_id)
  ↓
RPC validates:
  - User exists
  - User has carrera ⭐
  - No conflicts
  ↓
INSERT INTO inventory_reservations (uses user_id)
  ↓
Return reservation_id
  ↓
Carrera auto-pulled from alumnos table
```

---

## 🛡️ Key Security Features

| Feature | Mechanism |
|---------|-----------|
| Email Uniqueness | UNIQUE constraint on alumnos.email |
| Token Expiry | 15-minute TTL, checked in verify_magic_token |
| Ownership | cancel_reservation checks user_id ownership |
| Carrera Validation | Must exist + be active in carreras table |
| User Status | Only active users can login/reserve |
| Conflict Detection | Overlapping reservations prevented |

---

## ❌ Common Mistakes

### ❌ Including carrera in reservation insert
```typescript
// WRONG!
await supabase.from('inventory_reservations').insert({
  carrera_id: carrierId,  // ← Don't do this!
  user_id: userId,
  ...
});
```

### ✅ Correct approach
```typescript
// RIGHT!
const result = await createReservation(
  productId,
  unitId,
  startAt,
  endAt,
  userId  // RPC gets carrera from alumnos automatically
);
```

### ❌ Calling RPC without checking success
```typescript
// WRONG!
const user = await getAlumnoWithCarrera(userId);
console.log(user.nombre);  // Might be null!
```

### ✅ Correct approach
```typescript
// RIGHT!
const users = await getAlumnoWithCarrera(userId);
if (users && users.length > 0) {
  const user = users[0];
  console.log(user.nombre);
}
```

### ❌ Forgetting to convert dates
```typescript
// WRONG!
const result = await createReservation(
  productId,
  unitId,
  new Date(),  // Object, not ISO string!
  new Date(),
  userId
);
```

### ✅ Correct approach
```typescript
// RIGHT!
const start = new Date(...).toISOString();
const end = new Date(...).toISOString();
const result = await createReservation(
  productId,
  unitId,
  start,  // ISO string!
  end,
  userId
);
```

---

## 📊 Response Patterns

All functions follow this pattern:

```typescript
// Single result
const { data, error } = await supabase.rpc('function_name', {params});
const result = data[0];  // ← Array with one item

if (!result.success) {
  console.error(result.message);
  return;
}

// Use result.property
```

```typescript
// Multiple results
const { data, error } = await supabase.rpc('get_alumno_reservations', {p_alumno_id});
const results = data;  // ← Array with multiple items

results.forEach(row => {
  console.log(row.id, row.status);
});
```

---

## 🎓 Learning Resources

- **Supabase RPC Docs:** https://supabase.com/docs/reference/postgres/functions
- **PostgreSQL Functions:** https://www.postgresql.org/docs/current/sql-createfunction.html
- **Magic Links:** https://en.wikipedia.org/wiki/Magic_link

---

## 🔧 Debugging

### Test RPC in Supabase Console
```sql
-- SQL Editor in Supabase
SELECT register_alumno(
  'test@upc.edu.pe',
  'Test',
  'User',
  '550e8400-e29b-41d4-a716-446655440000'
);
```

### Check if function exists
```sql
SELECT proname FROM pg_proc WHERE proname LIKE 'register%';
```

### Monitor function performance
```sql
-- In Supabase SQL Editor
-- Supabase provides built-in monitoring
-- Go to: Monitoring > Functions
```

---

## 📝 TypeScript Types

```typescript
interface RegistrationResult {
  success: boolean;
  alumno_id: string | null;
  message: string;
}

interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  carrera: {
    id: string;
    nombre: string;
    codigo: string;
  };
}

interface Reservation {
  id: string;
  product_id: string;
  unit_id: string;
  start_at: Date;
  end_at: Date;
  status: string;
  carrera: {
    id: string;
    nombre: string;
  };
}

interface Carrera {
  id: string;
  nombre: string;
  codigo: string;
  description: string;
  activa: boolean;
}
```

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Function does not exist" | Run SQL migration (002_RPC_FUNCTIONS.sql) |
| Token returns null | In dev mode, token should be returned. Check SQL. |
| "User not found" in reservation | User doesn't exist or is inactive |
| "Invalid carrera" | Carrera UUID doesn't exist or is inactive |
| Reservation without carrera? | `get_alumno_reservations()` pulls from alumnos table |
| Email already registered | Different error msg, user should login instead |

---

## ✅ Pre-flight Checklist

Before going to production:

- [ ] SQL migration executed (002_RPC_FUNCTIONS.sql)
- [ ] All 9 functions created successfully
- [ ] Tested each RPC individually
- [ ] Error handling implemented
- [ ] Email sending configured (remove token from response)
- [ ] Rate limiting on login/register endpoints
- [ ] CORS configured for frontend domain
- [ ] Database backups enabled
- [ ] Monitoring/alerts set up
- [ ] Load testing performed

---

## 📞 Support

- **Read:** This entire document for complete reference
- **Refer:** `SUPABASE_RPC_GUIDE.md` for detailed function docs
- **Code:** `src/api/supabaseRPC.ts` for working examples
- **SQL:** `supabase/002_RPC_FUNCTIONS.sql` for function definitions

---

## Version History

- **v1.0** (March 16, 2026) - Initial release
  - 9 RPC functions
  - Carrera auto-fill in reservations
  - Magic link authentication
  - Complete validation & error handling

---

**Last Updated:** March 16, 2026  
**Status:** Production Ready ✅
