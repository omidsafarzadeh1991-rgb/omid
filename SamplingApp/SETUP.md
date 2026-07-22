# راه‌اندازی پروژه نمونه‌گیری در محل

این پروژه یک اپلیکیشن اندروید (Kotlin + Jetpack Compose) با دو نقش است:
- **مریض (Patient)**: ثبت درخواست نمونه‌گیری همراه با آدرس روی نقشه
- **تأییدکننده (Admin)**: مشاهده و تأیید/رد درخواست‌ها به‌صورت لحظه‌ای

چون این دو نقش روی دو گوشی جدا اجرا می‌شوند، داده‌ها از طریق **Firebase Firestore**
همگام‌سازی می‌شوند و نقشه/آدرس از **نشان (Neshan)** می‌آید.

کد کامل نوشته شده، اما چون این محیط اجرای من دسترسی به Android SDK، شبکه‌ی کامل
برای دانلود پلاگین‌های Gradle، یا حساب‌های Firebase/Neshan شما را ندارد، امکان
build واقعی و تست روی دستگاه از همین‌جا وجود نداشت. مراحل زیر را در Android
Studio روی سیستم خودتان انجام دهید تا پروژه اجرا شود.

## ۱. باز کردن پروژه
پوشه‌ی `SamplingApp` را با Android Studio (نسخه Iguana یا جدیدتر) باز کنید.
Android Studio به‌صورت خودکار Gradle sync را اجرا می‌کند.

## ۲. ساخت پروژه Firebase
1. به [console.firebase.google.com](https://console.firebase.google.com) بروید و یک پروژه جدید بسازید.
2. یک اپ اندرویدی با `applicationId = ir.omid.samplingapp` اضافه کنید.
3. فایل `google-services.json` را دانلود کرده و داخل پوشه‌ی `SamplingApp/app/` قرار دهید.
   **بدون این فایل، build با خطا مواجه می‌شود.**
4. در بخش **Authentication → Sign-in method**، روش **Phone** را فعال کنید.
5. در بخش **Firestore Database**، یک دیتابیس بسازید (Production mode).
6. محتوای فایل `firestore.rules` (کنار همین فایل) را در تب **Rules** کنسول Firestore paste و Publish کنید.

## ۳. گرفتن کلید نشان (Neshan)
1. در [platform.neshan.org](https://platform.neshan.org) ثبت‌نام کنید و یک پروژه بسازید (پلن رایگان کافی است).
2. کلید API را کپی کنید.
3. در فایل زیر مقدار `NESHAN_API_KEY` را جایگزین کنید:
   `app/src/main/java/ir/omid/samplingapp/util/Constants.kt`

## ۴. ساختن اولین کاربر ادمین (تأییدکننده)
نقش‌ها در Firestore ذخیره می‌شوند و کاربر جدید همیشه با نقش `PATIENT` ساخته می‌شود.
برای اینکه خودتان به‌عنوان تأییدکننده وارد شوید:
1. یک بار با شماره موبایل خودتان وارد اپ شوید (نقش پیش‌فرض PATIENT ساخته می‌شود).
2. در کنسول Firebase → Firestore → مجموعه `users` → سند مربوط به uid خودتان را باز کنید.
3. مقدار فیلد `role` را از `PATIENT` به `ADMIN` تغییر دهید.
4. اپ را ببندید و دوباره باز کنید — حالا صفحه‌ی تأییدکننده را می‌بینید.

## ۵. اجرا
دستگاه/شبیه‌ساز را وصل کنید و Run را بزنید. برای گرفتن SMS واقعی OTP باید از یک
دستگاه واقعی (یا شبیه‌سازی با Google Play Services و شماره تست Firebase) استفاده
کنید؛ در بخش **Authentication → Sign-in method → Phone → Phone numbers for testing**
می‌توانید یک شماره و کد ثابت برای تست بدون پیامک واقعی تعریف کنید.

## نکات فنی
- کلاس‌های `MapView`/`moveCamera`/`setOnMapClickListener` در
  `ui/map/NeshanMapHost.kt` مطابق SDK نسخه‌ی ۱.۰.x نشان نوشته شده‌اند. اگر Gradle
  نسخه‌ی متفاوتی resolve کرد و نام متدها فرق داشت، همین یک فایل را با
  autocomplete اندروید استودیو اصلاح کنید — بقیه‌ی اپ به این فایل وابسته نیست.
- برای production، منطقی است SMS OTP را به‌جای Firebase Phone Auth از یک سرویس
  پیامکی ایرانی (مثل کاوه‌نگار) بگیرید، چون شماره‌های ایرانی گاهی با Firebase
  محدودیت دارند؛ این تغییر فقط در `AuthRepository.kt` لازم است.
