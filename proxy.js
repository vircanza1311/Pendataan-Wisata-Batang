// api/proxy.js
// ─────────────────────────────────────────────────────────────────────────────
// Reverse-proxy ke Google Apps Script.
// Semua request (GET / POST / form-submit dari GAS) diteruskan secara transparan.
// URL tetap di domain Vercel — user tidak pernah melihat URL GAS.
// ─────────────────────────────────────────────────────────────────────────────

const GAS_BASE =
  'https://script.google.com/macros/s/AKfycbzV8Eq8Rl4qd65MCcu4zVqGa29dKcgXKPMZ2FroQH7oXbxm_GVa32Lu99vT3nd9kn_O/exec';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);

  // Teruskan query string asli ke GAS
  const gasUrl = GAS_BASE + (url.search || '');

  // Header yang aman untuk diteruskan ke GAS
  const forwardHeaders = {};
  for (const [key, value] of req.headers.entries()) {
    const lower = key.toLowerCase();
    // Jangan teruskan host / x-forwarded-host agar GAS tidak bingung
    if (['host', 'x-forwarded-host', 'x-vercel-id'].includes(lower)) continue;
    forwardHeaders[key] = value;
  }

  // Tentukan body untuk POST
  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = req.body;
  }

  // Fetch ke GAS — ikuti redirect (GAS sering redirect ke URL exec final)
  let gasRes;
  try {
    gasRes = await fetch(gasUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: 'follow',
    });
  } catch (err) {
    return new Response(errorPage(err.message), {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Bangun response headers — hapus header yang tidak kompatibel dengan proxy
  const resHeaders = new Headers(gasRes.headers);
  // Hapus header yang menyebabkan browser redirect keluar domain Vercel
  resHeaders.delete('location');
  // Izinkan embed (GAS kadang kirim frame-options restrictive)
  resHeaders.delete('x-frame-options');
  // Cache ringan — GAS konten dinamis, jangan cache terlalu lama
  resHeaders.set('Cache-Control', 'no-store');
  resHeaders.set('Content-Type', gasRes.headers.get('Content-Type') || 'text/html; charset=utf-8');

  const responseBody = await gasRes.arrayBuffer();

  return new Response(responseBody, {
    status: gasRes.status,
    headers: resHeaders,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Halaman error sederhana jika GAS tidak bisa dihubungi
// ─────────────────────────────────────────────────────────────────────────────
function errorPage(msg) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Koneksi Gagal — Portal DTW Batang</title>
  <style>
    body{font-family:sans-serif;background:#0A1628;color:#fff;display:flex;
         align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem}
    h1{font-size:1.4rem;margin-bottom:.75rem;color:#4D8AFF}
    p{font-size:.9rem;color:rgba(255,255,255,.55);max-width:360px}
    a{display:inline-block;margin-top:1.5rem;padding:.6rem 1.4rem;background:#0057FF;
      color:#fff;text-decoration:none;border-radius:8px;font-size:.85rem}
  </style>
</head>
<body>
  <div>
    <h1>⚠️ Gagal terhubung ke server</h1>
    <p>Portal tidak dapat menjangkau server GAS saat ini.<br>
       Periksa koneksi internet Anda atau coba beberapa saat lagi.</p>
    <p style="margin-top:.75rem;font-size:.75rem;color:rgba(255,255,255,.3)">${msg}</p>
    <a href="/">↩ Coba Lagi</a>
  </div>
</body>
</html>`;
}
