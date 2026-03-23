import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Campus = "Monterrico" | "San Miguel";

type CampusPreviewMap = Record<Campus, { image: string; objectPosition: string }>;

type CampusDropdownProps = {
  value: Campus;
  onChange: (campus: Campus) => void;
  options: Campus[];
  preview: CampusPreviewMap;
};

const CampusDropdown = ({ value, onChange, options, preview }: CampusDropdownProps) => {
  const selected = preview[value];

  return (
    <div className="min-w-[220px] flex-1 sm:flex-none sm:min-w-[240px]">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">Sede</label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as Campus)}>
        <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background/80 shadow-sm transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-ring/60">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={selected.image}
              alt={`Sede ${value}`}
              className="h-6 w-6 rounded object-cover"
              style={{ objectPosition: selected.objectPosition }}
            />
            <SelectValue placeholder="Selecciona sede" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/80 shadow-lg">
          <div className="border-b border-border p-2">
            <div className="relative h-20 overflow-hidden rounded-md bg-muted">
              <img
                src={selected.image}
                alt={`Vista previa de ${value}`}
                className="h-full w-full object-cover"
                style={{ objectPosition: selected.objectPosition }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Sede seleccionada</p>
            <p className="text-sm font-semibold text-foreground">{value}</p>
          </div>
          {options.map((campus) => (
            <SelectItem key={campus} value={campus} className="py-2">
              {campus}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CampusDropdown;
