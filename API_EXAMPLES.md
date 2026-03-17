# API Example Requests

This document provides example requests for the UPC Inventory Registration & Reservation API.

## Server Setup

Before testing, start the server:

```bash
npm install express cors
npm run dev
```

The API will be available at `http://localhost:5173/api` (or your configured port).

---

## Authentication Flow

### 1. Register a New Student

**POST** `/api/auth/register`

```bash
curl -X POST http://localhost:5173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@upc.edu.pe",
    "nombre": "Juan",
    "apellido": "Pérez García",
    "carrera_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "alumno": {
    "id": "560e8400-e29b-41d4-a716-446655440001",
    "email": "juan.perez@upc.edu.pe",
    "nombre": "Juan",
    "apellido": "Pérez García",
    "carrera_id": "550e8400-e29b-41d4-a716-446655440000",
    "carrera": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nombre": "Ingeniería de Software",
      "codigo": "INF",
      "description": "Programa de Ingeniería de Software...",
      "activa": true
    },
    "emailVerificado": false,
    "activo": true,
    "createdAt": "2025-03-16T10:30:00Z",
    "updatedAt": "2025-03-16T10:30:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Email already registered"
}
```

---

### 2. Request Magic Link Login

**POST** `/api/auth/login`

```bash
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@upc.edu.pe"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Magic link sent to email",
  "token": "abc123xyz789def456ghi789jkl012mno"
}
```

**NOTE:** In production, the token is **not** returned. Instead, it's sent via email. 
See [AuthService.ts](../src/services/AuthService.ts) line ~80 for production email integration.

---

### 3. Verify Magic Link Token

**POST** `/api/auth/verify-token`

```bash
curl -X POST http://localhost:5173/api/auth/verify-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123xyz789def456ghi789jkl012mno"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "alumno": {
    "id": "560e8400-e29b-41d4-a716-446655440001",
    "email": "juan.perez@upc.edu.pe",
    "nombre": "Juan",
    "apellido": "Pérez García",
    "carrera_id": "550e8400-e29b-41d4-a716-446655440000",
    "carrera": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nombre": "Ingeniería de Software",
      "codigo": "INF"
    },
    "emailVerificado": true,
    "activo": true
  }
}
```

**Store the `sessionToken` in localStorage for authenticated requests.**

**Error Response (400):**
```json
{
  "success": false,
  "error": "Token has expired"
}
```

---

### 4. Logout

**POST** `/api/auth/logout`

