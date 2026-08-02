@echo off
cd /d %~dp0

echo دریافت آخرین تغییرات از گیت‌هاب...
call git pull

echo نصب وابستگی‌های جدید (در صورت وجود)...
call npm install

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
