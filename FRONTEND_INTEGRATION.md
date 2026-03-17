# Frontend Integration Guide

This guide explains how to integrate the new backend services into your React frontend.

---

## 1. Update App.tsx with New AuthProvider

Replace the old AuthProvider with the new one:

```tsx
// src/App.tsx
import { AuthProvider } from '@/context/AuthContextNew';  // Use the new provider
import Router from '@/Router';

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
```

---

## 2. Registration Form Component

Create a new registration form that uses carreras dropdown:

```tsx
// src/components/RegistrationForm.tsx
import { useState } from 'react';
import { useAuth } from '@/context/AuthContextNew';
import { useNavigate } from 'react-router-dom';
import type { Carrera } from '@/types/Database';

export default function RegistrationForm() {
  const { register, getCarreras } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    apellido: '',
    carrera_id: '',
  });

  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load carreras on mount
  useState(() => {
    const loadCarreras = async () => {
      const data = await getCarreras();
      setCarreras(data);
    };
    loadCarreras();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await register(
      formData.email,
      formData.nombre,
      formData.apellido,
      formData.carrera_id
    );

    if (result.success) {
      setSuccess(true);
      // Optionally redirect or show success message
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setError(result.error || 'Registration failed');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Email (UPC)</label>
        <input
          type="email"
          placeholder="nombre@upc.edu.pe"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">First Name</label>
        <input
          type="text"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Last Name</label>
        <input
          type="text"
          value={formData.apellido}
          onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Major (Carrera)</label>
        <select
          value={formData.carrera_id}
          onChange={(e) => setFormData({ ...formData, carrera_id: e.target.value })}
          required
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Select a major...</option>
          {carreras.map((carrera) => (
            <option key={carrera.id} value={carrera.id}>
              {carrera.nombre} ({carrera.codigo})
            </option>
          ))}
        </select>
      </div>

      {error && <div className="text-red-600">{error}</div>}
      {success && <div className="text-green-600">Registration successful! Redirecting...</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-2 rounded hover:opacity-90"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}
```

---

## 3. Login Form Component (Magic Link)

Create a login form with magic link flow:

```tsx
// src/components/LoginForm.tsx
import { useState } from 'react';
import { useAuth } from '@/context/AuthContextNew';
import type { FormEvent } from 'react';

interface LoginFormProps {
  onMagicLinkSent?: () => void;
}

export default function LoginForm({ onMagicLinkSent }: LoginFormProps) {
  const { requestMagicLink, verifyToken } = useAuth();

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [stage, setStage] = useState<'email' | 'token'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await requestMagicLink(email);

    if (result.success) {
      setStage('token');
      onMagicLinkSent?.();

      // For development: show token (in production, it's sent via email)
      if (result.token) {
        console.log('Development: Token =', result.token);
      }
    } else {
      setError(result.error || 'Failed to request magic link');
    }

    setLoading(false);
  };

  const handleVerifyToken = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await verifyToken(token);

    if (result.success) {
      // Token verified, session stored by AuthProvider
      window.location.href = '/catalogo';
    } else {
      setError(result.error || 'Invalid or expired token');
    }

    setLoading(false);
  };

  if (stage === 'email') {
    return (
      <form onSubmit={handleRequestMagicLink} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email (UPC)</label>
          <input
            type="email"
            placeholder="nombre@upc.edu.pe"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        {error && <div className="text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded hover:opacity-90"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyToken} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">
          Enter the code from your email
        </label>
        <input
          type="text"
          placeholder="abc123xyz789..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
        <p className="text-xs text-gray-500 mt-1">
          Check your email for the login code (valid for 15 minutes)
        </p>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-2 rounded hover:opacity-90"
      >
        {loading ? 'Verifying...' : 'Verify & Login'}
      </button>

      <button
        type="button"
        onClick={() => {
          setStage('email');
          setEmail('');
          setError(null);
        }}
        className="w-full text-primary underline"
      >
        Back
      </button>
    </form>
  );
}
```

---

## 4. Updated Reservation Form (WITHOUT carrera)

