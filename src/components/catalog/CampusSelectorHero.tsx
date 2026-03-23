import { Campus } from "@/components/catalog/CampusDropdown";

type CampusSelectorHeroProps = {
  campus: Campus;
  onCampusChange: (campus: Campus) => void;
  options: Campus[];
};

const CAMPUS_IMAGE_MAP: Record<"monterrico" | "san_miguel", string> = {
  monterrico: "/Campus.png",
  san_miguel: "/campus-san-miguel.webp",
};

const getCampusImage = (campus: Campus) => {
  if (campus === "San Miguel") return CAMPUS_IMAGE_MAP.san_miguel;
  return CAMPUS_IMAGE_MAP.monterrico;
};

const CampusSelectorHero = ({ campus, onCampusChange, options }: CampusSelectorHeroProps) => {
  return (
    <section className="grid h-[150px] grid-cols-1 overflow-hidden rounded-2xl border border-border/70 shadow-sm sm:h-[160px] sm:grid-cols-2">
      {options.map((optionCampus) => {
        const isSelected = optionCampus === campus;
        return (
          <button
            key={optionCampus}
            type="button"
            onClick={() => onCampusChange(optionCampus)}
            aria-pressed={isSelected}
            className={`group relative overflow-hidden text-left transition-all duration-300 ease-out focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              isSelected ? "scale-[1.01]" : "scale-100"
            }`}
          >
            <img
              src={getCampusImage(optionCampus)}
              alt={`Sede ${optionCampus}`}
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              loading="lazy"
            />
            <div
              className={`absolute inset-0 transition-colors duration-300 ${
                isSelected ? "bg-black/45" : "bg-black/58 group-hover:bg-black/48"
              }`}
            />
            {isSelected && <div className="absolute inset-0 ring-2 ring-primary/80 ring-inset" />}
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-lg font-semibold tracking-tight text-white">{optionCampus}</p>
              <p className="text-xs text-white/90">Disponibilidad en tiempo real</p>
            </div>
          </button>
        );
      })}
    </section>
  );
};

export default CampusSelectorHero;
