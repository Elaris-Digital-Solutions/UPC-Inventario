import React, { useEffect, useState, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useProducts } from '@/context/ProductContext';
import { studentService } from '@/services/StudentService';
import { reservationService } from '@/services/ReservationService';
import { ReservationWithCarrera, Alumno } from '@/types/Database';
import { Calendar, History, Trophy, Activity, XCircle, AlertCircle, User as UserIcon, Mail, GraduationCap } from 'lucide-react';
import { format, isThisWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const UserDashboard = () => {
  const { user } = useAuth();
  const { products } = useProducts();
  const { toast } = useToast();
  
  const [reservations, setReservations] = useState<ReservationWithCarrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user?.email) return;
        
        const student = await studentService.getStudentByEmail(user.email);
        if (student) {
          setAlumno(student);
          setAlumnoId(student.id);
          const userReservations = await reservationService.getStudentReservations(student.id);
          setReservations(userReservations);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const handleCancelReservation = async () => {
    if (!cancelId || !alumnoId) return;
    
    setIsCancelling(true);
    try {
      const response = await reservationService.cancelReservation(cancelId, alumnoId);
      
      if (response.success) {
        toast({
          title: "Reserva cancelada",
          description: "Tu reserva ha sido cancelada exitosamente.",
        });
        
        // Update local state
        setReservations(prev => 
          prev.map(res => 
            res.id === cancelId ? { ...res, status: 'cancelled' } as ReservationWithCarrera : res
          )
        );
      } else {
        toast({
          variant: "destructive",
          title: "Error al cancelar",
          description: response.error || "No se pudo cancelar la reserva",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado al cancelar.",
      });
    } finally {
      setIsCancelling(false);
      setCancelId(null);
    }
  };

  const getProduct = (id: string) => products.find(p => p.id === id);

  const stats = useMemo(() => {
    if (!reservations.length) return { mostRequested: null, weekCount: 0 };

    // Count reservations this week
    const weekCount = reservations.filter(r => {
      const start = new Date(r.startAt);
      return isThisWeek(start, { weekStartsOn: 1 }); // Assuming week starts on Monday
    }).length;

    // Find most requested device
    const productCounts = reservations.reduce((acc, r) => {
      acc[r.productId] = (acc[r.productId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let maxCount = 0;
    let mostRequestedId = null;

    Object.entries(productCounts).forEach(([pId, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostRequestedId = pId;
      }
    });

    const mostRequested = mostRequestedId ? getProduct(mostRequestedId) : null;

    return { mostRequested, weekCount };
  }, [reservations, products]);

  const activeReservations = reservations.filter(r => r.status === 'reserved');
  const pastReservations = reservations.filter(r => r.status !== 'reserved');

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f7]">
      <Header />
      
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900">Mi Panel</h1>
          <p className="text-gray-500 mt-2">Gestiona tus reservas y visualiza tu historial.</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Stats */}
            <div className="lg:col-span-1 space-y-6">
              
              {alumno && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <UserIcon size={80} />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-4">Tu Perfil</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-50 text-gray-500 p-2 rounded-lg shrink-0">
                        <UserIcon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Nombre</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{alumno.nombre} {alumno.apellido}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-50 text-gray-500 p-2 rounded-lg shrink-0">
                        <Mail size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Correo</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{alumno.email}</p>
                      </div>
                    </div>
                    {alumno.carrera?.nombre && (
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-50 text-gray-500 p-2 rounded-lg shrink-0">
                          <GraduationCap size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 uppercase tracking-widest">Carrera</p>
                          <p className="text-sm font-medium text-gray-900 truncate">{alumno.carrera.nombre}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Activity size={80} />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                    <Calendar size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-700">Préstamos esta semana</h3>
                </div>
                <p className="text-4xl font-bold text-gray-900 mt-4">{stats.weekCount}</p>
                <p className="text-xs text-gray-400 mt-2 uppercase tracking-wide">Solicitudes activas o pasadas</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Trophy size={80} />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-amber-50 text-amber-600 p-2 rounded-lg">
                    <Trophy size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-700">Tu favorito</h3>
                </div>
                {stats.mostRequested ? (
                  <div className="mt-4 flex items-center gap-4">
                    {stats.mostRequested.mainImage && (
                      <img 
                        src={stats.mostRequested.mainImage} 
                        alt={stats.mostRequested.name} 
                        className="w-16 h-16 object-cover rounded-lg border border-gray-100"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 line-clamp-2">{stats.mostRequested.name}</p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">{stats.mostRequested.category}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 mt-4 text-sm">Aún no tienes un dispositivo favorito.</p>
                )}
              </div>
            </div>

            {/* Right Column: Reservations */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Active Reservations */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-50 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-primary" size={18} />
                    <h2 className="font-semibold text-gray-900">Reservas Activas</h2>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {activeReservations.length} {activeReservations.length === 1 ? 'reserva' : 'reservas'}
                  </Badge>
                </div>
                
                <div className="p-0">
                  {activeReservations.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {activeReservations.map(res => {
                        const product = getProduct(res.productId);
                        return (
                          <div key={res.id} className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center hover:bg-gray-50/50 transition-colors">
                            {product?.mainImage && (
                              <img 
                                src={product.mainImage} 
                                alt={product.name} 
                                className="w-20 h-20 object-cover rounded-xl border border-gray-100 shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{product?.name || 'Cargando...'}</h3>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1.5">
                                  <Calendar size={14} className="text-gray-400" />
                                  {format(new Date(res.startAt), "d 'de' MMMM", { locale: es })}
                                </span>
                                <span className="flex items-center gap-1.5 whitespace-nowrap">
                                  <Activity size={14} className="text-gray-400" />
                                  {format(new Date(res.startAt), "HH:mm")} - {format(new Date(res.endAt), "HH:mm")}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => setCancelId(res.id)}
                              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <XCircle size={16} />
                              Cancelar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-12 text-center flex flex-col items-center">
                      <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <AlertCircle className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">No tienes reservas activas.</p>
                      <Link 
                        to="/catalogo" 
                        className="mt-4 text-sm text-primary font-medium hover:underline"
                      >
                        Ir al catálogo para reservar
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              {/* Past Reservations */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-50 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
                  <History className="text-gray-500" size={18} />
                  <h2 className="font-semibold text-gray-900">Historial Reciente</h2>
                </div>
                
                <div className="p-0">
                  {pastReservations.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {pastReservations.slice(0, 5).map(res => {
                        const product = getProduct(res.productId);
                        const isCancelled = res.status === 'cancelled';
                        
                        return (
                          <div key={res.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                            <div className="min-w-0 pr-4">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {product?.name || 'Dispositivo'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {format(new Date(res.startAt), "d MMM yyyy", { locale: es })}
                              </p>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "border-0 px-2 py-1 text-[10px] sm:text-xs",
                                isCancelled ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                              )}
                            >
                              {isCancelled ? 'Cancelada' : 'Completada'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-sm text-gray-500">Aún no hay historial disponible.</p>
                    </div>
                  )}
                </div>
              </section>

            </div>
          </div>
        )}
      </main>

      <Footer />

      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Liberarás este dispositivo para que otro estudiante pueda reservarlo en tu horario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Volver</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleCancelReservation();
              }}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCancelling ? 'Cancelando...' : 'Sí, cancelar reserva'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Simple utility for cn merging to avoid missing imports in this single file or relying on global lib/utils
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default UserDashboard;
