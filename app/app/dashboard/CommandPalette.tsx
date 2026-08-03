"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchAction, type SearchResultGroup, type SearchResultItem } from "@/app/actions/search";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const visibleGroups = query.trim() ? groups : [];
  const flatItems: SearchResultItem[] = visibleGroups.flatMap((g) => g.items);
  const indexById = new Map(flatItems.map((item, i) => [item.id, i]));

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setGroups([]);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(async () => {
      const result = await searchAction(query);
      setGroups(result);
      setActiveIndex(0);
    }, 150);
    return () => clearTimeout(timeout);
  }, [query]);

  function goTo(item: SearchResultItem) {
    close();
    router.push(item.href);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) goTo(item);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="flex-1 text-right">جست‌وجو...</span>
        <span className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[11px] font-semibold">
          Ctrl K
        </span>
      </button>

      {open && (
        <div className="cmdk-overlay" onClick={close} role="presentation">
          <div
            className="cmdk-panel"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="جست‌وجوی سریع"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b hairline px-4 py-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted-ink)" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="جست‌وجوی پزشک، بیمار، یا صفحه..."
                className="flex-1 border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <span className="kbd">Esc</span>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {!query.trim() && (
                <p className="px-3 py-6 text-center text-sm text-slate-400">
                  برای جست‌وجو در پزشکان، نوبت‌های پیش رو و صفحات پنل تایپ کنید.
                </p>
              )}
              {query.trim() && visibleGroups.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-slate-400">چیزی پیدا نشد.</p>
              )}
              {visibleGroups.map((group) => (
                <div key={group.label} className="mb-2">
                  <p className="eyebrow px-3 py-1.5">{group.label}</p>
                  {group.items.map((item) => {
                    const isActive = indexById.get(item.id) === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(indexById.get(item.id) ?? 0)}
                        onClick={() => goTo(item)}
                        className={`flex w-full flex-col items-start rounded-lg px-3 py-2 text-right transition-colors ${
                          isActive ? "bg-slate-100" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-800">{item.title}</span>
                        {item.subtitle && (
                          <span className="text-xs text-slate-400">{item.subtitle}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 border-t hairline px-4 py-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="kbd">↑</span>
                <span className="kbd">↓</span> گشتن
              </span>
              <span className="flex items-center gap-1">
                <span className="kbd">Enter</span> رفتن
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
