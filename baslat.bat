@echo off
REM Kitap ve Film Kütüphanesi - Başlatma Scripti (Windows)
echo ========================================
echo Kitap ve Film Kütüphanesi Platform
echo Başlatılıyor...
echo ========================================
echo.

REM Backend başlatma
echo [1/2] Backend başlatılıyor...
start "Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

REM Frontend başlatma
echo [2/2] Frontend başlatılıyor...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Her iki sunucu da ayrı pencerelerde başlatıldı.
echo Tarayıcınızda http://localhost:3000 adresine gidin.
echo.
pause

