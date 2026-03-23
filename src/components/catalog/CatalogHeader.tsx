import CatalogFilterBar from "@/components/catalog/CatalogFilterBar";
import CategoryChips from "@/components/catalog/CategoryChips";
import CampusSelectorHero from "@/components/catalog/CampusSelectorHero";
import { Campus } from "@/components/catalog/CampusDropdown";

type CatalogHeaderProps = {
  title: string;
  subtitle: string;
  search: string;
  onSearchChange: (value: string) => void;
  selectedCampus: Campus;
  onCampusChange: (campus: Campus) => void;
  campusOptions: Campus[];
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

      <CampusSelectorHero
        campus={selectedCampus}
        onCampusChange={onCampusChange}
        options={campusOptions}
      />

      <CatalogFilterBar
        search={search}
        onSearchChange={onSearchChange}
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
