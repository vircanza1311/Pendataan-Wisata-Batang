# Portal Pendataan DTW Batang — Vercel Reverse Proxy

## Cara Kerja

```
User Browser
    │
    ▼
[vercel.app URL]   ← URL yang dilihat user, tidak berubah
    │
    ▼  (server-side, tidak terlihat user)
api/proxy.js  ──►  Google Apps Script (GAS)
    │
    ▼
Konten GAS dikembalikan ke browser
```

Tidak ada redirect. URL tetap `*.vercel.app` selamanya.

---

## Struktur File

```
/
├── api/
│   └── proxy.js        ← Edge Function: reverse proxy ke GAS
├── public/
│   └── index.html      ← Loading screen (tidak lagi dipakai sebagai redirector)
├── vercel.json         ← Routing rules: semua request → proxy
└── package.json
```

---

## Deploy ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "initial: reverse proxy GAS"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### 2. Import ke Vercel

1. Buka https://vercel.com/new
2. Import repository GitHub di atas
3. Biarkan semua setting default
4. Klik **Deploy**

### 3. Selesai

URL Vercel Anda (misal `pendataan-dtw.vercel.app`) sekarang langsung
menampilkan portal GAS **tanpa redirect**. URL tidak berubah.

---

## Ganti URL GAS

Jika URL deployment GAS berubah, edit **satu baris** di `api/proxy.js`:

```js
const GAS_BASE = 'https://script.google.com/macros/s/DEPLOYMENT_ID_BARU/exec';
```

Kemudian commit & push — Vercel auto-deploy.

---

## Catatan Teknis

- `api/proxy.js` menggunakan **Vercel Edge Runtime** (bukan Node.js biasa)
  sehingga cold start < 50ms, jauh lebih cepat dari serverless biasa.
- `vercel.json` meneruskan **semua** path ke proxy kecuali `_next`, `favicon`, dan `api`.
- GAS tetap handle auth PIN dan semua logika bisnis — tidak ada perubahan ke GAS.
- Header `Cache-Control: no-store` dipasang karena konten GAS bersifat dinamis.
