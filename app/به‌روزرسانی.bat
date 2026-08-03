@echo off
cd /d %~dp0

echo دریافت آخرین تغییرات از گیت‌هاب...
rem package-lock.json را هر بار npm install روی همین کامپیوتر کمی تغییر
rem می‌دهد (به‌خاطر تفاوت ویندوز/لینوکس)؛ این فایل را همیشه قبل از
rem git pull به حالت آخرین نسخهٔ ذخیره‌شده برمی‌گردانیم تا این تغییرات
rem محلی و بی‌اهمیت مانع دریافت آپدیت واقعی نشوند.
call git checkout -- package-lock.json 2>nul
call git pull
if errorlevel 1 (
  echo.
  echo نتوانستیم آخرین تغییرات را از گیت‌هاب بگیریم؛ برنامه با کد قدیمی
  echo دوباره ساخته نمی‌شود تا اشتباهی چیزی خراب نشود. متن قرمز بالا را
  echo برای علت دقیق بخوانید و بفرستید تا بررسی شود.
  pause
  exit /b 1
)

echo نصب وابستگی‌های جدید (در صورت وجود)...
call npm install

echo به‌روزرسانی دیتابیس (در صورت نیاز)...
call npx prisma migrate deploy
if errorlevel 1 (
  echo.
  echo مشکلی در آماده‌سازی دیتابیس پیش آمد. متن بالا را برای بررسی نگه دارید.
  pause
  exit /b 1
)

echo ساخت نسخهٔ بهینه‌شدهٔ جدید برنامه...
call npm run build
if errorlevel 1 (
  echo.
  echo مشکلی پیش آمد. متن بالا را برای بررسی نگه دارید.
  pause
  exit /b 1
)

echo به‌روزرسانی با موفقیت انجام شد. حالا می‌توانید اجرای-برنامه.bat را اجرا کنید.
pause
