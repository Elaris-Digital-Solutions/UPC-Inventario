/**
 * Database Types
 * Auto-generated from Supabase schema (or manually defined here)
 * Matches the tables: carreras, alumnos, inventory_reservations
 */

export interface Database {
  public: {
    Tables: {
      carreras: {
        Row: {
          id: string;
          nombre: string;
          codigo: string | null;
          description: string | null;
          activa: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          codigo?: string;
          description?: string;
          activa?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          codigo?: string | null;
          description?: string | null;
          activa?: boolean;
          updated_at?: string;
        };
      };
      alumnos: {
        Row: {
          id: string;
          email: string;
          nombre: string;
          apellido: string;
          carrera_id: string | null;
          magic_token: string | null;
          magic_token_expiry: string | null;
          email_verificado: boolean;
          activo: boolean;
          auth_user_id: string | null;
          banned_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          nombre: string;
          apellido: string;
          carrera_id?: string | null;
          magic_token?: string;
          magic_token_expiry?: string;
          email_verificado?: boolean;
          activo?: boolean;
          auth_user_id?: string;
          banned_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nombre?: string;
          apellido?: string;
          carrera_id?: string | null;
          magic_token?: string | null;
          magic_token_expiry?: string | null;
          email_verificado?: boolean;
          activo?: boolean;
          auth_user_id?: string;
          banned_until?: string | null;
          updated_at?: string;
        };
      };
      inventory_reservations: {
        Row: {
          id: string;
          created_at: string;
          product_id: string;
          unit_id: string;
          user_id: string | null;  // Added: link to alumnos
          requester_name: string;
          requester_code: string | null;
          purpose: string | null;
          start_at: string;
          end_at: string;
          status: 'reserved' | 'cancelled' | 'completed' | 'not_picked_up' | 'not_returned';
        };
        Insert: {
          id?: string;
          created_at?: string;
          product_id: string;
          unit_id: string;
          user_id?: string | null;
          requester_name: string;
          requester_code?: string;
          purpose?: string;
          start_at: string;
          end_at: string;
          status?: 'reserved' | 'cancelled' | 'completed' | 'not_picked_up' | 'not_returned';
        };
        Update: {
          id?: string;
          created_at?: string;
          product_id?: string;
          unit_id?: string;
          user_id?: string | null;
          requester_name?: string;
          requester_code?: string | null;
          purpose?: string | null;
          start_at?: string;
          end_at?: string;
          status?: 'reserved' | 'cancelled' | 'completed' | 'not_picked_up' | 'not_returned';
        };
      };
    };
  };
}

// ---------------------------------------------------------------------------
// DOMAIN TYPES (Application-level abstractions)
// ---------------------------------------------------------------------------

/**
 * Carrera (Academic Program)
 * Represents a major/course of study
 */
export interface Carrera {
  id: string;
  nombre: string;
  codigo: string | null;
  description: string | null;
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alumno (Student Profile)
 * Stores student registration data and carrera assignment
 * Replaces the need to ask for carrera on every reservation
 */
export interface Alumno {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  carrera_id: string | null;
  carrera?: Carrera;  // Hydrated carrera object (optional)
  magicToken: string | null;
  magicTokenExpiry: Date | null;
  emailVerificado: boolean;
  activo: boolean;
  authUserId: string | null;
  bannedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Registration Request DTO
 * Data submitted by student during registration
 */
export interface RegisterRequest {
  email: string;
  nombre: string;
  apellido: string;
  carrera_id: string;  // Required at registration
}

/**
 * Registration Response DTO
 */
export interface RegisterResponse {
  success: boolean;
  alumno?: Alumno;
  error?: string;
}

/**
 * Login Request DTO
 * Only email needed (magic link approach)
 */
export interface LoginRequest {
  email: string;
}

/**
 * Login Response DTO
 */
export interface LoginResponse {
  success: boolean;
  message?: string;  // "Magic link sent to email"
  error?: string;
}

/**
 * Verify Token Request DTO
 * Magic link verification
 */
export interface VerifyTokenRequest {
  token: string;
}

/**
 * Verify Token Response DTO
 */
export interface VerifyTokenResponse {
  success: boolean;
  alumno?: Alumno;
  authToken?: string;  // JWT or session token for subsequent requests
  error?: string;
}

/**
 * Create Reservation Request DTO
 * No longer requires carrera - it's pulled from authenticated user
 */
export interface CreateReservationRequest {
  product_id: string;
  unit_id: string;
  start_at: string;      // ISO 8601 timestamp
  end_at: string;        // ISO 8601 timestamp
  purpose?: string;
  // carrera_id is NO LONGER here — fetched from user profile
}

/**
 * Reservation Response DTO
 */
export interface CreateReservationResponse {
  success: boolean;
  reservation?: InventoryReservation;
  error?: string;
}

/**
 * Reservation with joined Carrera
 * Query response with carrera details
 */
export interface ReservationWithCarrera {
  id: string;
  createdAt: Date;
  productId: string;
  unitId: string;
  userId: string;
  requesterName: string;
  requesterCode: string | null;
  purpose: string | null;
  startAt: Date;
  endAt: Date;
  status: 'reserved' | 'cancelled' | 'completed' | 'not_picked_up' | 'not_returned';
  
  // Joined data
  carrera?: Carrera;
  alumno?: Alumno;
}

/**
 * Inventory Reservation
 * Core reservation entity
 */
export interface InventoryReservation {
  id: string;
  createdAt: Date;
  productId: string;
  unitId: string;
  userId: string | null;
  requesterName: string;
  requesterCode: string | null;
  purpose: string | null;
  startAt: Date;
  endAt: Date;
  status: 'reserved' | 'cancelled' | 'completed' | 'not_picked_up' | 'not_returned';
}

/**
 * API Response Wrapper
 * All API endpoints should return this structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
