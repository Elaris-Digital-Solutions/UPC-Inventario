import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import upcLogo from "@/assets/upc-logo.png";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { sendMagicLink, isUniversityEmail, isAuthenticated, authLoading } = useAuth();
  const location = useLocation();

  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/catalogo";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUniversityEmail(email)) {
      toast.error("Ingresa una cuenta institucional válida (@upc.edu.pe)");
      return;
    }

    setLoading(true);
    const { error } = await sendMagicLink(email, fromPath);
    setLoading(false);

    if (error) {
      console.error("Error enviando magic link:", error);
      toast.error(error.message || "No se pudo iniciar sesión");
      return;
    }

    toast.success("Te enviamos un enlace de acceso a tu correo UPC");
  };

  if (!authLoading && isAuthenticated) {
    return <Navigate to={fromPath} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
            <div className="mb-8 flex flex-col items-center gap-3">
              <img src={upcLogo} alt="UPC" className="h-14 w-auto" />
              <h1 className="text-2xl font-bold text-card-foreground">Iniciar Sesión</h1>
              <p className="text-sm text-muted-foreground text-center">Ingresa con tu cuenta institucional UPC.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="space-y-2">
                <Label htmlFor="email">Correo institucional</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="u202315655@upc.edu.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={loading}>
                {loading ? "Enviando enlace..." : "Enviar enlace mágico"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Solo se permiten cuentas institucionales @upc.edu.pe. Revisa también tu carpeta de spam.
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Si no puedes ingresar con tu cuenta institucional, contacta al administrador del laboratorio.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
