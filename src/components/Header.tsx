import { Link, useLocation } from "react-router-dom";
import upcLogo from "@/assets/upc-logo.png";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type HeaderProps = {
  className?: string;
};

const Header = ({ className }: HeaderProps) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuth = location.pathname === "/login" || location.pathname === "/register";

  return (
    <header className={cn("sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md", className)}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={upcLogo} alt="UPC Logo" className="h-10 w-auto" />
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-tight text-foreground">Reserva UPC</p>
            <p className="text-xs text-muted-foreground">Sistema de Préstamos</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 md:flex">
          {!isAuth && (
            <>
              <Link to="/catalogo">
                <Button variant="ghost" size="sm">Catálogo</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="sm">Iniciar Sesión</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Registrarse</Button>
              </Link>
            </>
          )}
          {isAuth && (
            <Link to="/">
              <Button variant="ghost" size="sm">← Volver al inicio</Button>
            </Link>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            <Link to="/catalogo" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">Catálogo</Button>
            </Link>
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full">Iniciar Sesión</Button>
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)}>
              <Button className="w-full">Registrarse</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
