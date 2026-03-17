/**
 * Reservation Service
 * Refactored to require authenticated user and pull carrera from profile
 * No longer asks for carrera on every reservation
 */

import { supabase } from '@/supabaseClient';
import { studentService } from './StudentService';
import type {
  CreateReservationRequest,
  CreateReservationResponse,
  InventoryReservation,
  ReservationWithCarrera,
} from '@/types/Database';

class ReservationService {
  /**
   * Create a new reservation
   * REQUIRES authenticated user_id
   * Carrera is fetched from user profile, not requested
   */
  async createReservation(
    studentId: string,
    request: CreateReservationRequest
  ): Promise<CreateReservationResponse> {
    // Validate student exists and get profile (including carrera)
    const student = await studentService.getStudentById(studentId);
    if (!student) {
      return {
        success: false,
        error: 'Student not found',
      };
    }

    // Ensure student has a carrera assigned
    if (!student.carrera_id) {
      return {
        success: false,
        error: 'Your profile does not have a carrera assigned. Please update your profile.',
      };
    }

    // Validate request parameters
    if (!request.product_id || !request.unit_id || !request.start_at || !request.end_at) {
      return {
        success: false,
        error: 'Missing required reservation fields',
      };
    }

    // Validate time range
    const startTime = new Date(request.start_at);
    const endTime = new Date(request.end_at);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return {
        success: false,
        error: 'Invalid date format',
      };
    }

    if (endTime <= startTime) {
      return {
        success: false,
        error: 'End time must be after start time',
      };
    }

    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours > 2) {
      return {
        success: false,
        error: 'Reservation cannot exceed 2 hours',
      };
    }

    if (durationHours < 0.25) {
      // 15 minutes minimum
      return {
        success: false,
        error: 'Reservation must be at least 15 minutes',
      };
    }

    try {
      // Check if unit is available (no overlapping reservations)
      const { data: conflicts } = await supabase
        .from('inventory_reservations')
        .select('id')
        .eq('unit_id', request.unit_id)
        .in('status', ['reserved', 'completed'])
        .gte('end_at', request.start_at)
        .lt('start_at', request.end_at);

      if (conflicts && conflicts.length > 0) {
        return {
          success: false,
          error: 'Unit is not available for the selected time period',
        };
      }

      // Create reservation with user_id (REQUIRED)
      const { data, error } = await supabase
        .from('inventory_reservations')
        .insert([
          {
            product_id: request.product_id,
            unit_id: request.unit_id,
            user_id: studentId,  // REQUIRED - pulled from auth
            requester_name: `${student.nombre} ${student.apellido}`,
            requester_code: student.id.slice(0, 8),  // Use short student ID as code
            purpose: request.purpose || null,
            start_at: startTime.toISOString(),
            end_at: endTime.toISOString(),
            status: 'reserved',
          }
        ])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating reservation:', error);
        return {
          success: false,
          error: `Failed to create reservation: ${error.message}`,
        };
      }

      return {
        success: true,
        reservation: this.mapReservation(data),
      };
    } catch (error) {
      console.error('Error in createReservation:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  /**
   * Get all reservations for a student
   * Includes carrera information via join
   */
  async getStudentReservations(studentId: string): Promise<ReservationWithCarrera[]> {
    const { data, error } = await supabase
      .from('inventory_reservations')
      .select(`
        *,
        alumnos!inner(
          id,
          nombre,
          apellido,
          carrera_id,
          carreras(id, nombre, codigo)
        )
      `)
      .eq('user_id', studentId)
      .order('start_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      throw new Error(`Failed to fetch reservations: ${error.message}`);
    }

    return (data || []).map(row => this.mapReservationWithCarrera(row));
  }

  /**
   * Get a single reservation by ID
   * Includes carrera join
   */
  async getReservationById(reservationId: string): Promise<ReservationWithCarrera | null> {
    const { data, error } = await supabase
      .from('inventory_reservations')
      .select(`
        *,
        alumnos!inner(
          id,
          nombre,
          apellido,
          carrera_id,
          carreras(id, nombre, codigo)
        )
      `)
      .eq('id', reservationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;  // Not found
      }
      console.error('Error fetching reservation:', error);
      throw new Error(`Failed to fetch reservation: ${error.message}`);
    }

    return data ? this.mapReservationWithCarrera(data) : null;
  }

  /**
   * Cancel a reservation
   * Only the owner can cancel
   */
  async cancelReservation(reservationId: string, studentId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Verify ownership
    const { data: reservation, error: fetchError } = await supabase
      .from('inventory_reservations')
      .select('user_id')
      .eq('id', reservationId)
      .single();

    if (fetchError || !reservation) {
      return {
        success: false,
        error: 'Reservation not found',
      };
    }

    if (reservation.user_id !== studentId) {
      return {
        success: false,
        error: 'Unauthorized: you can only cancel your own reservations',
      };
    }

    // Check if reservation can be cancelled (not already completed)
    const { data: res } = await supabase
      .from('inventory_reservations')
      .select('status')
      .eq('id', reservationId)
      .single();

    if (res?.status === 'completed') {
      return {
        success: false,
        error: 'Cannot cancel a completed reservation',
      };
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('inventory_reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservationId);

    if (updateError) {
      console.error('Error cancelling reservation:', updateError);
      return {
        success: false,
        error: 'Failed to cancel reservation',
      };
    }

    return {
      success: true,
    };
  }

  /**
   * Get availability for a unit
   * Returns list of booked time slots for a given date
   */
  async getUnitAvailability(
    unitId: string,
    date: Date
  ): Promise<{ start: Date; end: Date }[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('inventory_reservations')
      .select('start_at, end_at')
      .eq('unit_id', unitId)
      .in('status', ['reserved', 'completed'])
      .gte('start_at', dayStart.toISOString())
      .lte('end_at', dayEnd.toISOString())
      .order('start_at', { ascending: true });

    if (error) {
      console.error('Error fetching availability:', error);
      return [];
    }

    return (data || []).map(row => ({
      start: new Date(row.start_at),
      end: new Date(row.end_at),
    }));
  }

  // --------- PRIVATE HELPER METHODS ---------

  /**
   * Map database reservation row to domain type
   */
  private mapReservation(row: any): InventoryReservation {
    return {
      id: row.id,
      createdAt: new Date(row.created_at),
      productId: row.product_id,
      unitId: row.unit_id,
      userId: row.user_id,
      requesterName: row.requester_name,
      requesterCode: row.requester_code,
      purpose: row.purpose,
      startAt: new Date(row.start_at),
      endAt: new Date(row.end_at),
      status: row.status,
    };
  }

  /**
   * Map reservation with joined carrera and alumno data
   */
  private mapReservationWithCarrera(row: any): ReservationWithCarrera {
    const base = this.mapReservation(row);

    const carrera = row.alumnos?.carreras ? {
      id: row.alumnos.carreras.id,
      nombre: row.alumnos.carreras.nombre,
      codigo: row.alumnos.carreras.codigo,
      description: null,
      activa: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } : undefined;

    const alumno = row.alumnos ? {
      id: row.alumnos.id,
      nombre: row.alumnos.nombre,
      apellido: row.alumnos.apellido,
      email: '',  // Not included in join, fetch separately if needed
      carrera_id: row.alumnos.carrera_id,
      carrera,
      emailVerificado: false,
      activo: true,
      authUserId: null,
      magicToken: null,
      magicTokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } : undefined;

    return {
      ...base,
      carrera,
      alumno,
    };
  }
}

export const reservationService = new ReservationService();
