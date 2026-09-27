// server.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { tiktokDownloaderVideo, tiktokSearchVideo, Instagram } from "./scraper.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const VALID_KEY = process.env.BROMANAPI_KEY;

// --- Konfigurasi Trust Proxy ---
// Penting: Ini memungkinkan Express mengambil IP klien sebenarnya dari header X-Forwarded-For
// saat berjalan di belakang proxy (seperti Nginx atau Load Balancer).
app.set('trust proxy', true);

// --- Middleware ---
app.use(express.json());

// --- Morgan custom token untuk zona waktu WIB (Asia/Jakarta) ---
morgan.token('wib-date', function(req, res) {
  // Menggunakan Intl.DateTimeFormat untuk format waktu yang akurat di WIB (Asia/Jakarta)
  const formatter = new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });
  return formatter.format(new Date());
});

// --- Morgan custom token untuk menghapus prefix ::ffff: dari IPv4-mapped IPv6 ---
morgan.token('client-ip', function(req, res) {
  const ip = req.ip; // req.ip sudah benar karena 'trust proxy' = true
  // Hapus prefix "::ffff:" jika ada, untuk menampilkan IPv4 yang bersih
  if (ip && ip.startsWith('::ffff:')) {
    return ip.substring(7); 
  }
  return ip;
});

// --- Morgan custom log format yang lebih mudah dibaca ---
// Menggunakan token kustom 'wib-date' dan 'client-ip'.
// Format: [WIB DD/MM/YYYY HH:mm:ss] KlienIP "METHOD URL" STATUS ContentLength - ResponseTime ms
const logFormat = '[WIB :wib-date] :client-ip ":method :url" :status :res[content-length] - :response-time ms';
app.use(morgan(logFormat));


const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: parseInt(process.env.RATE_LIMIT_MAX || "30"), // default 30 req/menit
  message: { success: false, error: "Terlalu banyak request, coba lagi nanti." },
  // FIX: Tambahkan keyGenerator untuk mengatasi ValidationError karena 'trust proxy' = true.
  // req.ip sekarang berisi IP klien yang benar (karena trust proxy diaktifkan).
  keyGenerator: (req, res) => {
    return req.ip; 
  }
});
app.use(limiter);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});


// --- API Key middleware (global) ---
app.use((req, res, next) => {
  const key = req.headers["x-api-key"]; // Hanya terima dari header
  if (!VALID_KEY) {
    console.error("BROMANAPI_KEY belum diset di .env");
    return res.status(500).json({ success: false, error: "Server belum dikonfigurasi." });
  }
  if (!key || key !== VALID_KEY) {
    return res.status(401).json({ success: false, error: "API key tidak valid atau tidak disertakan." });
  }
  next();
});

// --- Root ---
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Tiktok & Instagram Downloader API - anyaScraping",
    routes: {
      tiktok_download: "/api/tiktok/download?url=<TIKTOK_URL>",
      tiktok_search: "/api/tiktok/search?query=<QUERY>",
      instagram_download: "/api/instagram/download?url=<INSTAGRAM_URL>",
      proxy: "/api/proxy-download?url=<FILE_URL>&filename=<NAME>",
    },
  });
});

