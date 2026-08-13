/**
 * Development/demo seed data.
 *
 * Every name, bio, price and testimonial below is fictional sample content
 * created for this project — none of it describes a real person, a real
 * price list, or a verified medical claim (spec §6, §29).
 */
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const doctors: Prisma.DoctorCreateInput[] = [
  {
    name: "دکتر سارا احمدی",
    specialty: "متخصص علوم آزمایشگاهی",
    image: "/images/team/doctor-1.svg",
    bio: "بیش از یک دهه فعالیت در حوزه تشخیص آزمایشگاهی و مدیریت کنترل کیفیت.",
  },
  {
    name: "دکتر مهدی رضایی",
    specialty: "متخصص پاتولوژی بالینی",
    image: "/images/team/doctor-2.svg",
    bio: "علاقه‌مند به بهبود فرآیندهای گزارش‌دهی و دقت در تفسیر نمونه‌ها.",
  },
  {
    name: "دکتر نگار حسینی",
    specialty: "کارشناس ارشد بیوشیمی بالینی",
    image: "/images/team/doctor-3.svg",
    bio: "مسئول فنی بخش بیوشیمی با تمرکز بر استانداردسازی آزمایش‌ها.",
  },
  {
    name: "دکتر آرش کریمی",
    specialty: "متخصص میکروب‌شناسی",
    image: "/images/team/doctor-4.svg",
    bio: "فعالیت در زمینه کشت و تشخیص عفونت‌های میکروبی و کنترل عفونت.",
  },
  {
    name: "دکتر لیلا صادقی",
    specialty: "کارشناس ایمونولوژی و هورمون‌شناسی",
    image: "/images/team/doctor-5.svg",
    bio: "همراهی مراجعان در بخش نمونه‌گیری با رویکردی آرام و دقیق.",
  },
];

const services: Prisma.ServiceCreateInput[] = [
  {
    title: "آزمایش شمارش کامل خون (CBC)",
    slug: "cbc",
    description: "بررسی سلول‌های خونی شامل گلبول قرمز، گلبول سفید و پلاکت.",
    category: "خون‌شناسی",
    resultTime: "همان روز",
    price: 180_000,
  },
  {
    title: "آزمایش قند خون ناشتا (FBS)",
    slug: "fbs",
    description: "اندازه‌گیری میزان گلوکز خون پس از حداقل ۸ ساعت ناشتایی.",
    category: "بیوشیمی",
    resultTime: "همان روز",
    price: 90_000,
  },
  {
    title: "پروفایل چربی خون (لیپید پروفایل)",
    slug: "lipid-profile",
    description: "شامل کلسترول تام، LDL، HDL و تری‌گلیسیرید.",
    category: "بیوشیمی",
    resultTime: "همان روز",
    price: 260_000,
  },
  {
    title: "آزمایش عملکرد تیروئید (TSH, T3, T4)",
    slug: "thyroid-panel",
    description: "بررسی هورمون‌های تیروئیدی برای ارزیابی عملکرد غده تیروئید.",
    category: "هورمون‌شناسی",
    resultTime: "۲۴ ساعت",
    price: 420_000,
  },
  {
    title: "آزمایش کامل ادرار (U/A)",
    slug: "urine-analysis",
    description: "بررسی فیزیکی، شیمیایی و میکروسکوپی نمونه ادرار.",
    category: "آزمایش ادرار",
    resultTime: "همان روز",
    price: 120_000,
  },
  {
    title: "کشت ادرار و آنتی‌بیوگرام",
    slug: "urine-culture",
    description: "بررسی عفونت ادراری و تعیین حساسیت آنتی‌بیوتیکی.",
    category: "میکروب‌شناسی",
    resultTime: "۴۸ تا ۷۲ ساعت",
    price: 310_000,
  },
  {
    title: "آزمایش ویتامین D",
    slug: "vitamin-d",
    description: "سنجش سطح ویتامین D جهت ارزیابی وضعیت تغذیه‌ای.",
    category: "بیوشیمی",
    resultTime: "۲۴ تا ۴۸ ساعت",
    price: null,
  },
  {
    title: "چک‌آپ پایه سلامت",
    slug: "basic-checkup-panel",
    description: "پکیج مقدماتی شامل چند آزمایش پرکاربرد برای بررسی وضعیت عمومی سلامت.",
    category: "چک‌آپ",
    resultTime: "۲۴ ساعت",
    price: 650_000,
  },
];

async function main() {
  console.log("در حال پاک‌سازی داده‌های قبلی...");
  // Appointments reference services, so they must be cleared first.
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.doctor.deleteMany();

  console.log("در حال درج متخصصان نمونه...");
  for (const doctor of doctors) {
    await prisma.doctor.create({ data: doctor });
  }

  console.log("در حال درج خدمات نمونه...");
  for (const service of services) {
    await prisma.service.create({ data: service });
  }

  console.log(`تمام شد: ${doctors.length} متخصص و ${services.length} خدمت درج شد.`);
}

main()
  .catch((error) => {
    console.error("خطا در اجرای seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
