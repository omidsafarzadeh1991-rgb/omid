import { z } from "zod";
import { appointmentTimeSlots } from "@/lib/config";
import { toEnglishDigits } from "@/lib/utils";

/** Iranian mobile numbers: 09xxxxxxxxx (11 digits, normalized to ASCII digits). */
const IRAN_MOBILE_REGEX = /^09\d{9}$/;

/**
 * "Today" is evaluated in the lab's local timezone rather than the server's,
 * since a server can run in UTC while the business operates in Iran.
 */
function todayInTehran(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(
    new Date(),
  );
}

/** ISO `yyyy-mm-dd` strings compare correctly with plain string comparison. */
function isTodayOrFuture(isoDate: string): boolean {
  return isoDate >= todayInTehran();
}

export const appointmentFormSchema = z.object({
  fullName: z
    .string({ error: "نام و نام خانوادگی الزامی است" })
    .trim()
    .min(3, "نام و نام خانوادگی باید حداقل ۳ حرف باشد")
    .max(80, "نام و نام خانوادگی بیش از حد طولانی است"),
  phone: z
    .string({ error: "شماره موبایل الزامی است" })
    .trim()
    .transform(toEnglishDigits)
    .refine((value) => IRAN_MOBILE_REGEX.test(value), {
      message: "شماره موبایل معتبر نیست، مثال: 09123456789",
    }),
  serviceId: z
    .string({ error: "انتخاب خدمت الزامی است" })
    .min(1, "انتخاب خدمت الزامی است"),
  date: z
    .string({ error: "تاریخ الزامی است" })
    .min(1, "تاریخ الزامی است")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "تاریخ معتبر نیست",
    })
    .refine(isTodayOrFuture, {
      message: "امکان رزرو برای تاریخ گذشته وجود ندارد",
    }),
  time: z
    .string({ error: "ساعت مراجعه الزامی است" })
    .refine(
      (value) => (appointmentTimeSlots as readonly string[]).includes(value),
      { message: "ساعت انتخاب‌شده معتبر نیست" },
    ),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

/** Narrow, human-readable formatting for Zod field errors returned to the client. */
export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
