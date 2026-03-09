import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await login(email, password);
      if (error) {
        setError('Credenciales incorrectas');
      } else {
        onLogin();
      }
    } catch (err) {
      setError('Ocurrió un error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100svh-6rem)] items-center justify-center overflow-hidden bg-[#f7f7f7] px-4 py-10 sm:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 right-[-12rem] h-72 w-72 rounded-full bg-[hsl(356_95%_45%/.14)] blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[-10rem] h-72 w-72 rounded-full bg-[hsl(356_95%_45%/.09)] blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <div className="border border-gray-200 bg-white px-6 py-8 shadow-[0_20px_60px_-38px_rgba(12,12,12,0.45)] sm:px-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-[hsl(356_95%_45%/.25)] bg-white shadow-[0_10px_30px_-16px_hsl(356_95%_45%)]">
              <img src="/favicon.png" alt="Logo UPC" className="h-12 w-12 object-contain" />
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-500">
              Acceso Interno
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-gray-900 sm:text-[2.45rem]">
              Panel de
              <span className="block text-primary">Administración</span>
            </h1>
            <div className="mx-auto mt-4 h-px w-14 bg-primary" />
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              Ingresa tus credenciales para administrar inventario, reservas y verificaciones.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-700">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-none border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors duration-200 placeholder:text-gray-400 focus:border-primary"
                placeholder="admin@inventario-upc.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-700">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full rounded-none border bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition-colors duration-200 placeholder:text-gray-400 focus:border-primary ${
                    error ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="Ingresa tu contrasena"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 hover:text-gray-700"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!email || !password || isLoading}
              className="group mt-2 inline-flex w-full items-center justify-center gap-2 border border-primary bg-primary px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition-colors duration-200 hover:bg-[hsl(356,95%,37%)] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-600"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-b-white" />
                  <span>Verificando</span>
                </>
              ) : (
                <>
                  <span>Acceder</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border border-[hsl(356_95%_45%/.18)] bg-[hsl(356_95%_45%/.09)] p-4">
            <p className="text-center text-xs font-medium text-[hsl(356_95%_30%)]">
              Solo personal autorizado puede acceder a esta sección.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
