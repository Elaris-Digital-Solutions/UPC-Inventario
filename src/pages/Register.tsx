import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import upcLogo from "@/assets/upc-logo.png";
import { useState } from "react";
import { toast } from "sonner";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith("@upc.edu.pe")) {
      toast.error("Solo se permiten correos @upc.edu.pe");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    toast.success("Registro exitoso (mock)");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
            <div className="mb-8 flex flex-col items-center gap-3">
              <img src={upcLogo} alt="UPC" className="h-14 w-auto" />
              <h1 className="text-2xl font-bold text-card-foreground">Crear Cuenta</h1>
              <p className="text-sm text-muted-foreground">Usa tu correo institucional @upc.edu.pe</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo institucional</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@upc.edu.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full text-base font-semibold">
                Crear cuenta
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;