```bash
curl -X POST http://localhost:5173/api/auth/logout \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN_HERE"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Student Profile

### Get Current Student Profile

**GET** `/api/students/me`

```bash
curl -X GET http://localhost:5173/api/students/me \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN_HERE"
```

**Success Response (200):**
```json
{
  "success": true,
  "alumno": {
    "id": "560e8400-e29b-41d4-a716-446655440001",
    "email": "juan.perez@upc.edu.pe",
    "nombre": "Juan",
    "apellido": "Pérez García",
    "carrera_id": "550e8400-e29b-41d4-a716-446655440000",
    "carrera": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nombre": "Ingeniería de Software",
      "codigo": "INF"
    },
    "emailVerificado": true,
    "activo": true,
    "createdAt": "2025-03-16T10:30:00Z",
    "updatedAt": "2025-03-16T10:30:00Z"
  }
}
```

---

## Reference Data

### Get All Carreras (Majors)

**GET** `/api/carreras`

```bash
curl -X GET http://localhost:5173/api/carreras
```

**Success Response (200):**
```json
{
  "success": true,
  "carreras": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nombre": "Ingeniería de Software",
      "codigo": "INF",
      "description": "Programa enfocado en desarrollo de software...",
      "activa": true,
      "createdAt": "2025-03-01T00:00:00Z",
      "updatedAt": "2025-03-01T00:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nombre": "Ingeniería Electrónica",
      "codigo": "ELE",
      "description": "Programa de Ingeniería Electrónica...",
      "activa": true,
      "createdAt": "2025-03-01T00:00:00Z",
      "updatedAt": "2025-03-01T00:00:00Z"
    }
  ]
}
```

---

## Reservations

### Create a Reservation

**POST** `/api/reservations`

⚠️ **IMPORTANT**: Carrera is NO LONGER requested in the reservation form.  
It's automatically pulled from the student's profile.

```bash
curl -X POST http://localhost:5173/api/reservations \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "aa0e8400-e29b-41d4-a716-446655440000",
    "unit_id": "bb0e8400-e29b-41d4-a716-446655440001",
    "start_at": "2025-03-17T14:00:00Z",
    "end_at": "2025-03-17T15:30:00Z",
    "purpose": "Class project for Data Structures"
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "reservation": {
    "id": "cc0e8400-e29b-41d4-a716-446655440002",
    "productId": "aa0e8400-e29b-41d4-a716-446655440000",
    "unitId": "bb0e8400-e29b-41d4-a716-446655440001",
    "userId": "560e8400-e29b-41d4-a716-446655440001",
    "requesterName": "Juan Pérez García",
    "requesterCode": "560e8400",
    "purpose": "Class project for Data Structures",
    "startAt": "2025-03-17T14:00:00Z",
    "endAt": "2025-03-17T15:30:00Z",
    "status": "reserved",
    "createdAt": "2025-03-16T10:35:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Unit is not available for the selected time period"
}
```

---

### Get All My Reservations

**GET** `/api/reservations`

```bash
curl -X GET http://localhost:5173/api/reservations \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN_HERE"
```

**Success Response (200):**
```json
{
  "success": true,
  "reservations": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440002",
      "productId": "aa0e8400-e29b-41d4-a716-446655440000",
      "unitId": "bb0e8400-e29b-41d4-a716-446655440001",
      "userId": "560e8400-e29b-41d4-a716-446655440001",
      "requesterName": "Juan Pérez García",
      "requesterCode": "560e8400",
      "purpose": "Class project",
      "startAt": "2025-03-17T14:00:00Z",
      "endAt": "2025-03-17T15:30:00Z",
      "status": "reserved",
      "carrera": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "nombre": "Ingeniería de Software",
        "codigo": "INF"
      },
      "createdAt": "2025-03-16T10:35:00Z"
    }
  ]
}
```

---

### Get Specific Reservation

**GET** `/api/reservations/:reservationId`

```bash
curl -X GET http://localhost:5173/api/reservations/cc0e8400-e29b-41d4-a716-446655440002 \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN_HERE"
```

**Success Response (200):**
```json
{
  "success": true,
  "reservation": {
    "id": "cc0e8400-e29b-41d4-a716-446655440002",
    "productId": "aa0e8400-e29b-41d4-a716-446655440000",
    "unitId": "bb0e8400-e29b-41d4-a716-446655440001",
    "userId": "560e8400-e29b-41d4-a716-446655440001",
    "requesterName": "Juan Pérez García",
    "requesterCode": "560e8400",
    "purpose": "Class project",
    "startAt": "2025-03-17T14:00:00Z",
    "endAt": "2025-03-17T15:30:00Z",
    "status": "reserved",
    "carrera": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nombre": "Ingeniería de Software",
      "codigo": "INF"
    },
    "createdAt": "2025-03-16T10:35:00Z"
  }
}
```

---

### Cancel a Reservation

**DELETE** `/api/reservations/:reservationId`

```bash
curl -X DELETE http://localhost:5173/api/reservations/cc0e8400-e29b-41d4-a716-446655440002 \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN_HERE"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reservation cancelled successfully"
}
```

---

### Check Unit Availability

**GET** `/api/reservations/units/:unitId/availability?date=2025-03-17`

```bash
curl -X GET "http://localhost:5173/api/reservations/units/bb0e8400-e29b-41d4-a716-446655440001/availability?date=2025-03-17"
```

**Success Response (200):**
```json
{
  "success": true,
  "availability": [
    {
      "start": "2025-03-17T10:00:00Z",
      "end": "2025-03-17T11:00:00Z"
    },
    {
      "start": "2025-03-17T14:00:00Z",
      "end": "2025-03-17T15:30:00Z"
    }
  ]
}
```

These are the **booked/unavailable slots**. Your available times are the gaps between these slots.

---

## Error Handling

All endpoints return a consistent error structure:

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

**Common Status Codes:**
- **400**: Bad request (validation error, missing fields)
- **401**: Unauthorized (missing/invalid auth token)
- **403**: Forbidden (trying to access someone else's data)
- **404**: Not found (resource doesn't exist)
- **500**: Server error

---

## Testing with Postman

1. **Create a new Postman Collection** → Name it "UPC Inventory API"
2. **Create Test Requests:**
   - Create folder: `Auth`
     - POST Register
     - POST Login
     - POST Verify Token
     - POST Logout
   - Create folder: `Students`
     - GET Me
     - GET Carreras
   - Create folder: `Reservations`
     - POST Create
     - GET All
     - GET Specific
     - DELETE Cancel
     - GET Availability

3. **Set up Postman Variables:**
   - Create a variable `sessionToken`
   - In "Verify Token" POST response, add test:
     ```javascript
     pm.environment.set("sessionToken", pm.response.json().sessionToken);
     ```
   - Use `{{sessionToken}}` in Authorization headers for subsequentrequests

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Carrera is determined at registration and cannot be changed per-reservation
- Reservations cannot exceed 2 hours
- Reservations must be at least 15 minutes
- Magic link tokens expire after 15 minutes
- Session tokens expire after 24 hours
- Only @upc.edu.pe email addresses are accepted for registration
