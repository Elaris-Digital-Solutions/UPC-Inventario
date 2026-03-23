import CatalogFilterBar from "@/components/catalog/CatalogFilterBar";
import CategoryChips from "@/components/catalog/CategoryChips";
import CampusHero from "@/components/catalog/CampusHero";
import { Campus } from "@/components/catalog/CampusDropdown";

type CatalogHeaderProps = {
  title: string;
  subtitle: string;
  search: string;
  onSearchChange: (value: string) => void;
  selectedCampus: Campus;
  onCampusChange: (campus: Campus) => void;
  campusOptions: Campus[];
  campusPreview: Record<Campus, { image: string; objectPosition: string }>;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
};

const CatalogHeader = ({
  title,
  subtitle,
  search,
  onSearchChange,
  selectedCampus,
  onCampusChange,
  campusOptions,
  campusPreview,
  categories,
  activeCategory,
  onCategoryChange,
}: CatalogHeaderProps) => {
  return (
    <section className="mb-8 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>

      <CampusHero campus={selectedCampus} />

      <CatalogFilterBar
        search={search}
        onSearchChange={onSearchChange}
        selectedCampus={selectedCampus}
        onCampusChange={onCampusChange}
        campusOptions={campusOptions}
        campusPreview={campusPreview}
      />

      <CategoryChips
        categories={categories}
        activeCategory={activeCategory}
        onChange={onCategoryChange}
      />
    </section>
  );
};

export default CatalogHeader;
