/**
 * studentService — acceso a datos de alumnos.
 * RLS server-side restringe el acceso al propio registro o staff.
 */
import { supabase } from '@/infrastructure/supabase/client';

export interface Alumno {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  carrera_id: number | null;
  email_verificado: boolean;
  activo: boolean;
  banned_until: string | null;
}

export const studentService = {
  /** Obtiene el perfil del alumno autenticado por email. */
  async getStudentByEmail(email: string): Promise<Alumno | null> {
    const { data, error } = await supabase
      .from('alumnos')
      .select('id, email, nombre, apellido, carrera_id, email_verificado, activo, banned_until')
      .eq('email', email.trim().toLowerCase())
      .eq('activo', true)
      .maybeSingle();
    if (error) throw error;
    return (data as Alumno | null) ?? null;
  },

  /** Lista carreras activas para el formulario de registro. */
  async getCarreras(): Promise<{ id: number; nombre: string }[]> {
    const { data, error } = await supabase
      .from('carreras')
      .select('id, nombre')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ id: Number(r.id), nombre: String(r.nombre) }));
  },
};