// --- Proxy download (stream file ke client) ---
app.get("/api/proxy-download", async (req, res) => {
  try {
    const { url, filename } = req.query;
    if (!url || !filename) return res.status(400).json({ success: false, error: "URL dan filename wajib diisi." });

    
    const decodedUrl = decodeURIComponent(url);
    
    // Header default
    const requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
    };

    // Tentukan header berdasarkan sumber URL
    if (decodedUrl.includes('tikwm.com')) {
        requestHeaders['Referer'] = 'https://www.tikwm.com/';
    } else if (decodedUrl.includes('cdninstagram.com')) {
        // --- PERBAIKAN FINAL (Semoga) ---
        // Kita harus meniru *semua* header penting dari scraper GraphQL (scraper.js)
        // Ini adalah header yang digunakan untuk GET media, bukan POST ke GraphQL
        requestHeaders['Referer'] = 'https://www.instagram.com/';
        requestHeaders['User-Agent'] = 'Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36';
        requestHeaders['Accept'] = '*/*';
        requestHeaders['Accept-Language'] = 'en-US,en;q=0.5';
        requestHeaders['X-IG-App-ID'] = '1217981644879628'; // <-- Ini kemungkinan besar kuncinya
        requestHeaders['Sec-Fetch-Dest'] = 'empty';
        requestHeaders['Sec-Fetch-Mode'] = 'cors';
        requestHeaders['Sec-Fetch-Site'] = 'same-origin';
        // --- AKHIR PERBAIKAN ---
    } else if (decodedUrl.includes('snapsave.app')) {
        requestHeaders['Referer'] = 'https://snapsave.app/';
    }


    const response = await axios.get(decodedUrl, {
      responseType: "stream",
      timeout: 30000,
      headers: requestHeaders
    });

    // Paksa browser untuk men-download
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }

    const stream = response.data.pipe(res);
    stream.on("finish", () => {});
    stream.on("error", (err) => {
      console.error("Stream error:", err);
      try { res.end(); } catch(e) {}
    });
  } catch (err) {
    console.error(`Proxy-download error for ${req.query.url}:`, err.message);
    if (!res.headersSent) {
        // Kirim 500 (Internal Server Error) seperti yang Anda lihat di log
        res.status(500).json({ success: false, error: "Gagal proxy-download.", detail: err.message });
    }
  }
});

// --- Download TikTok (TikWM) ---
app.get("/api/tiktok/download", async (req, res) => {
  try {
    let tiktokUrl = req.query.url;
    if (!tiktokUrl) return res.status(400).json({ success: false, error: "TikTok URL wajib diisi." });

    // Gunakan file scraper.js yang terbaru
    const videoData = await tiktokDownloaderVideo(tiktokUrl); 
    if (videoData) {
        return res.json({ success: true, source: "tikwm", ...videoData });
    } else {
        throw new Error("Gagal mengambil data dari TikWM.");
    }
  } catch (e) {
    console.error(`TikWM (1) failed: ${e.message}.`);
    return res.status(502).json({ success: false, error: "Gagal memproses video dari TikWM.", detail: e.message });
  }
});

// --- Download Instagram ---
app.get("/api/instagram/download", async (req, res) => {
    try {
        let instaUrl = req.query.url;
        if (!instaUrl) return res.status(400).json({ success: false, error: "Instagram URL wajib diisi." });

        const videoData = await Instagram(instaUrl);
        if (videoData && videoData.url) {
            return res.json({ success: true, source: "snapsave/graphql", ...videoData });
        } else {
             throw new Error(videoData.msg || "Gagal mengambil data dari Instagram.");
        }
    } catch (e) {
        console.error(`Instagram Scraper failed: ${e.message}`);
        return res.status(502).json({ success: false, error: "Gagal memproses postingan Instagram.", detail: e.message });
    }
});

// --- Search TikTok ---
app.get("/api/tiktok/search", async (req, res) => {
    try {
        let query = req.query.query;
        if (!query) return res.status(400).json({ success: false, error: "Query pencarian wajib diisi." });

        const searchData = await tiktokSearchVideo(query);
         if (searchData) {
            return res.json({ success: true, source: "tikwm_search", data: searchData });
        } else {
             throw new Error("Gagal mengambil data pencarian.");
        }
    } catch (e) {
        console.error(`TikTok Search failed: ${e.message}`);
        return res.status(502).json({ success: false, error: "Gagal melakukan pencarian.", detail: e.message });
    }
});


// --- start ---
app.listen(PORT, () => {
  console.log(`🚀 nexaTik API Server running on port ${PORT}`);
});