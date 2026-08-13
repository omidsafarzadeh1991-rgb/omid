import Image from "next/image";
import type { Doctor } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";

interface DoctorCardProps {
  doctor: Pick<Doctor, "id" | "name" | "specialty" | "image" | "bio">;
}

export function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <div className="relative aspect-square w-full bg-muted">
        <Image
          src={doctor.image}
          alt={`تصویر نمونه ${doctor.name}`}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
          // Placeholder avatars are hand-authored SVGs — vector art gains
          // nothing from the raster optimizer, so skip it rather than
          // widening the security surface with images.dangerouslyAllowSVG.
          unoptimized
        />
      </div>
      <CardContent className="p-5">
        <h3 className="text-base font-semibold text-foreground">
          {doctor.name}
        </h3>
        <p className="mt-1 text-sm font-medium text-primary">
          {doctor.specialty}
        </p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {doctor.bio}
        </p>
      </CardContent>
    </Card>
  );
}
