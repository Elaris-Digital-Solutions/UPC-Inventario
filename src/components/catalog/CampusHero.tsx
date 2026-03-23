type CampusHeroProps = {
  campus: string;
};

const CAMPUS_HERO_MAP: Record<string, { name: string; image: string }> = {
  monterrico: {
    name: "Monterrico",
    image: "/Campus.png",
  },
  san_miguel: {
    name: "San Miguel",
    image: "/campus-san-miguel.webp",
  },
};

const normalizeCampusKey = (campus: string) => {
  const normalized = campus
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  if (normalized.includes("san") && normalized.includes("miguel")) return "san_miguel";
  return "monterrico";
};

const CampusHero = ({ campus }: CampusHeroProps) => {
  const campusKey = normalizeCampusKey(campus);
  const campusData = CAMPUS_HERO_MAP[campusKey] || CAMPUS_HERO_MAP.monterrico;

  return (
    <section className="relative h-36 w-full overflow-hidden rounded-2xl border border-border/70 shadow-sm sm:h-40">
      <img
        src={campusData.image}
        alt={`Sede ${campusData.name}`}
        className="h-full w-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-black/10" />
      <div className="absolute inset-0 flex items-end p-4 sm:p-5">
        <div>
          <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">Sede {campusData.name}</p>
          <p className="text-xs text-white/90 sm:text-sm">Disponibilidad en tiempo real</p>
        </div>
      </div>
    </section>
  );
};

export default CampusHero;
