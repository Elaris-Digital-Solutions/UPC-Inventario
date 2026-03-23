import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type CatalogFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

const CatalogFilterBar = ({
  search,
  onSearchChange,
}: CatalogFilterBarProps) => {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Buscar equipo</label>
          <Search className="pointer-events-none absolute left-3 top-[37px] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nombre o descripción"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 rounded-xl border-border/80 bg-background/80 pl-10 shadow-sm focus-visible:ring-2 focus-visible:ring-ring/60"
          />
        </div>
      </div>
    </div>
  );
};

export default CatalogFilterBar;
