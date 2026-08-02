@echo off
cd /d %~dp0

if not exist ".next" (
  echo آماده‌سازی اولیه برنامه، چند دقیقه طول می‌کشد، لطفاً صبر کنید...
  call npm run build
  if errorlevel 1 (
    echo.
    echo مشکلی پیش آمد. متن بالا را برای بررسی نگه دارید.
    pause
    exit /b 1
  )
)

echo در حال اجرای برنامه...
echo وقتی نوشت "Ready"، این آدرس را در مرورگر باز کنید: http://localhost:3000
call npm start
pause
