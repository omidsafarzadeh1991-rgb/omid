@echo off
cd /d %~dp0

echo این اسکریپت نرم‌افزار کلینیک (و در صورت وجود، Cloudflare Tunnel) را
echo به‌عنوان سرویس ویندوزی نصب می‌کند: بعد از این، هر دو حتی بعد از
echo ری‌استارت کامپیوتر خودشان دوباره روشن می‌شوند، بدون نیاز به نگه‌داشتن
echo هیچ پنجرهٔ باز.
echo.

if not exist "nssm.exe" (
  echo فایل nssm.exe اینجا پیدا نشد.
  echo از https://nssm.cc/download دانلود کنید، nssm.exe نسخهٔ win64 را از
  echo پوشهٔ فشرده بیرون بکشید و کنار همین فایل‌ها ^(پوشهٔ app^) کپی کنید،
  echo بعد دوباره این فایل را اجرا کنید.
  pause
  exit /b 1
)

if not exist ".next" (
  echo برنامه هنوز یک‌بار ساخته نشده. اول اجرای-برنامه.bat را یک‌بار کامل
  echo اجرا کنید تا برنامه آماده شود، بعد دوباره این فایل را اجرا کنید.
  pause
  exit /b 1
)

if not exist "logs" mkdir logs

for /f "delims=" %%N in ('where node') do set NODE_PATH=%%N
if "%NODE_PATH%"=="" (
  echo Node.js پیدا نشد؛ مطمئن شوید طبق بخش ۱ فایل README نصب شده.
  pause
  exit /b 1
)

echo در حال نصب سرویس نرم‌افزار کلینیک...
nssm.exe install ClinicBookingApp "%NODE_PATH%" "%~dp0node_modules\next\dist\bin\next start"
nssm.exe set ClinicBookingApp AppDirectory "%~dp0"
nssm.exe set ClinicBookingApp Start SERVICE_AUTO_START
nssm.exe set ClinicBookingApp AppStdout "%~dp0logs\app-service.log"
nssm.exe set ClinicBookingApp AppStderr "%~dp0logs\app-service.log"
nssm.exe start ClinicBookingApp

if exist "cloudflared.exe" (
  echo در حال نصب سرویس Cloudflare Tunnel...
  nssm.exe install ClinicCloudflareTunnel "%~dp0cloudflared.exe" "tunnel --url http://localhost:3000"
  nssm.exe set ClinicCloudflareTunnel AppDirectory "%~dp0"
  nssm.exe set ClinicCloudflareTunnel Start SERVICE_AUTO_START
  nssm.exe set ClinicCloudflareTunnel AppStdout "%~dp0logs\tunnel-service.log"
  nssm.exe set ClinicCloudflareTunnel AppStderr "%~dp0logs\tunnel-service.log"
  nssm.exe start ClinicCloudflareTunnel
) else (
  echo.
  echo نکته: cloudflared.exe اینجا پیدا نشد، پس فقط سرویس خودِ برنامه نصب شد.
  echo اگر از بات تلگرام/بله استفاده می‌کنید، طبق بخش ۶.۳ فایل README آن را
  echo هم کنار همین فایل‌ها کپی کنید و دوباره این اسکریپت را اجرا کنید.
)

echo.
echo تمام شد. برای دیدن وضعیت سرویس‌ها، services.msc را باز کنید و دنبال
echo "ClinicBookingApp" و "ClinicCloudflareTunnel" بگردید.
echo.
echo نکتهٔ مهم: چون برنامه الان به‌عنوان سرویس اجرا می‌شود، دیگر نباید
echo اجرای-برنامه.bat را هم‌زمان باز نگه دارید (پورت ۳۰۰۰ تداخل می‌کند).
echo از این به بعد، هر بار «به‌روزرسانی.bat» را که اجرا کردید، در پایان
echo این دو دستور را هم بزنید تا سرویس نسخهٔ جدید را بارگذاری کند:
echo   nssm.exe restart ClinicBookingApp
echo.
pause
