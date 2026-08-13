import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import type { Service } from "@prisma/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon } from "@/lib/service-icons";
import { formatPrice, cn } from "@/lib/utils";

interface ServiceCardProps {
  service: Pick<
    Service,
    "id" | "title" | "description" | "category" | "resultTime" | "price"
  >;
  /** Show a link into the appointment form pre-selecting this service. */
  showBookingLink?: boolean;
  className?: string;
}

export function ServiceCard({
  service,
  showBookingLink = false,
  className,
}: ServiceCardProps) {
  const Icon = getCategoryIcon(service.category);

  return (
    <Card
      className={cn(
        "group flex h-full flex-col transition-shadow duration-200 hover:shadow-md",
        className,
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <Badge variant="secondary">{service.category}</Badge>
        </div>
        <h3 className="pt-3 text-base font-semibold text-foreground">
          {service.title}
        </h3>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <p className="flex-1 text-sm leading-7 text-muted-foreground">
          {service.description}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-4" aria-hidden="true" />
            {service.resultTime}
          </span>
          <span className="font-semibold text-foreground">
            {formatPrice(service.price)}
          </span>
        </div>
        {showBookingLink && (
          <Link
            href={`/appointment?service=${service.id}`}
            className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary transition-colors group-hover:gap-2.5"
          >
            رزرو این آزمایش
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
