/**
 * Supabase JS Client - RPC Function Examples
 * 
 * These examples show how to call the PostgreSQL RPC functions
 * from your JavaScript/TypeScript frontend
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// =====================================================
// 1. REGISTER ALUMNO
// =====================================================

async function registerAlumno(
  email: string,
  nombre: string,
  apellido: string,
  carreraId: string
) {
  const { data, error } = await supabase.rpc('register_alumno', {
    p_email: email,
    p_nombre: nombre,
    p_apellido: apellido,
    p_carrera_id: carreraId,
  });

  if (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: error.message,
    };
  }

  // data is an array with one row
  const result = data[0];
  return {
    success: result.success,
    alumnoId: result.alumno_id,
    message: result.message,
  };
}

// Usage:
/*
const result = await registerAlumno(
  'juan.perez@upc.edu.pe',
  'Juan',
  'Pérez',
  '550e8400-e29b-41d4-a716-446655440000'
);

if (result.success) {
  console.log('User registered:', result.alumnoId);
} else {
  console.error('Error:', result.message);
}
*/

// =====================================================
// 2. LOGIN WITH MAGIC LINK
// =====================================================

async function loginWithMagicLink(email: string) {
  const { data, error } = await supabase.rpc('login_with_magic_link', {
    p_email: email,
  });

  if (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred',
    };
  }

  const result = data[0];
  return {
    success: result.success,
    message: result.message,
    token: result.token, // DEV ONLY - In production, send via email
    alumnoId: result.alumno_id,
  };
}

// Usage:
/*
const result = await loginWithMagicLink('juan.perez@upc.edu.pe');

if (result.success) {
  // In development: show token to test
  console.log('Token:', result.token);
  
  // In production: token would be sent via email
  // Present form for user to enter token from email
}
*/

// =====================================================
// 3. VERIFY MAGIC TOKEN
// =====================================================

async function verifyMagicToken(token: string) {
  const { data, error } = await supabase.rpc('verify_magic_token', {
    p_token: token,
  });

  if (error) {
    console.error('Verification error:', error);
    return {
      success: false,
      message: 'Verification failed',
    };
  }

  const result = data[0];
  
  if (!result.success) {
    return {
      success: false,
      message: result.message,
    };
  }

  return {
    success: true,
    message: result.message,
    user: {
      id: result.alumno_id,
      email: result.email,
      nombre: result.nombre,
      apellido: result.apellido,
      carreraId: result.carrera_id,
    },
  };
}

// Usage:
/*
const result = await verifyMagicToken('abc123xyz789...');

if (result.success) {
  console.log('Logged in as:', result.user.nombre);
  
  // Store session token (implement your own JWT/session logic)
  localStorage.setItem('user_id', result.user.id);
  localStorage.setItem('session_token', generateSessionToken(result.user.id));
  
  // Redirect to dashboard
  window.location.href = '/catalogo';
} else {
  console.error('Error:', result.message);
}
*/

// =====================================================
// 4. CREATE INVENTORY RESERVATION
// =====================================================

async function createReservation(
  productId: string,
  unitId: string,
  startAt: string, // ISO format: '2025-03-17T14:00:00Z'
  endAt: string,
  userId: string
) {
  const { data, error } = await supabase.rpc('create_inventory_reservation', {
    p_product_id: productId,
    p_unit_id: unitId,
    p_start_at: startAt,
    p_end_at: endAt,
    p_user_id: userId,
  });

  if (error) {
    console.error('Reservation error:', error);
    return {
      success: false,
      message: 'Failed to create reservation',
    };
  }

  const result = data[0];
  return {
    success: result.success,
    message: result.message,
    reservationId: result.reservation_id,
    userCarreraId: result.user_carrera_id,
  };
}

// Usage:
/*
const result = await createReservation(
  'product-id-here',
  'unit-id-here',
  '2025-03-17T14:00:00Z',
  '2025-03-17T15:30:00Z',
  'user-id-here'
);

if (result.success) {
  console.log('Reservation created:', result.reservationId);
  // User's carrera was automatically pulled from their profile
  console.log('User carrera:', result.userCarreraId);
} else {
  console.error('Error:', result.message);
  // Example errors:
  // - 'Your profile does not have a carrera assigned...'
  // - 'Unit is not available for the selected time period'
  // - 'Reservation cannot exceed 2 hours'
}
*/

// =====================================================
// 5. GET ALUMNO WITH CARRERA
// =====================================================

async function getAlumnoWithCarrera(alumnoId: string) {
  const { data, error } = await supabase.rpc('get_alumno_with_carrera', {
    p_alumno_id: alumnoId,
  });

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  const result = data[0];
  return {
    id: result.id,
    email: result.email,
    nombre: result.nombre,
    apellido: result.apellido,
    emailVerificado: result.email_verificado,
    activo: result.activo,
    carrera: {
      id: result.carrera_id,
      nombre: result.carrera_nombre,
      codigo: result.carrera_codigo,
    },
  };
}

// Usage:
/*
const user = await getAlumnoWithCarrera('user-id-here');

if (user) {
  console.log(`Welcome, ${user.nombre} ${user.apellido}`);
  console.log(`Major: ${user.carrera.nombre}`);
}
*/

// =====================================================
// 6. GET ALUMNO RESERVATIONS
// =====================================================

