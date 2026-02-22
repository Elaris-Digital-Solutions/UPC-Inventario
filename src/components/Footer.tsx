import upcLogo from "@/assets/upc-logo.png";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <img src={upcLogo} alt="UPC" className="h-8 w-auto opacity-70" />
          <p className="text-sm text-muted-foreground">
            Universidad Peruana de Ciencias Aplicadas
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Reserva UPC — Sistema de Préstamos de Equipos
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
