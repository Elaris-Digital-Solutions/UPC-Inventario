import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
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
    <div className="min-h-screen bg-background pt-24 pb-12 flex items-center justify-center px-4">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-card rounded-xl shadow-brutal border-[3px] border-foreground p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-primary/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border-[2px] border-foreground">
              <Lock className="h-8 w-8 text-secondary" />
            </div>
            <h1 className="font-heading text-4xl text-foreground mb-2">
              Admin King's Pong
            </h1>
            <p className="font-body text-muted-foreground">
              Ingresa tus credenciales para acceder
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block font-body text-sm font-medium text-foreground mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-[2px] border-foreground/20 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                placeholder="admin@kingspong.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-body text-sm font-medium text-foreground mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full px-4 py-3 pr-12 border-[2px] rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                    error ? 'border-destructive' : 'border-foreground/20'
                  }`}
                  placeholder="Ingresa tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!email || !password || isLoading}
              className="w-full bg-secondary hover:bg-secondary/90 disabled:bg-muted disabled:cursor-not-allowed text-secondary-foreground px-6 py-3 rounded-md font-body font-bold transition-colors duration-200 flex items-center justify-center space-x-2 border-[2px] border-foreground"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  <span>Acceder</span>
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-primary/10 rounded-lg border-[2px] border-foreground/20">
            <p className="font-body text-sm text-muted-foreground text-center">
              Solo el personal autorizado puede acceder a esta sección
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