The key change: **carrera is removed from the reservation form** because it's stored in the student profile.

```tsx
// src/components/ReservationForm.tsx
import { useState } from 'react';
import { useAuth, useAuthToken } from '@/context/AuthContextNew';
import type { CreateReservationRequest } from '@/types/Database';

interface ReservationFormProps {
  productId: string;
  unitId: string;
  onSuccess?: () => void;
}

export default function ReservationForm({
  productId,
  unitId,
  onSuccess,
}: ReservationFormProps) {
  const { alumno, isAuthenticated } = useAuth();
  const authToken = useAuthToken();

  const [formData, setFormData] = useState({
    start_at: '',
    end_at: '',
    purpose: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isAuthenticated) {
    return <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">Please log in to make a reservation</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate times
    const start = new Date(formData.start_at);
    const end = new Date(formData.end_at);

    if (end <= start) {
      setError('End time must be after start time');
      setLoading(false);
      return;
    }

    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours > 2) {
      setError('Reservation cannot exceed 2 hours');
      setLoading(false);
      return;
    }

    if (durationHours < 0.25) {
      setError('Reservation must be at least 15 minutes');
      setLoading(false);
      return;
    }

    try {
      const reservation: CreateReservationRequest = {
        product_id: productId,
        unit_id: unitId,
        start_at: formData.start_at,
        end_at: formData.end_at,
        purpose: formData.purpose || null,
      };

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken || '',
        },
        body: JSON.stringify(reservation),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        onSuccess?.();
        setTimeout(() => {
          setSuccess(false);
          setFormData({ start_at: '', end_at: '', purpose: '' });
        }, 3000);
      } else {
        setError(result.error || 'Failed to create reservation');
      }
    } catch (err) {
      console.error('Reservation error:', err);
      setError('An error occurred while creating the reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded">
      {/* Student info (read-only) */}
      <div className="bg-gray-50 p-3 rounded text-sm">
        <p className="font-medium">{alumno?.nombre} {alumno?.apellido}</p>
        <p className="text-gray-600">{alumno?.carrera?.nombre}</p>
        <p className="text-gray-600">{alumno?.email}</p>
      </div>

      {/* Start time */}
      <div>
        <label className="block text-sm font-medium mb-1">Start Time *</label>
        <input
          type="datetime-local"
          value={formData.start_at}
          onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {/* End time */}
      <div>
        <label className="block text-sm font-medium mb-1">End Time *</label>
        <input
          type="datetime-local"
          value={formData.end_at}
          onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {/* Purpose (optional) */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Purpose (optional)
        </label>
        <textarea
          value={formData.purpose}
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          placeholder="e.g., Class project, research..."
          className="w-full px-3 py-2 border rounded"
          rows={3}
        />
      </div>

      {/* Messages */}
      {error && <div className="p-3 bg-red-100 border border-red-400 rounded text-red-700">{error}</div>}
      {success && (
        <div className="p-3 bg-green-100 border border-green-400 rounded text-green-700">
          Reservation created successfully!
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-2 rounded hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Creating Reservation...' : 'Create Reservation'}
      </button>
    </form>
  );
}
```

---

## 5. My Reservations List Component

Display all reservations for the authenticated student:

