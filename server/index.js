import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { analyzeDocument, generateInsights, chatWithHistory } from "./nova.js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
    }
  },
});

// In-memory store for documents and chat history
const patientData = {
  documents: [],
  chatHistory: [],
};

// --- API ROUTES ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: process.env.DEMO_MODE === "true" ? "demo" : "live",
    timestamp: new Date().toISOString(),
  });
});

// Upload and analyze document
app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString("base64");
    const mimeType = req.file.mimetype;

    console.log(`[NovaDoc] Processing document: ${req.file.originalname} (${mimeType})`);

    // Step 1: Extract medical data using Nova Vision
    const extraction = await analyzeDocument(base64, mimeType);
    console.log(`[NovaDoc] Extraction complete: ${extraction.documentType}`);

    // Step 2: Generate clinical insights
    const insights = await generateInsights(extraction);
    console.log(`[NovaDoc] Insights generated: ${insights.riskAlerts?.length || 0} alerts`);

    // Store the document
    const doc = {
      id: Date.now().toString(),
      filename: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      mimeType,
      extraction,
      insights,
    };
    patientData.documents.push(doc);

    res.json({
      success: true,
      document: doc,
    });
  } catch (error) {
    console.error("[NovaDoc] Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to process document" });
  }
});

// Get all documents
app.get("/api/documents", (req, res) => {
  res.json({ documents: patientData.documents });
});

// Chat with medical history
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const medicalContext = patientData.documents.map((d) => ({
      date: d.extraction.date,
      type: d.extraction.documentType,
      findings: d.extraction.findings,
      summary: d.extraction.summary,
    }));

    const response = await chatWithHistory(message, medicalContext, patientData.chatHistory);

    patientData.chatHistory.push(
      { role: "user", content: message },
      { role: "assistant", content: response }
    );

    res.json({ response });
  } catch (error) {
    console.error("[NovaDoc] Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat" });
  }
});

// Clear all data
app.post("/api/reset", (req, res) => {
  patientData.documents = [];
  patientData.chatHistory = [];
  res.json({ success: true });
});

// Global error handler — catches multer errors and all unhandled errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 20MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Invalid file type. Only PNG, JPEG, WebP images and PDF files are allowed.' });
    }
    return res.status(400).json({ error: err.message });
  }
  console.error('[NovaDoc] Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  const mode = process.env.DEMO_MODE === "true" ? "DEMO" : "LIVE";
  console.log(`\n🏥 NovaDoc Server running on http://localhost:${PORT} [${mode} MODE]`);
  console.log(`   Powered by Amazon Nova on AWS Bedrock\n`);
});
