/**
 * Student Service
 * Handles student registration, profile management, and carrera assignment
 * Clean separation of business logic from API layer
 */

import { supabase } from '@/supabaseClient';
import type { 
  Database,
  Alumno, 
  Carrera,
  RegisterRequest, 
  RegisterResponse,
  ApiResponse 
} from '@/types/Database';

class StudentService {
  /**
   * Get all available carreras (for registration form)
   * Public endpoint - no auth required
   */
  async getCarreras(): Promise<Carrera[]> {
    const { data, error } = await supabase
      .from('carreras')
      .select('*')
      .eq('activa', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching carreras:', error);
      throw new Error(`Failed to fetch carreras: ${error.message}`);
    }

    return (data || []).map(row => this.mapCarrera(row));
  }

  /**
   * Register a new student
   * Creates entry in alumnos table with carrera assignment
   */
  async registerStudent(request: RegisterRequest): Promise<Alumno> {
    // Validation
    if (!request.email || !request.nombre || !request.apellido || !request.carrera_id) {
      throw new Error('Missing required registration fields');
    }

    // Validate email format (UPC institutional email)
    if (!this.isValidUpcEmail(request.email)) {
      throw new Error('Please use a valid UPC institutional email (@upc.edu.pe)');
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('alumnos')
      .select('id')
      .eq('email', request.email.toLowerCase().trim())
      .single();

    if (existing) {
      throw new Error('Email already registered. Please login instead.');
    }

    // Verify carrera exists
    const { data: carrera } = await supabase
      .from('carreras')
      .select('id')
      .eq('id', request.carrera_id)
      .eq('activa', true)
      .single();

    if (!carrera) {
      throw new Error('Invalid carrera selection');
    }

    // Create new student
    const { data, error } = await supabase
      .from('alumnos')
      .insert([
        {
          email: request.email.toLowerCase().trim(),
          nombre: request.nombre.trim(),
          apellido: request.apellido.trim(),
          carrera_id: request.carrera_id,
          // email_verificado: false (default in DB)
          // activo: true (default in DB)
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error registering student:', error);
      throw new Error(`Registration failed: ${error.message}`);
    }

    return this.mapAlumno(data);
  }

  /**
   * Get student profile by email
   * Used during login and profile retrieval
   */
  async getStudentByEmail(email: string): Promise<Alumno | null> {
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('activo', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Error fetching student:', error);
      throw new Error(`Error fetching student profile: ${error.message}`);
    }

    return data ? this.mapAlumno(data) : null;
  }

  /**
   * Get student profile by ID
   * Used after authentication to fetch full profile
   */
  async getStudentById(studentId: string): Promise<Alumno | null> {
    const { data, error } = await supabase
      .from('alumnos')
      .select('*, carreras!inner(id, nombre, description)')
      .eq('id', studentId)
      .eq('activo', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching student by ID:', error);
      throw new Error(`Error fetching student: ${error.message}`);
    }

    if (!data) return null;

    const mapped = this.mapAlumno(data);
    if (data.carreras) {
      mapped.carrera = this.mapCarrera(data.carreras);
    }
    return mapped;
  }

  /**
   * Update student profile
   * Admin/self operation to update name, carrera, etc.
   */
  async updateStudent(
    studentId: string,
    updates: Partial<Omit<Alumno, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Alumno> {
    const { data, error } = await supabase
      .from('alumnos')
      .update({
        ...(updates.nombre && { nombre: updates.nombre }),
        ...(updates.apellido && { apellido: updates.apellido }),
        ...(updates.carrera_id && { carrera_id: updates.carrera_id }),
        ...(updates.emailVerificado !== undefined && { email_verificado: updates.emailVerificado }),
      })
      .eq('id', studentId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating student:', error);
      throw new Error(`Failed to update student: ${error.message}`);
    }

    return this.mapAlumno(data);
  }

  /**
   * Soft delete - deactivate student account
   */
  async deactivateStudent(studentId: string): Promise<void> {
    const { error } = await supabase
      .from('alumnos')
      .update({ activo: false })
      .eq('id', studentId);

    if (error) {
      console.error('Error deactivating student:', error);
      throw new Error(`Failed to deactivate student: ${error.message}`);
    }
  }

  // --------- PRIVATE HELPER METHODS ---------

  /**
   * Validate UPC institutional email
   */
  private isValidUpcEmail(email: string): boolean {
    const upcEmailRegex = /^[a-zA-Z0-9._-]+@upc\.edu\.pe$/i;
    return upcEmailRegex.test(email.trim());
  }

  /**
   * Map database Alumno row to domain type
   */
  private mapAlumno(row: any): Alumno {
    return {
      id: row.id,
      email: row.email,
      nombre: row.nombre,
      apellido: row.apellido,
      carrera_id: row.carrera_id,
      magicToken: row.magic_token,
      magicTokenExpiry: row.magic_token_expiry ? new Date(row.magic_token_expiry) : null,
      emailVerificado: row.email_verificado,
      activo: row.activo,
      authUserId: row.auth_user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database Carrera row to domain type
   */
  private mapCarrera(row: any): Carrera {
    return {
      id: row.id,
      nombre: row.nombre,
      codigo: row.codigo,
      description: row.description,
      activa: row.activa,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const studentService = new StudentService();
