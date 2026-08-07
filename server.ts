import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 image uploads
app.use(express.json({ limit: "25mb" }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: any = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// JSON Response Schema for Company Extraction
const companyExtractionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      nama_perusahaan: {
        type: Type.STRING,
        description: "Nama resmi perusahaan, PT, CV, atau organisasi",
      },
      bidang_perusahaan: {
        type: Type.STRING,
        description: "Bidang industri / sektor usaha (e.g. Otomotif, Logistik, Software, Tekstil)",
      },
      telpon_perusahaan: {
        type: Type.STRING,
        description: "Nomor telepon kantor / stasioner",
      },
      email_perusahaan: {
        type: Type.STRING,
        description: "Email resmi kantor / umum (info@... / sales@...)",
      },
      website_perusahaan: {
        type: Type.STRING,
        description: "Website perusahaan atau link URL",
      },
      nama_pic: {
        type: Type.STRING,
        description: "Nama Person in Charge (PIC) atau kontak perwakilan",
      },
      jabatan_pic: {
        type: Type.STRING,
        description: "Jabatan atau Posisi PIC (e.g. Direktur, Manager, Staff)",
      },
      whatsapp_pic: {
        type: Type.STRING,
        description: "Nomor handphone / WhatsApp PIC (diutamakan format nomor bersih)",
      },
      email_pic: {
        type: Type.STRING,
        description: "Email personal PIC",
      },
      alamat_kota: {
        type: Type.STRING,
        description: "Nama kota/area wilayah (e.g. Jakarta Selatan, Surabaya, Bekasi, Tangerang)",
      },
      alamat_kawasan: {
        type: Type.STRING,
        description: "Nama kawasan industri / komplek gedung / area lokasi opsional (e.g. MM2100, KIIC, SIER, Jababeka)",
      },
      alamat_detail: {
        type: Type.STRING,
        description: "Alamat lengkap jalan, nomor, kecamatan, kelurahan, kode pos",
      },
      maps_longitude: {
        type: Type.STRING,
        description: "Garis bujur (longitude) koordinat lokasi dari alamat",
      },
      maps_latitude: {
        type: Type.STRING,
        description: "Garis lintang (latitude) koordinat lokasi dari alamat",
      },
    },
    required: ["nama_perusahaan"],
  },
};

// Helper to safely call Gemini API with retry and fallback
async function generateWithGemini(params: any, retries = 1): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const errString = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
    const errStatus = error.status || error.statusCode || error.code;
    const isRateLimit =
      errStatus === 429 ||
      errStatus === "RESOURCE_EXHAUSTED" ||
      errString.includes("429") ||
      errString.includes("RESOURCE_EXHAUSTED") ||
      errString.includes("quota");

    if (isRateLimit && retries > 0) {
      console.warn("Gemini API rate limited (429). Retrying after 2s delay...");
      await new Promise((r) => setTimeout(r, 2000));
      return await generateWithGemini(params, retries - 1);
    }
    throw error;
  }
}

function formatAiErrorMessage(error: any): string {
  if (!error) return "Gagal memproses data dengan AI. Silakan coba lagi.";

  const errString = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
  const errStatus = error.status || error.statusCode || error.code;

  if (
    errStatus === 429 ||
    errStatus === "RESOURCE_EXHAUSTED" ||
    errString.includes("429") ||
    errString.includes("RESOURCE_EXHAUSTED") ||
    errString.includes("quota") ||
    errString.includes("rate-limits") ||
    errString.includes("rate limit") ||
    errString.includes("exceeded") ||
    errString.includes("Exceeded")
  ) {
    return "Batas kuota penggunaan AI (Gemini API Rate Limit / Quota Exceeded) telah tercapai. Silakan tunggu 1-2 menit lalu coba kembali.";
  }

  if (errString.includes("API_KEY_INVALID") || errString.includes("API key not valid")) {
    return "API Key Gemini tidak valid atau belum dikonfigurasi.";
  }

  try {
    const jsonMatch = errString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error?.message) {
        if (parsed.error.code === 429 || parsed.error.status === "RESOURCE_EXHAUSTED") {
          return "Batas kuota penggunaan AI (Gemini API Rate Limit / Quota Exceeded) telah tercapai. Silakan tunggu 1-2 menit lalu coba kembali.";
        }
        return `Kesalahan AI: ${parsed.error.message}`;
      }
    }
  } catch {
    // ignore
  }

  if (typeof error.message === 'string' && !error.message.startsWith('ApiError:')) {
    return error.message;
  }

  return "Gagal memproses data dengan AI. Silakan coba beberapa saat lagi.";
}

