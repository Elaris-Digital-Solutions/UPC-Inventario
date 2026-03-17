/**
 * API Routes (backend-only)
 * Express routes for student registration, authentication, and reservations.
 *
 * NOTE: This file is intentionally kept OUTSIDE of `src/` so Vite/React builds
 * don't attempt to bundle it.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { studentService } from '../../src/services/StudentService';
import { authService } from '../../src/services/AuthService';
import { reservationService } from '../../src/services/ReservationService';
import type {
  RegisterRequest,
  LoginRequest,
  VerifyTokenRequest,
  CreateReservationRequest,
} from '../../src/types/Database';

const router = Router();

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

/**
 * Middleware: Verify session token from Authorization header
 * Sets req.user with student ID if valid
 */
async function authenticateSession(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.slice(7);

  try {
    const studentId = await authService.verifySessionToken(token);
    if (!studentId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token',
      });
    }
    req.user = { id: studentId };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

// =====================================================
// AUTH ROUTES
// =====================================================

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const body: RegisterRequest = req.body;

    if (!body.email || !body.nombre || !body.apellido || !body.carrera_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, nombre, apellido, carrera_id',
      });
    }

    const alumno = await studentService.registerStudent(body);

    res.status(201).json({
      success: true,
      alumno,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during registration',
    });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as LoginRequest;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const result = await authService.requestMagicLink(email);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
});

router.post('/auth/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body as VerifyTokenRequest;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    const result = await authService.verifyToken(token);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
});

router.post('/auth/logout', authenticateSession, async (req: Request, res: Response) => {
  try {
    await authService.logout(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
});

// =====================================================
// STUDENT ROUTES
// =====================================================

router.get('/students/me', authenticateSession, async (req: Request, res: Response) => {
  try {
    const alumno = await studentService.getStudentById(req.user!.id);

    if (!alumno) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    res.status(200).json({
      success: true,
      alumno,
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
});

router.get('/carreras', async (_req: Request, res: Response) => {
  try {
    const carreras = await studentService.getCarreras();

    res.status(200).json({
      success: true,
      carreras,
    });
  } catch (error) {
    console.error('Error fetching carreras:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
});

// =====================================================
// RESERVATION ROUTES
// =====================================================

router.post('/reservations', authenticateSession, async (req: Request, res: Response) => {
  try {
    const body: CreateReservationRequest = req.body;

    if (!body.product_id || !body.unit_id || !body.start_at || !body.end_at) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: product_id, unit_id, start_at, end_at',
      });
    }

    const result = await reservationService.createReservation(req.user!.id, body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Reservation creation error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
});

router.get('/reservations', authenticateSession, async (req: Request, res: Response) => {
  try {
    const reservations = await reservationService.getStudentReservations(req.user!.id);

    res.status(200).json({
      success: true,
      reservations,
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
});

router.get('/reservations/:reservationId', authenticateSession, async (req: Request, res: Response) => {
  try {
    const reservation = await reservationService.getReservationById(req.params.reservationId);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    if (reservation.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: you can only view your own reservations',
      });
    }

    res.status(200).json({
      success: true,
      reservation,
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
});

router.delete('/reservations/:reservationId', authenticateSession, async (req: Request, res: Response) => {
  try {
    const result = await reservationService.cancelReservation(req.params.reservationId, req.user!.id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
});

export function setupRoutes(app: any) {
  app.use('/api', router);
}

export { router };
