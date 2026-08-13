/**
 * Central site configuration.
 *
 * Every brand-facing string that might change (contact info, working hours,
 * navigation labels) lives here so a real update never requires grepping
 * through the whole codebase — see spec §7.
 */

export const siteConfig = {
  name: "آزمایشگاه تخصصی ترنج",
  shortName: "ترنج",
  description:
    "آزمایشگاه تخصصی ترنج؛ نمونه‌گیری و انجام آزمایش‌های تشخیص طبی با دقت، تخصص و آرامش.",
  url: "https://avidlabsystem.ir",
  locale: "fa-IR",
  ogImage: "/images/og-cover.jpg",
} as const;

export const contactInfo = {
  phone: "021-00000000",
  mobile: "0912-0000000",
  email: "info@avidlabsystem.ir",
  address: "تهران، خیابان نمونه، پلاک ۰، طبقه اول",
  addressLine2: "آزمایشگاه تخصصی ترنج",
  mapEmbedUrl:
    "https://www.google.com/maps?q=Tehran,Iran&hl=fa&z=14&output=embed",
  workingHours: [
    { days: "شنبه تا چهارشنبه", hours: "۷:۰۰ تا ۲۰:۰۰" },
    { days: "پنجشنبه", hours: "۷:۰۰ تا ۱۴:۰۰" },
    { days: "جمعه", hours: "تعطیل (نمونه‌گیری اورژانسی با هماهنگی قبلی)" },
  ],
} as const;

export const socialLinks = {
  instagram: "https://instagram.com/",
} as const;

export const navigation = [
  { label: "خانه", href: "/" },
  { label: "خدمات", href: "/services" },
  { label: "درباره ما", href: "/about" },
  { label: "تیم تخصصی", href: "/team" },
  { label: "تماس با ما", href: "/contact" },
] as const;

export const appointmentCta = {
  label: "رزرو نوبت نمونه‌گیری",
  href: "/appointment",
} as const;

/** Bookable appointment time slots offered on the appointment form. */
export const appointmentTimeSlots = [
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
] as const;

/**
 * Short, non-alarming medical-content disclaimer shown in the footer and on
 * the appointment page — see spec §29 (Medical Content Safety).
 */
export const medicalDisclaimer =
  "محتوای این وب‌سایت صرفاً جنبه معرفی خدمات آزمایشگاهی دارد و جایگزین مشاوره، تشخیص یا نظر پزشک نیست. تفسیر نتایج آزمایش را به پزشک معالج خود بسپارید.";