```tsx
// src/components/MyReservations.tsx
import { useState, useEffect } from 'react';
import { useAuth, useAuthToken } from '@/context/AuthContextNew';
import type { ReservationWithCarrera } from '@/types/Database';

export default function MyReservations() {
  const { isAuthenticated } = useAuth();
  const authToken = useAuthToken();

  const [reservations, setReservations] = useState<ReservationWithCarrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchReservations = async () => {
      try {
        const response = await fetch('/api/reservations', {
          headers: {
            Authorization: authToken || '',
          },
        });

        const result = await response.json();

        if (result.success) {
          setReservations(result.reservations);
        } else {
          setError(result.error || 'Failed to fetch reservations');
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load reservations');
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [isAuthenticated, authToken]);

  if (!isAuthenticated) {
    return <div>Please log in to view your reservations</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (reservations.length === 0) {
    return <div>No reservations yet</div>;
  }

  return (
    <div className="space-y-4">
      {reservations.map((res) => (
        <div key={res.id} className="p-4 border rounded">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{res.requesterName}</p>
              <p className="text-sm text-gray-600">{res.carrera?.nombre}</p>
              <p className="text-sm text-gray-600">
                {new Date(res.startAt).toLocaleString()} to{' '}
                {new Date(res.endAt).toLocaleString()}
              </p>
              {res.purpose && <p className="text-sm italic mt-2">{res.purpose}</p>}
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                res.status === 'reserved'
                  ? 'bg-blue-100 text-blue-700'
                  : res.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
              }`}>
                {res.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 6. Using Auth in Components

### Check if user is authenticated:

```tsx
import { useAuth } from '@/context/AuthContextNew';

export default function MyComponent() {
  const { isAuthenticated, alumno } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return <div>Welcome, {alumno?.nombre}!</div>;
}
```

### Protected routes:

```tsx
import { useAuth } from '@/context/AuthContextNew';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  element: React.ReactNode;
}

export default function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? element : <Navigate to="/login" />;
}
```

### Get auth token for API calls:

```tsx
import { useAuthToken } from '@/context/AuthContextNew';

export default function MyComponent() {
  const authToken = useAuthToken();

  const handleFetch = async () => {
    const response = await fetch('/api/some-endpoint', {
      headers: {
        Authorization: authToken || '',
      },
    });
    // ...
  };

  return <button onClick={handleFetch}>Fetch Data</button>;
}
```

---

## 7. Migration Checklist

**Before going live:**

- [ ] Replace `AuthContext.tsx` usage with `AuthContextNew.tsx`
- [ ] Update all login pages to use new `LoginForm`
- [ ] Update registration page to use new `RegistrationForm`
- [ ] Update reservation form to remove carrera field
- [ ] Update API calls to use `/api/` endpoints (not Supabase REST)
- [ ] Test magic link flow end-to-end
- [ ] Test reservation creation with new carrera-from-profile logic
- [ ] Verify session token persistence across page reloads
- [ ] In production: Remove magic link token from login response (send via email instead)
- [ ] In production: Implement proper JWT signing in AuthService (replace mock implementation)

---

## 8. Key Differences from Old System

| Aspect | Old (Supabase Auth) | New (Services) |
|--------|-------------------|----------------|
| **Registration** | OTP to unregistered email | Register with name + carrera |
| **Carrera** | Selected per reservation | Selected once at registration |
| **Auth Flow** | Supabase magic link → session | Custom magic link → session token |
| **Session Storage** | Supabase session | localStorage (sessionToken) |
| **API** | Supabase REST | Custom Express routes |
| **Database** | Supabase default schema | New carreras + alumnos tables |

---

## 9. Common Patterns

### Logout:

```tsx
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  navigate('/');
};
```

### Redirect after login:

```tsx
const navigate = useNavigate();
const handleLoginSuccess = () => {
  navigate('/catalogo');
};
```

### Show profile dropdown:

```tsx
const { alumno, isAuthenticated } = useAuth();

if (isAuthenticated) {
  return (
    <div>
      <strong>{alumno?.nombre} {alumno?.apellido}</strong>
      <small>{alumno?.carrera?.codigo}</small>
    </div>
  );
}
```

---

## 10. Troubleshooting

**Session token not persisting:**
- Check browser localStorage: `localStorage.getItem('upc_session_token')`
- Verify token isn't expired: `localStorage.getItem('upc_session_expiry')`

**404 on API routes:**
- Ensure Express server is running with `/api` prefix
- Check `src/api/routes.ts` is properly imported and `setupRoutes()` called

**Magic link token verification fails:**
- Token expires after 15 minutes (see `AuthService.ts` line ~14)
- Ensure backend and client time are synchronized

**"Student not found" error:**
- Verify student record exists in database in `alumnos` table
- Check carrera_id is valid UUID in `carreras` table
