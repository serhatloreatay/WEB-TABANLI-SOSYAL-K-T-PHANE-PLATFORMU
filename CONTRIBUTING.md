# Katkıda Bulunma Rehberi

Bu projeye katkıda bulunmak istediğiniz için teşekkürler! Bu doküman, ekip çalışması ve projeye katkı süreçlerini açıklar.

## Git Workflow

### 1. Repository'yi Klonlama

```bash
git clone <repository-url>
cd YAZLAB1_2
```

### 2. Branch Stratejisi

Projede **Git Flow** yaklaşımı kullanılmaktadır:

- `main` - Production'a hazır, stabil kod
- `develop` - Geliştirme branch'i
- `feature/feature-name` - Yeni özellikler için
- `bugfix/bug-name` - Hata düzeltmeleri için
- `hotfix/hotfix-name` - Acil production düzeltmeleri için

### 3. Yeni Özellik Geliştirme

1. **Güncel develop branch'ini çekin:**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Yeni feature branch'i oluşturun:**
   ```bash
   git checkout -b feature/yeni-ozellik-adi
   ```

3. **Değişikliklerinizi yapın ve commit edin:**
   ```bash
   git add .
   git commit -m "feat: yeni özellik açıklaması"
   ```

4. **Commit mesaj formatı:**
   - `feat:` - Yeni özellik
   - `fix:` - Hata düzeltmesi
   - `docs:` - Dokümantasyon değişiklikleri
   - `style:` - Kod formatı (işlevsellik değişikliği yok)
   - `refactor:` - Kod refaktörü
   - `test:` - Test ekleme/düzeltme
   - `chore:` - Build süreçleri, araçlar vb.

5. **Branch'inizi push edin:**
   ```bash
   git push origin feature/yeni-ozellik-adi
   ```

6. **Pull Request oluşturun:**
   - GitHub/GitLab üzerinden `develop` branch'ine PR açın
   - PR açıklamasında yapılan değişiklikleri detaylıca açıklayın
   - İlgili issue'ları referans edin

### 4. Code Review Süreci

- Tüm PR'lar en az bir kişi tarafından review edilmelidir
- Review sırasında kod kalitesi, test coverage ve dokümantasyon kontrol edilir
- Gerekli değişiklikler yapıldıktan sonra PR merge edilir

## Kod Standartları

### Backend (Node.js/Express)

- **ESLint** kullanılmalıdır
- **Async/await** tercih edilir (callback'ler yerine)
- Hata yönetimi için try-catch blokları kullanılmalıdır
- API endpoint'leri RESTful standartlarına uygun olmalıdır

### Frontend (React)

- **Functional Components** ve **Hooks** kullanılmalıdır
- Component'ler tek sorumluluk prensibine uygun olmalıdır
- Props ve state için TypeScript veya PropTypes kullanılabilir
- CSS dosyaları component'lerle aynı klasörde olmalıdır

### Veritabanı

- Migration dosyaları kullanılmalıdır
- SQL injection'dan korunmak için prepared statements kullanılmalıdır
- Veritabanı şeması değişiklikleri `database/migrations/` klasörüne eklenmelidir

## Test Etme

### Backend Testleri

```bash
cd backend
npm test
```

### Frontend Testleri

```bash
cd frontend
npm test
```

## Problem Çözme Yaklaşımı

### 1. Problemi Tanımlama

- Hata mesajlarını tam olarak kaydedin
- Problemin hangi durumda oluştuğunu belirleyin
- Adımları tekrarlanabilir şekilde dokümante edin

### 2. Araştırma

- Benzer problemler için issue'ları kontrol edin
- İlgili dokümantasyonu inceleyin
- Stack Overflow ve resmi dokümantasyonları araştırın

### 3. Çözüm Geliştirme

- Minimal, test edilebilir çözümler üretin
- Kod değişikliklerini küçük, anlaşılır commit'ler halinde yapın
- Çözümü test edin ve edge case'leri kontrol edin

### 4. Dokümantasyon

- Yapılan değişiklikleri README veya ilgili dokümantasyona ekleyin
- Önemli kararları ve nedenlerini açıklayın

## Ekip İletişimi

- **Issue Tracking:** GitHub/GitLab Issues kullanılır
- **Pull Requests:** Tüm değişiklikler PR üzerinden yapılır
- **Code Review:** Tüm PR'lar review edilir
- **Dokümantasyon:** Önemli değişiklikler dokümante edilir

## Sorular?

Herhangi bir sorunuz varsa, lütfen bir issue açın veya proje yöneticileriyle iletişime geçin.

