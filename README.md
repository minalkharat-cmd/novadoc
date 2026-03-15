# 🧬 NovaDoc – AI Medical Document Intelligence

> **Amazon Nova AI Hackathon Submission** | Powered by Amazon Nova on AWS Bedrock

NovaDoc is an AI-powered medical document intelligence platform that transforms how patients interact with their health records. Upload any medical document — prescriptions, lab reports, discharge summaries, X-rays — and get instant AI-powered analysis, clinical insights, and a conversational interface to ask questions about your health data.

![Amazon Nova](https://img.shields.io/badge/Amazon%20Nova-Powered-00A3E0?style=for-the-badge&logo=amazon-aws)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)

## 🎯 What It Does

1. **📤 Upload** medical documents (images/PDFs) via drag-and-drop
2. **🔬 Analyze** using Amazon Nova's multimodal vision capabilities to extract medical data
3. **⚠️ Alert** with AI-generated clinical risk assessments and evidence-based recommendations
4. **📊 Track** health parameters in a structured lab results dashboard
5. **💬 Chat** with your medical records using natural language

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│            Frontend (Vite + React)           │
│  Upload Panel │ Insights Panel │ Chat Panel  │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│           Backend (Node.js / Express)        │
│  ┌────────────────────────────────────────┐  │
│  │  Multi-Step Document Pipeline          │  │
│  │  Image → Nova Vision → Structured     │  │
│  │  JSON → Clinical Insights → Chat      │  │
│  └────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   Amazon Bedrock    │
         │   (Nova Lite/Pro)   │
         └────────────────────┘
```

## 🚀 Amazon Nova Integration

NovaDoc deeply integrates with Amazon Nova models via AWS Bedrock:

- **Nova Vision (Multimodal)**: Analyzes uploaded medical document images to extract structured clinical data — test names, values, reference ranges, and abnormality status
- **Nova Text (Reasoning)**: Generates clinical insights including risk alerts with severity levels, evidence-based recommendations citing medical guidelines (ADA, ACC/AHA), drug interaction warnings, and longitudinal trend analysis
- **Nova Chat (Agentic RAG)**: Powers the conversational interface with full context of all patient documents, enabling natural language queries about health records

## 🛠️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | React 19, Vite 8, Vanilla CSS (Glassmorphism) |
| Backend | Node.js, Express 5 |
| AI Engine | Amazon Nova (Lite/Pro) via AWS Bedrock |
| File Upload | Multer |
| Styling | Premium dark mode, glassmorphism, Inter font |

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- AWS account with Bedrock access (or use Demo Mode)

### Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/novadoc.git
cd novadoc
npm install

# Configure (optional - runs in demo mode by default)
cp .env.example .env
# Edit .env with your AWS credentials

# Run
npm run dev
```

The app will start at `http://localhost:5173` with the backend on port `3001`.

### Demo Mode

By default, NovaDoc runs in **Demo Mode** (`DEMO_MODE=true`) with realistic mock medical data so you can explore all features without AWS credentials. Set `DEMO_MODE=false` and add your AWS credentials to use real Amazon Nova models.

## 📁 Project Structure

```
novadoc/
├── index.html              # Entry point
├── server/
│   ├── index.js            # Express server + API routes
│   └── nova.js             # Amazon Bedrock/Nova integration
├── src/
│   ├── main.jsx            # React entry
│   ├── App.jsx             # Main application
│   ├── index.css           # Design system (glassmorphism)
│   └── components/
│       ├── UploadPanel.jsx  # Drag-and-drop upload
│       ├── InsightsPanel.jsx # Risk alerts + lab results
│       ├── Timeline.jsx     # Medical record timeline
│       ├── ChatPanel.jsx    # AI chat interface
│       └── DocumentModal.jsx # Document detail view
├── .env.example            # Environment template
└── package.json
```

## 🏆 Hackathon Categories

- **Multimodal Understanding**: Processing medical images + text for structured data extraction
- **Agentic AI**: Multi-step document analysis pipeline with autonomous reasoning
- **Freestyle**: Novel healthcare application

## 📝 License

MIT

---

*Built with ❤️ for the Amazon Nova AI Hackathon 2026*
*#AmazonNova*
