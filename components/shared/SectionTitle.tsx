import { cn } from "@/lib/utils";

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  className?: string;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <span className="text-sm font-medium text-primary">{eyebrow}</span>
      )}
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base leading-8 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
