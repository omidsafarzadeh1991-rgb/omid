# آزمایشگاه تخصصی ترنج — وب‌سایت

وب‌سایت رسمی (نمونه) آزمایشگاه تخصصی ترنج: معرفی آزمایشگاه، نمایش و جست‌وجوی
خدمات تشخیصی، و ثبت درخواست رزرو نوبت نمونه‌گیری.

> تمام نام‌ها، قیمت‌ها، بیوگرافی متخصصان و نظرات مراجعان در این پروژه **داده
> نمونه** هستند و نباید به‌عنوان اطلاعات واقعی یا تأییدشده تلقی شوند.

## پشته فنی

- **Next.js 15** (App Router, Turbopack) + TypeScript
- **Tailwind CSS v4** + کامپوننت‌های دستی هم‌سو با shadcn/ui (بر پایه Radix UI)
- **Prisma ORM** + **PostgreSQL**
- **Zod** برای اعتبارسنجی سمت کلاینت و سرور
- **React Hook Form** برای فرم رزرو نوبت
- **Framer Motion** برای انیمیشن‌های بسیار ملایم
- **lucide-react** برای آیکن‌ها

## راه‌اندازی محلی

```bash
npm install
cp .env.example .env   # مقدار DATABASE_URL را با یک PostgreSQL واقعی پر کنید
npx prisma db push     # ساخت جداول از روی schema.prisma
npm run db:seed        # درج داده‌های نمونه (۵ متخصص، ۸ خدمت)
npm run dev
```

سایت روی `http://localhost:3000` بالا می‌آید.

### اسکریپت‌های مهم

| اسکریپت           | کاربرد                                   |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | اجرای محیط توسعه (Turbopack)              |
| `npm run build`   | ساخت نسخه production                      |
| `npm run start`   | اجرای نسخه production ساخته‌شده           |
| `npm run lint`    | بررسی ESLint                              |
| `npm run db:seed` | پر کردن دیتابیس با داده‌های نمونه         |
| `npm run db:push` | همگام‌سازی schema با دیتابیس (بدون migration) |
| `npm run db:studio` | باز کردن Prisma Studio                  |

> **نکته Build:** این پروژه با فلگ `--turbopack` روی build/dev تنظیم شده،
> چون یک باگ شناخته‌شده در builder وبپک نسخه‌ی نصب‌شده‌ی Next.js 15.5.23
> باعث خطای `InvariantError: Expected clientReferenceManifest to be defined`
> در prerender صفحاتی می‌شد که کامپوننت کلاینت دارند. Turbopack این مشکل را ندارد.

## معماری

```
app/(public)/…   صفحات عمومی سایت (خانه، خدمات، درباره، تیم، رزرو، تماس)
app/api/…        Route Handlerها (فعلاً فقط POST /api/appointment)
components/      layout · home · shared · appointment · ui
lib/             config · validations · prisma · utils · rate-limit · data/*
prisma/          schema.prisma · seed.ts
```

`lib/data/*` تنها لایه‌ای است که مستقیماً با Prisma صحبت می‌کند؛ کامپوننت‌های
UI همیشه داده را به‌صورت prop دریافت می‌کنند و خودشان fetch نمی‌کنند.

## محدودیت شناخته‌شده: Rate Limiting

`lib/rate-limit.ts` یک rate limiter درون‌حافظه‌ای (in-memory) است که روی یک
اینستنس Node.js به‌خوبی کار می‌کند اما در استقرارهای چند-اینستنسی/serverless
تضمین سراسری نمی‌دهد. این پیاده‌سازی صادقانه به همین شکل مستند شده و رابط
`RateLimiter` طوری طراحی شده که جایگزینی با Redis/Upstash در آینده بدون تغییر
در API route ممکن باشد.

## پیش از استقرار واقعی

- `contactInfo` و `siteConfig` در `lib/config.ts` را با اطلاعات واقعی جایگزین کنید.
- تصاویر placeholder در `public/images/` (هیرو و آواتار متخصصان) را با تصاویر
  واقعی جایگزین کنید — ساختار کد نیازی به تغییر ندارد.
- برای rate limiting سراسری، یک backend واقعی (مثل Upstash Redis) پیاده‌سازی کنید.
