export default function CatalogCheckboxGroup({
  name,
  items,
  defaultSelectedIds = [],
  emptyMessage,
}: {
  name: string;
  items: { id: string; label: string }[];
  defaultSelectedIds?: string[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-slate-500">{emptyMessage}</p>;
  }

  const selected = new Set(defaultSelectedIds);

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <label
          key={item.id}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 has-checked:border-teal-300 has-checked:bg-teal-50 has-checked:text-teal-800"
        >
          <input
            type="checkbox"
            name={name}
            value={item.id}
            defaultChecked={selected.has(item.id)}
            className="accent-teal-600"
          />
          {item.label}
        </label>
      ))}
    </div>
  );
}
