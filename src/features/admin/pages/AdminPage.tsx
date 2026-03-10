/**
 * AdminPage — orquestador del panel de administración.
 *
 * Responsabilidades de este componente:
 *  - Verificar autenticación y mostrar guard de login
 *  - Renderizar la navegación de tabs
 *  - Delegar cada tab a su componente especializado
 *
 * NO contiene lógica de negocio ni queries a Supabase.
 */
import { useState } from 'react';
import Header from '@/components/Header';
import SEO from '@/components/SEO';
import AdminLogin from '@/components/AdminLogin';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BarChart3, Boxes, ClipboardCheck, ClipboardList, ImageIcon, LogOut, PackagePlus } from 'lucide-react';
import ReservationsPanel from '@/components/admin/ReservationsPanel';
import ReservationStatsPanel from '@/components/admin/ReservationStatsPanel';
import VerificationPanel from '@/components/admin/VerificationPanel';
import { RegisterProductTab } from '@/features/admin/components/tabs/RegisterProductTab';
import { ManageProductTab } from '@/features/admin/components/tabs/ManageProductTab';
import { ImageEditorTab } from '@/features/admin/components/tabs/ImageEditorTab';

type AdminTab = 'register' | 'manage' | 'images' | 'reservations' | 'verification' | 'stats';

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'register', label: 'Registrar Equipo', icon: <PackagePlus className="h-4 w-4" /> },
  { id: 'manage', label: 'Administrar', icon: <Boxes className="h-4 w-4" /> },
  { id: 'images', label: 'Imágenes', icon: <ImageIcon className="h-4 w-4" /> },
  { id: 'reservations', label: 'Reservas', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'verification', label: 'Verificación', icon: <ClipboardCheck className="h-4 w-4" /> },
  { id: 'stats', label: 'Estadísticas', icon: <BarChart3 className="h-4 w-4" /> },
];

const AdminPage = () => {
  const { isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('register');

  if (!isAuthenticated) {
    return (
      <>
        <SEO title="Administración — UPC Inventario" />
        <Header />
        <AdminLogin onLogin={() => {}} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Panel Admin — UPC Inventario" />
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Barra de navegación de tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <nav className="flex flex-wrap gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>

        {/* Contenido del tab activo */}
        <div className="mt-6">
          {activeTab === 'register' && <RegisterProductTab />}
          {activeTab === 'manage' && <ManageProductTab />}
          {activeTab === 'images' && <ImageEditorTab />}
          {activeTab === 'reservations' && <ReservationsPanel />}
          {activeTab === 'verification' && <VerificationPanel />}
          {activeTab === 'stats' && <ReservationStatsPanel />}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
