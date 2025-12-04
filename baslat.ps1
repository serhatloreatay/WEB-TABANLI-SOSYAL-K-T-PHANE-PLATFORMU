# Kitap ve Film Kütüphanesi - Başlatma Scripti
# Bu script backend ve frontend'i ayrı terminallerde başlatır

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Kitap ve Film Kütüphanesi Platform" -ForegroundColor Cyan
Write-Host "Başlatılıyor..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Backend kontrolü
Write-Host "[1/3] Backend kontrol ediliyor..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.env")) {
    Write-Host "UYARI: backend\.env dosyası bulunamadı!" -ForegroundColor Red
    Write-Host "Lütfen backend\env.example dosyasını .env olarak kopyalayın ve düzenleyin." -ForegroundColor Yellow
    Write-Host ""
}

# Frontend kontrolü
Write-Host "[2/3] Frontend kontrol ediliyor..." -ForegroundColor Yellow
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "UYARI: Frontend bağımlılıkları yüklü değil!" -ForegroundColor Red
    Write-Host "Lütfen 'cd frontend && npm install' komutunu çalıştırın." -ForegroundColor Yellow
    Write-Host ""
}

# Backend başlatma
Write-Host "[3/3] Backend başlatılıyor..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Backend başlatılıyor...' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 3

# Frontend başlatma
Write-Host "Frontend başlatılıyor..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host 'Frontend başlatılıyor...' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Her iki sunucu da ayrı pencerelerde başlatıldı." -ForegroundColor Yellow
Write-Host "Tarayıcınızda http://localhost:3000 adresine gidin." -ForegroundColor Yellow
Write-Host ""
Write-Host "Sunucuları durdurmak için pencereleri kapatın." -ForegroundColor Gray

