/**
 * Authentication Service
 * Handles magic link login and token verification
 * Uses existing magic_token fields in alumnos table
 */

import { supabase } from '@/supabaseClient';
import { studentService } from './StudentService';
import type { 
  Alumno,
  LoginRequest,
  VerifyTokenRequest,
} from '@/types/Database';

// Token validity: 15 minutes
const MAGIC_TOKEN_TTL_MINUTES = 15;

class AuthService {
  /**
   * Request magic link login
   * Generates token, stores in DB, returns (optionally emails it)
   * 
   * In production, integrate with email service
   * For now, returns token in response (frontend can manually test)
   */
  async requestMagicLink(email: string): Promise<{ 
    success: boolean; 
    message: string;
    token?: string;  // Remove in production (for testing only)
    error?: string;
  }> {
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Validate email format
    if (!normalizedEmail || !this.isValidUpcEmail(normalizedEmail)) {
      return {
        success: false,
        error: 'Invalid UPC email format',
        message: 'Invalid UPC email format',
      };
    }

    // Check if student exists
    const student = await studentService.getStudentByEmail(normalizedEmail);
    if (!student) {
      // Don't reveal whether user exists (security best practice)
      // But for UX, we could say "If user exists, link sent"
      return {
        success: true,
        message: 'If an account exists, a magic link has been sent to your email.',
      };
    }

    // Generate token (32-char alphanumeric)
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + MAGIC_TOKEN_TTL_MINUTES);

    // Store token in database
    try {
      await supabase
        .from('alumnos')
        .update({
          magic_token: token,
          magic_token_expiry: expiresAt.toISOString(),
        })
        .eq('id', student.id);

      // TODO: In production, send email with magic link
      // await this.sendMagicLinkEmail(email, token);
      console.log(`[DEV] Magic token for ${email}: ${token}`);

      return {
        success: true,
        message: 'If an account exists, a magic link has been sent to your email.',
        token,  // Remove in production
      };
    } catch (error) {
      console.error('Error storing magic token:', error);
      return {
        success: false,
        message: 'Failed to request magic link. Please try again.',
      };
    }
  }

  /**
   * Verify magic token and authenticate user
   * Checks token validity and expiry, returns student profile + JWT
   */
  async verifyToken(token: string): Promise<{
    success: boolean;
    alumno?: Alumno;
    sessionToken?: string;  // For subsequent requests
    error?: string;
  }> {
    const normalizedToken = (token || '').trim();

    if (!normalizedToken) {
      return {
        success: false,
        error: 'Token is required',
      };
    }

    try {
      // Find student with matching token
      const { data: alumno, error } = await supabase
        .from('alumnos')
        .select('*')
        .eq('magic_token', token)
        .eq('activo', true)
        .single();

      if (error || !alumno) {
        return {
          success: false,
          error: 'Invalid token',
        };
      }

      // Check token expiry
      if (!alumno.magic_token_expiry) {
        return {
          success: false,
          error: 'Token has no expiry date',
        };
      }

      const expiresAt = new Date(alumno.magic_token_expiry);
      if (expiresAt < new Date()) {
        return {
          success: false,
          error: 'Token has expired. Please request a new magic link.',
        };
      }

      // Token valid! Clear it from DB and mark email as verified
      const { error: updateError } = await supabase
        .from('alumnos')
        .update({
          magic_token: null,
          magic_token_expiry: null,
          email_verificado: true,
        })
        .eq('id', alumno.id);

      if (updateError) {
        console.error('Error clearing token:', updateError);
        return {
          success: false,
          error: 'Failed to complete login',
        };
      }

      // Create a simple JWT or session token
      // In production, use proper JWT library (jose, jsonwebtoken)
      const sessionToken = this.createSessionToken(alumno.id);

      return {
        success: true,
        alumno: this.mapAlumno(alumno),
        sessionToken,
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      return {
        success: false,
        error: 'Failed to verify token',
      };
    }
  }

  /**
   * Verify JWT token and get student ID
   * Used in subsequent API calls to authenticate requests
   * Returns student ID if valid, null otherwise
   */
  async verifySessionToken(token: string): Promise<string | null> {
    try {
      // TODO: In production, use proper JWT verification (jose library)
      // For now, decode and validate the simple token
      const decoded = this.decodeSessionToken(token);
      if (!decoded || !decoded.studentId) {
        return null;
      }

      return decoded.studentId;
    } catch (error) {
      console.error('Error verifying session token:', error);
      return null;
    }
  }

  /**
   * Logout - clear session
   * Client-side mainly, but could do server-side validation
   */
  async logout(studentId: string): Promise<void> {
    // In production, you might maintain a token blacklist/invalidation table
    // For now, just client-side handling is sufficient
    console.log(`Logging out student ${studentId}`);
    // Clear local storage, cookies, etc. on frontend
  }

  // --------- PRIVATE HELPER METHODS ---------

  /**
   * Generate secure random token (32 char alphanumeric)
   */
  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Create simple session token (JWT-like)
   * In production, use proper JWT library: import { SignJWT } from 'jose';
   */
  private createSessionToken(studentId: string): string {
    // Simple base64 encoding for demo
    // REPLACE THIS with proper JWT signing!
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };
    const payload = {
      studentId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };
    const headerBase64 = btoa(JSON.stringify(header));
    const payloadBase64 = btoa(JSON.stringify(payload));
    // In production: sign with actual HMAC-SHA256
    return `${headerBase64}.${payloadBase64}.signature`;
  }

  /**
   * Decode session token
   * DEMO ONLY - use proper JWT verification in production
   */
  private decodeSessionToken(token: string): { studentId: string } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;  // Expired
      }
      return { studentId: payload.studentId };
    } catch {
      return null;
    }
  }

  /**
   * Validate UPC email
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
}

export const authService = new AuthService();
