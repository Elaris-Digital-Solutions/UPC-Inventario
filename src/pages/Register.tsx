import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import upcLogo from "@/assets/upc-logo.png";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";

type CarreraOption = {
  id: string;
  nombre: string;
};

const Register = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [carreraId, setCarreraId] = useState("");

  const [carreras, setCarreras] = useState<CarreraOption[]>([]);
  const [loadingCarreras, setLoadingCarreras] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialEmailFromNav = (location.state as any)?.email as string | undefined;

  useEffect(() => {
    const stored = (() => {
      try {
        return localStorage.getItem('upc_register_email') || '';
      } catch {
        return '';
      }
    })();

    const candidate = (initialEmailFromNav || stored || '').trim().toLowerCase();
    if (candidate) setEmail(candidate);
  }, [initialEmailFromNav]);

  useEffect(() => {
    const loadCarreras = async () => {
      setLoadingCarreras(true);
      const { data, error } = await supabase
        .from('carreras')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error cargando carreras:', error);
        setCarreras([]);
        setLoadingCarreras(false);
        return;
      }

      const options = (data || []).map((row: any) => ({
        id: String(row.id),
        nombre: String(row.nombre),
      }));
      setCarreras(options);
      setLoadingCarreras(false);
    };

    void loadCarreras();
  }, []);

  const carrerasDisabled = useMemo(() => loadingCarreras || carreras.length === 0, [loadingCarreras, carreras.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.endsWith("@upc.edu.pe")) {
      toast.error("Solo se permiten correos @upc.edu.pe");
      return;
    }

    if (!nombre.trim() || !apellido.trim()) {
      toast.error("Completa tu nombre y apellido");
      return;
    }

    if (!carreraId) {
      toast.error("Selecciona tu carrera");
      return;
    }

    setIsSubmitting(true);

    // Prefer RPC (SECURITY DEFINER) if available; fallback to direct insert.
    const { data: rpcData, error: rpcError } = await supabase.rpc('register_alumno', {
      p_email: normalizedEmail,
      p_nombre: nombre.trim(),
      p_apellido: apellido.trim(),
      p_carrera_id: carreraId,
    });

    if (rpcError) {
      const { error: insertError } = await supabase
        .from('alumnos')
        .insert([
          {
            email: normalizedEmail,
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            carrera_id: carreraId,
          }
        ]);

      setIsSubmitting(false);

      if (insertError) {
        console.error('Error registrando alumno:', rpcError, insertError);
        toast.error(insertError.message || rpcError.message || 'No se pudo completar el registro');
        return;
      }
    } else {
      // rpcData can be array or object depending on PostgREST
      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (row && row.success === false) {
        setIsSubmitting(false);
        toast.error(row.message || 'No se pudo completar el registro');
        return;
      }
      setIsSubmitting(false);
    }

    toast.success('Registro completado. Ahora inicia sesión.');
    try {
      localStorage.setItem('upc_login_email_prefill', normalizedEmail);
    } catch {
      // ignore
    }
    navigate('/login');
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
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  placeholder="Juan"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  placeholder="Pérez García"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
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
                <Label htmlFor="carrera">Carrera</Label>
                <Select value={carreraId} onValueChange={setCarreraId}>
                  <SelectTrigger id="carrera" className="w-full">
                    <SelectValue placeholder={carrerasDisabled ? "Cargando carreras..." : "Selecciona tu carrera"} />
                  </SelectTrigger>
                  <SelectContent>
                    {carreras.map((carrera) => (
                      <SelectItem key={carrera.id} value={carrera.id}>
                        {carrera.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={isSubmitting || carrerasDisabled}>
                {isSubmitting ? "Registrando..." : "Completar registro"}
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