async function getAlumnoReservations(alumnoId: string) {
  const { data, error } = await supabase.rpc('get_alumno_reservations', {
    p_alumno_id: alumnoId,
  });

  if (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }

  return data.map((res) => ({
    id: res.id,
    productId: res.product_id,
    unitId: res.unit_id,
    startAt: new Date(res.start_at),
    endAt: new Date(res.end_at),
    status: res.status,
    createdAt: new Date(res.created_at),
    carrera: {
      id: res.carrera_id,
      nombre: res.carrera_nombre,
    },
  }));
}

// Usage:
/*
const reservations = await getAlumnoReservations('user-id-here');

reservations.forEach((res) => {
  console.log(`${res.startAt} - ${res.endAt} (${res.status})`);
  console.log(`Major: ${res.carrera.nombre}`);
});
*/

// =====================================================
// 7. CANCEL RESERVATION
// =====================================================

async function cancelReservation(
  reservationId: string,
  userId: string
) {
  const { data, error } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: reservationId,
    p_user_id: userId,
  });

  if (error) {
    console.error('Cancellation error:', error);
    return {
      success: false,
      message: 'Failed to cancel reservation',
    };
  }

  const result = data[0];
  return {
    success: result.success,
    message: result.message,
  };
}

// Usage:
/*
const result = await cancelReservation('reservation-id-here', 'user-id-here');

if (result.success) {
  console.log('Reservation cancelled');
} else {
  console.error('Error:', result.message);
}
*/

// =====================================================
// 8. GET UNIT AVAILABILITY
// =====================================================

async function getUnitAvailability(
  unitId: string,
  date: Date // e.g., new Date('2025-03-17')
) {
  const dateString = date.toISOString().split('T')[0]; // Format: '2025-03-17'

  const { data, error } = await supabase.rpc('get_unit_availability', {
    p_unit_id: unitId,
    p_date: dateString,
  });

  if (error) {
    console.error('Error checking availability:', error);
    return [];
  }

  return data.map((slot) => ({
    start: new Date(slot.start_at),
    end: new Date(slot.end_at),
  }));
}

// Usage:
/*
const bookedSlots = await getUnitAvailability('unit-id-here', new Date('2025-03-17'));

console.log('Booked time slots:');
bookedSlots.forEach((slot) => {
  console.log(`${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()}`);
});

// Available times are the gaps between these slots
*/

// =====================================================
// 9. GET ALL CARRERAS
// =====================================================

async function getAllCarreras() {
  const { data, error } = await supabase.rpc('get_all_carreras');

  if (error) {
    console.error('Error fetching carreras:', error);
    return [];
  }

  return data.map((carrera) => ({
    id: carrera.id,
    nombre: carrera.nombre,
    codigo: carrera.codigo,
    description: carrera.description,
    activa: carrera.activa,
  }));
}

// Usage:
/*
const carreras = await getAllCarreras();

console.log('Available majors:');
carreras.forEach((carrera) => {
  console.log(`${carrera.codigo} - ${carrera.nombre}`);
});

// Use in registration form dropdown
*/

// =====================================================
// COMPLETE FLOW EXAMPLE
// =====================================================

async function completeAuthFlow() {
  console.log('=== REGISTRATION ===');
  
  // Step 1: Register
  const registerResult = await registerAlumno(
    'juan.perez@upc.edu.pe',
    'Juan',
    'Pérez',
    '550e8400-e29b-41d4-a716-446655440000'
  );

  if (!registerResult.success) {
    console.error('Registration failed:', registerResult.message);
    return;
  }

  const userId = registerResult.alumnoId;
  console.log('✅ User registered:', userId);

  console.log('\n=== LOGIN (Magic Link) ===');
  
  // Step 2: Request magic link
  const loginResult = await loginWithMagicLink('juan.perez@upc.edu.pe');
  console.log('✅ Magic link generated');
  console.log('Token (DEV ONLY):', loginResult.token);

  console.log('\n=== VERIFY TOKEN ===');
  
  // Step 3: Verify token
  const verifyResult = await verifyMagicToken(loginResult.token);

  if (!verifyResult.success) {
    console.error('Verification failed:', verifyResult.message);
    return;
  }

  console.log('✅ Token verified');
  console.log('Logged in as:', verifyResult.user.nombre);

  console.log('\n=== CREATE RESERVATION ===');
  
  // Step 4: Create reservation
  const now = new Date();
  const startAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour from now
  const endAt = new Date(now.getTime() + 90 * 60 * 1000).toISOString(); // 1.5 hours from now

  const reservationResult = await createReservation(
    'product-uuid-here',
    'unit-uuid-here',
    startAt,
    endAt,
    userId
  );

  if (!reservationResult.success) {
    console.error('Reservation failed:', reservationResult.message);
    return;
  }

  console.log('✅ Reservation created:', reservationResult.reservationId);
  console.log('Carrera automatically used:', reservationResult.userCarreraId);

  console.log('\n=== GET USER DATA ===');
  
  // Step 5: Get user profile
  const user = await getAlumnoWithCarrera(userId);
  console.log('User:', user);

  console.log('\n=== GET RESERVATIONS ===');
  
  // Step 6: Get all reservations
  const reservations = await getAlumnoReservations(userId);
  console.log('Total reservations:', reservations.length);
  reservations.forEach((res) => {
    console.log(`- ${res.startAt} to ${res.endAt} (${res.status})`);
  });
}

// Run complete flow (for testing)
// completeAuthFlow().catch(console.error);

// =====================================================
// EXPORT FOR USE IN REACT COMPONENTS
// =====================================================

export {
  registerAlumno,
  loginWithMagicLink,
  verifyMagicToken,
  createReservation,
  getAlumnoWithCarrera,
  getAlumnoReservations,
  cancelReservation,
  getUnitAvailability,
  getAllCarreras,
};
