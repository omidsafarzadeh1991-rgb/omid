import {
  Droplet,
  FlaskConical,
  Activity,
  Microscope,
  ShieldPlus,
  Dna,
  TestTube,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * Services are free-text categorized (no icon field in the DB — spec §5
 * keeps the schema minimal). This maps known category labels to a fitting
 * icon and falls back to a neutral flask icon for anything new.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "خون‌شناسی": Droplet,
  "بیوشیمی": Activity,
  "هورمون‌شناسی": FlaskConical,
  "آزمایش ادرار": TestTube,
  "میکروب‌شناسی": Microscope,
  "ایمونولوژی": ShieldPlus,
  "ژنتیک": Dna,
  "چک‌آپ": ClipboardCheck,
};

export function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? FlaskConical;
}
