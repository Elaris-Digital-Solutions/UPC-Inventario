type CategoryChipsProps = {
  categories: string[];
  activeCategory: string;
  onChange: (category: string) => void;
};

const CategoryChips = ({ categories, activeCategory, onChange }: CategoryChipsProps) => {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {categories.map((category) => {
        const isActive = activeCategory === category;
        return (
          <button
            key={category}
            onClick={() => onChange(category)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 text-secondary-foreground hover:bg-secondary"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryChips;
