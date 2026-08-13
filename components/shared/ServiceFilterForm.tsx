import { Search } from "lucide-react";

interface ServiceFilterFormProps {
  categories: string[];
  defaultQuery?: string;
  defaultCategory?: string;
}

/**
 * A plain GET form — filtering works without any client-side JavaScript
 * (progressive enhancement, minimal hydration cost per spec §25).
 */
export function ServiceFilterForm({
  categories,
  defaultQuery = "",
  defaultCategory = "",
}: ServiceFilterFormProps) {
  return (
    <form
      method="get"
      role="search"
      aria-label="جست‌وجوی خدمات"
      className="flex flex-col gap-3 sm:flex-row"
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <label htmlFor="service-search" className="sr-only">
          جست‌وجوی خدمات
        </label>
        <input
          id="service-search"
          type="search"
          name="q"
          defaultValue={defaultQuery}
          placeholder="جست‌وجوی نام آزمایش..."
          className="h-11 w-full rounded-md border border-input bg-background py-2 pr-10 pl-3.5 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <label htmlFor="service-category" className="sr-only">
        دسته‌بندی
      </label>
      <select
        id="service-category"
        name="category"
        defaultValue={defaultCategory}
        className="h-11 rounded-md border border-input bg-background px-3.5 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
      >
        <option value="">همه دسته‌بندی‌ها</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="h-11 shrink-0 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        جست‌وجو
      </button>
    </form>
  );
}
