<<<<<<< HEAD
# Kitap ve Film Kütüphanesi Sosyal Platform

Kullanıcıların kişisel kitap ve film kütüphanelerini oluşturabildiği, içerikleri puanlayıp yorumlayabileceği ve sosyal akış üzerinden paylaşım yapabildiği web tabanlı bir sosyal platform.

## Teknolojiler

### Backend
- Node.js
- Express.js
- MySQL
- JWT Authentication
- TMDb API (Filmler)
- Google Books API (Kitaplar)

### Frontend
- React
- React Router
- React Query
- Vite
- Axios

## Kurulum

Detaylı kurulum talimatları için [KURULUM.md](KURULUM.md) dosyasına bakın.

### Hızlı Başlangıç

1. **Ön Gereksinimler**: Node.js ve MySQL kurulu olmalıdır.

2. **Veritabanı Oluşturma**:
   ```bash
   mysql -u root -p
   CREATE DATABASE library_platform;
   USE library_platform;
   SOURCE database/schema.sql;
   ```

3. **Bağımlılıkları Yükleme**:
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

4. **Backend .env Dosyasını Ayarlama**:
   - `backend/env.example` dosyasını `backend/.env` olarak kopyalayın
   - MySQL şifrenizi ve API anahtarlarınızı girin

5. **Programı Başlatma**:

   **Windows PowerShell:**
   ```powershell
   .\baslat.ps1
   ```
   
   **Windows CMD:**
   ```cmd
   baslat.bat
   ```
   
   **Manuel Başlatma:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. Tarayıcınızda `http://localhost:3000` adresine gidin.

## API Anahtarları

Aşağıdaki API anahtarlarını almanız gerekmektedir:

1. **TMDb API Key**: https://www.themoviedb.org/settings/api
2. **Google Books API Key**: https://console.cloud.google.com/apis/credentials

Bu anahtarları `backend/.env` dosyasına ekleyin.

## Özellikler

- ✅ Kullanıcı kaydı ve girişi
- ✅ Şifre sıfırlama
- ✅ Film ve kitap arama
- ✅ İçerik detay sayfaları
- ✅ Puanlama sistemi (1-10)
- ✅ Yorum sistemi
- ✅ Kullanıcı listeleri (İzlediklerim, İzlenecekler, Okuduklarım, Okunacaklar)
- ✅ Özel listeler
- ✅ Takip sistemi
- ✅ Sosyal akış (Feed)
- ✅ Aktivite kartları

## Veritabanı Yapısı

- `users` - Kullanıcılar
- `movies` - Filmler
- `books` - Kitaplar
- `ratings` - Puanlamalar
- `reviews` - Yorumlar
- `user_lists` - Kullanıcı listeleri
- `custom_lists` - Özel listeler
- `custom_list_items` - Özel liste öğeleri
- `follows` - Takip ilişkileri
- `likes` - Beğeniler
- `review_comments` - Yorumlara yapılan yorumlar

## Geliştirme

Backend ve frontend ayrı ayrı çalıştırılmalıdır. Her ikisi de development modunda hot-reload destekler.

## Sürüm Kontrolü (Git)

Bu proje Git sürüm kontrol sistemi kullanmaktadır.

### Git Repository Başlatma

Eğer projeyi ilk kez Git ile yönetmeye başlıyorsanız:

```bash
# Git repository'yi başlat
git init

# Tüm dosyaları ekle
git add .

# İlk commit
git commit -m "Initial commit: Kitap ve Film Kütüphanesi Sosyal Platform"

# Remote repository ekle (GitHub/GitLab vb.)
git remote add origin <repository-url>

# Main branch'e push et
git branch -M main
git push -u origin main
```

### Git Workflow

Projede **Git Flow** yaklaşımı kullanılmaktadır:

- `main` - Production'a hazır, stabil kod
- `develop` - Geliştirme branch'i
- `feature/*` - Yeni özellikler için
- `bugfix/*` - Hata düzeltmeleri için
- `hotfix/*` - Acil production düzeltmeleri için

Detaylı bilgi için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bakın.

### Temel Git Komutları

```bash
# Değişiklikleri kontrol et
git status

# Değişiklikleri ekle
git add .

# Commit oluştur
git commit -m "feat: yeni özellik eklendi"

# Branch oluştur
git checkout -b feature/yeni-ozellik

# Branch'leri listele
git branch

# Değişiklikleri push et
git push origin branch-adi

# Son commit'leri görüntüle
git log --oneline
```

## Ekip Çalışması

Bu proje ekip çalışması için tasarlanmıştır:

- **Branch Stratejisi:** Git Flow kullanılarak paralel geliştirme yapılabilir
- **Code Review:** Tüm değişiklikler Pull Request üzerinden review edilir
- **Issue Tracking:** Problemler ve özellik istekleri issue'lar üzerinden takip edilir
- **Dokümantasyon:** Kod değişiklikleri ve önemli kararlar dokümante edilir

Detaylı katkı rehberi için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bakın.

## Analitik Problem Çözme

Projede karşılaşılan problemler sistematik bir yaklaşımla çözülmektedir:

1. **Problemi Tanımlama:** Hata mesajları, log'lar ve kullanıcı geri bildirimleri analiz edilir
2. **Araştırma:** Benzer problemler, dokümantasyon ve best practice'ler incelenir
3. **Çözüm Geliştirme:** Minimal, test edilebilir çözümler üretilir
4. **Test ve Doğrulama:** Çözüm test edilir ve edge case'ler kontrol edilir
5. **Dokümantasyon:** Çözüm ve öğrenilenler dokümante edilir

Örnek problem çözme süreçleri:
- MySQL `LIMIT ?` prepared statement sorunu → SQL query'ye direkt limit değeri eklendi
- React Query cache invalidation → `refetchQueries` ve state yönetimi ile çözüldü
- Avatar URL senkronizasyonu → AuthContext `updateUser` fonksiyonu ile çözüldü

## Lisans

Bu proje eğitim amaçlı geliştirilmiştir.
