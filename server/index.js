import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { analyzeDocument, generateInsights, chatWithHistory, checkDrugInteractions, compareDocuments } from "./nova.js";
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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
    }
  },
});

// In-memory store — supports multiple family profiles
const familyVault = {
  activeProfile: "default",
  profiles: {
    default: {
      name: "My Records",
      avatar: "🧑",
      documents: [],
      chatHistory: [],
    },
  },
};

function getActiveProfile() {
  return familyVault.profiles[familyVault.activeProfile];
}

// --- API ROUTES ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: process.env.DEMO_MODE === "true" ? "demo" : "live",
    timestamp: new Date().toISOString(),
  });
});

// --- FAMILY PROFILES ---
app.get("/api/profiles", (req, res) => {
  const profiles = Object.entries(familyVault.profiles).map(([id, p]) => ({
    id,
    name: p.name,
    avatar: p.avatar,
    documentCount: p.documents.length,
  }));
  res.json({ activeProfile: familyVault.activeProfile, profiles });
});

app.post("/api/profiles", (req, res) => {
  const { name, avatar } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const id = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
  familyVault.profiles[id] = {
    name,
    avatar: avatar || "👤",
    documents: [],
    chatHistory: [],
  };
  res.json({ success: true, id, profile: { name, avatar: avatar || "👤", documentCount: 0 } });
});

app.post("/api/profiles/switch", (req, res) => {
  const { profileId } = req.body;
  if (!familyVault.profiles[profileId]) {
    return res.status(404).json({ error: "Profile not found" });
  }
  familyVault.activeProfile = profileId;
  res.json({ success: true, activeProfile: profileId });
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
    const lang = req.body.lang || "en";

    console.log(`[NovaDoc] Processing document: ${req.file.originalname} (${mimeType}) [${lang}]`);

    const extraction = await analyzeDocument(base64, mimeType);
    console.log(`[NovaDoc] Extraction complete: ${extraction.documentType}`);

    const insights = await generateInsights(extraction, lang);
    console.log(`[NovaDoc] Insights generated: ${insights.riskAlerts?.length || 0} alerts`);

    // Check drug interactions
    const drugInteractions = checkDrugInteractions(extraction.medications || []);
    insights.drugInteractions = drugInteractions;

    const doc = {
      id: Date.now().toString(),
      filename: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      mimeType,
      extraction,
      insights,
    };

    const profile = getActiveProfile();
    profile.documents.push(doc);

    // Generate comparison if multiple docs exist
    let comparison = null;
    if (profile.documents.length >= 2) {
      comparison = compareDocuments(profile.documents);
    }

    res.json({
      success: true,
      document: doc,
      comparison,
    });
  } catch (error) {
    console.error("[NovaDoc] Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to process document" });
  }
});

// Get all documents for active profile
app.get("/api/documents", (req, res) => {
  const profile = getActiveProfile();
  res.json({ documents: profile.documents });
});

// Drug interaction check endpoint
app.post("/api/drug-interactions", (req, res) => {
  const { medications } = req.body;
  if (!medications || !Array.isArray(medications)) {
    return res.status(400).json({ error: "medications array is required" });
  }
  const interactions = checkDrugInteractions(medications);
  res.json({ interactions });
});

// Multi-document comparison
app.get("/api/documents/compare", (req, res) => {
  const profile = getActiveProfile();
  if (profile.documents.length < 2) {
    return res.json({ comparison: null, message: "Need at least 2 documents to compare" });
  }
  const comparison = compareDocuments(profile.documents);
  res.json({ comparison });
});

// Chat with medical history
app.post("/api/chat", async (req, res) => {
  try {
    const { message, lang } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const profile = getActiveProfile();

    const medicalContext = profile.documents.map((d) => ({
      date: d.extraction.date,
      type: d.extraction.documentType,
      findings: d.extraction.findings,
      medications: d.extraction.medications,
      summary: d.extraction.summary,
    }));

    const response = await chatWithHistory(message, medicalContext, profile.chatHistory, lang || "en");

    profile.chatHistory.push(
      { role: "user", content: message },
      { role: "assistant", content: response }
    );

    res.json({ response });
  } catch (error) {
    console.error("[NovaDoc] Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat" });
  }
});

// Clear all data for active profile
app.post("/api/reset", (req, res) => {
  const profile = getActiveProfile();
  profile.documents = [];
  profile.chatHistory = [];
  res.json({ success: true });
});

// Global error handler
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
