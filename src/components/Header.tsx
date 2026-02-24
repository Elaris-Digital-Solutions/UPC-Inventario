import { Link, useLocation } from "react-router-dom";
import upcLogo from "@/assets/upc-logo.png";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

type HeaderProps = {
  className?: string;
};

const Header = ({ className }: HeaderProps) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const isAuth = location.pathname === "/login";

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
  };

  return (
    <header className={cn("sticky top-0 z-50 border-b border-gray-100 bg-white", className)}>
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-4 shrink-0">
          <img src={upcLogo} alt="UPC Logo" className="h-12 w-auto" />
          <div className="hidden border-l border-gray-200 pl-4 sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-900 leading-tight">
              Reserva UPC
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 leading-tight mt-0.5">
              Sistema de Préstamos
            </p>
          </div>
        </Link>

        {/* Desktop nav */}
        {!isAuth && (
          <nav className="hidden items-center gap-10 md:flex">
            <Link
              to={isAuthenticated ? "/catalogo" : "/login"}
              className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600 transition-colors duration-200 hover:text-gray-900"
            >
              Catálogo
            </Link>

            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600 transition-colors duration-200 hover:text-gray-900"
              >
                Cerrar Sesión
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center bg-primary px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition-colors duration-200 hover:bg-[hsl(356,95%,36%)]"
              >
                Iniciar Sesión
              </Link>
            )}
          </nav>
        )}

        {isAuth && (
          <nav className="hidden md:flex">
            <Link
              to="/"
              className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600 transition-colors duration-200 hover:text-gray-900"
            >
              ← Volver al inicio
            </Link>
          </nav>
        )}

        {/* Mobile toggle */}
        <button
          className="text-gray-700 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Abrir menú"
        >
          {mobileOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-6 md:hidden">
          <nav className="flex flex-col gap-5">
            <Link
              to={isAuthenticated ? "/catalogo" : "/login"}
              onClick={() => setMobileOpen(false)}
              className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-700 hover:text-gray-900"
            >
              Catálogo
            </Link>
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-700 hover:text-gray-900"
              >
                Cerrar Sesión
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="inline-flex w-fit items-center bg-primary px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white hover:bg-[hsl(354,72%,38%)]"
              >
                Iniciar Sesión
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