// API: AI Scan Image (OCR & Extraction)
app.post("/api/ai-extract-image", async (req, res) => {
  try {
    if (!ai) {
      res.status(500).json({ success: false, error: "API Key Gemini belum dikonfigurasi di server." });
      return;
    }
    const { imageBase64, mimeType = "image/jpeg", customPrompt } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: "Base64 image is required." });
      return;
    }

    // Clean base64 string if data URL prefix exists
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

    const promptText = customPrompt || 
      "Analisis gambar kartu nama, dokumen, daftar pameran, katalog, atau foto berisikan satu atau BANYAK data perusahaan ini. Ekstrak SELURUH data perusahaan dan kontak yang ada ke dalam format JSON array. Jika ada informasi yang tidak ditemukan pada gambar, biarkan string kosong.";

    const response = await generateWithGemini({
      model: "gemini-3.6-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: companyExtractionSchema,
        tools: [{ googleSearch: {} }],
        systemInstruction:
          "Anda adalah AI ekstraktor data bisnis Indonesia terampil. Tugas Anda adalah memindai gambar (kartu nama, direktori, daftar kontak, faktur, brosur, daftar pameran) dan mengesktrak SELURUH daftar perusahaan beserta detail PIC, Jabatan, WhatsApp, email, telpon, dan alamat secara presisi. SANGAT PENTING: Jika gambar mengandung BANYAK perusahaan (misalnya 2, 5, 10, atau puluhan entitas), ekstrak SEMUA perusahaan tersebut satu per satu ke dalam array JSON. Jangan lewatkan satupun entitas perusahaan. Selain melakukan ekstraksi teks yang ada, jika ada informasi yang tidak tercantum (terutama alamat lengkap, kontak, telpon, atau email perusahaan), gunakan pengetahuan Anda untuk melengkapi data tersebut berdasarkan nama perusahaan yang bersangkutan.",
      },
    });

    const text = response.text || "[]";
    const parsed = JSON.parse(text);
    
    const extractedRecords = parsed.map((item: any) => ({
      namaPerusahaan: item.nama_perusahaan || "",
      bidang: item.bidang_perusahaan || "",
      telponKantor: item.telpon_perusahaan || "",
      emailKantor: item.email_perusahaan || "",
      website: item.website_perusahaan || "",
      namaPic: item.nama_pic || "",
      jabatanPic: item.jabatan_pic || "",
      whatsapp: item.whatsapp_pic || "",
      emailPic: item.email_pic || "",
      areaKota: item.alamat_kota || "",
      kawasan: item.alamat_kawasan || "",
      alamat: item.alamat_detail || "",
      latitude: item.maps_latitude || "",
      longitude: item.maps_longitude || ""
    }));

    res.json({
      success: true,
      records: extractedRecords,
      totalExtracted: extractedRecords.length,
    });
  } catch (error: any) {
    const errorMessage = formatAiErrorMessage(error);
    if (errorMessage.includes("Batas kuota")) {
      console.warn("AI extraction rate limited (429)");
    } else {
      console.error("Error in AI image extraction:", error);
    }
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// API: AI Parse Raw Text / Unstructured Paste
app.post("/api/ai-extract-text", async (req, res) => {
  try {
    if (!ai) {
      res.status(500).json({ success: false, error: "API Key Gemini belum dikonfigurasi di server." });
      return;
    }
    const { rawText } = req.body;

    if (!rawText || typeof rawText !== "string") {
      res.status(400).json({ error: "rawText string is required." });
      return;
    }

    const response = await generateWithGemini({
      model: "gemini-3.6-flash",
      contents: `Berikut adalah teks mentah/unstructured yang dapat berisi satu atau BANYAK data perusahaan/kontak:\n\n"""\n${rawText}\n"""\n\nTolong analisa dan ekstrak SELURUH entitas perusahaan dan kontak dari teks di atas ke dalam format JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: companyExtractionSchema,
        tools: [{ googleSearch: {} }],
        systemInstruction:
          "Anda adalah AI spesialis ekstraksi data bisnis. Tugas Anda adalah menguraikan teks mentah (misal pesan WhatsApp, email, catatan acak, daftar pameran, tabel teks) menjadi baris-baris data perusahaan terstruktur dengan urutan bidang: namaPerusahaan, bidang, telponKantor, emailKantor, namaPic, jabatanPic, whatsapp, emailPic, areaKota, kawasan, alamat. SANGAT PENTING: Jika teks berisi BANYAK perusahaan (misalnya 2, 5, 10, atau puluhan entitas), ekstrak SEMUA entitas perusahaan tersebut tanpa ada yang terlewatkan ke dalam array JSON. Selain melakukan ekstraksi teks yang ada, jika ada informasi yang tidak tercantum (terutama alamat lengkap, kontak, telpon, atau email perusahaan), gunakan pengetahuan Anda untuk mencari dan melengkapi data tersebut berdasarkan nama perusahaan yang bersangkutan.",
      },
    });

    const text = response.text || "[]";
    const parsed = JSON.parse(text);
    
    const extractedRecords = parsed.map((item: any) => ({
      namaPerusahaan: item.nama_perusahaan || "",
      bidang: item.bidang_perusahaan || "",
      telponKantor: item.telpon_perusahaan || "",
      emailKantor: item.email_perusahaan || "",
      website: item.website_perusahaan || "",
      namaPic: item.nama_pic || "",
      jabatanPic: item.jabatan_pic || "",
      whatsapp: item.whatsapp_pic || "",
      emailPic: item.email_pic || "",
      areaKota: item.alamat_kota || "",
      kawasan: item.alamat_kawasan || "",
      alamat: item.alamat_detail || "",
      latitude: item.maps_latitude || "",
      longitude: item.maps_longitude || ""
    }));

    res.json({
      success: true,
      records: extractedRecords,
      totalExtracted: extractedRecords.length,
    });
  } catch (error: any) {
    const errorMessage = formatAiErrorMessage(error);
    if (errorMessage.includes("Batas kuota")) {
      console.warn("AI text extraction rate limited (429)");
    } else {
      console.error("Error in AI text extraction:", error);
    }
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Start Server with Vite Middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vitePkg = "vite";
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server DataCraft running on http://localhost:${PORT}`);
  });
}

// Only start standard Express listener when NOT running as a Vercel serverless function
if (!process.env.VERCEL) {
  startServer();
}

export default app;
