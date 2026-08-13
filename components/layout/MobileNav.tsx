"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "@/components/ui/sheet";
import { navigation, appointmentCta, siteConfig } from "@/lib/config";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="باز کردن منو"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" title={`منوی ${siteConfig.shortName}`}>
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="mb-4 flex items-center gap-2"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FlaskConical className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold">{siteConfig.name}</span>
        </Link>

        <nav aria-label="ناوبری موبایل">
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <SheetClose asChild>
                  <Link
                    href={item.href}
                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto pt-4">
          <SheetClose asChild>
            <Button asChild className="w-full">
              <Link href={appointmentCta.href}>{appointmentCta.label}</Link>
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
