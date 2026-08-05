@echo off
cd /d %~dp0

echo این ابزار فقط برای زمانی است که مالک سامانه رمز عبورش را فراموش کرده
echo و هیچ کاربر دیگری نمی‌تواند رمزش را عوض کند.
echo.

call node scripts\recover-owner.js
if errorlevel 1 (
  echo.
  echo مشکلی پیش آمد. متن قرمز بالا را برای بررسی نگه دارید.
)

pause
