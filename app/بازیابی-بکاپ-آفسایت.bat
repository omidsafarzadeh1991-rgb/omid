@echo off
cd /d %~dp0

echo این ابزار آخرین بک‌آپ آفسایت را دانلود و رمزگشایی می‌کند.
echo قبل از جایگزین‌کردن فایل دیتابیس، حتماً برنامه و سرویس ویندوزی‌اش را متوقف کنید.
echo.

call node scripts\restore-offsite-backup.js
if errorlevel 1 (
  echo.
  echo مشکلی پیش آمد. متن قرمز بالا را برای بررسی نگه دارید.
)

pause
