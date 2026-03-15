import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import dotenv from "dotenv";

dotenv.config();

const isDemoMode = process.env.DEMO_MODE === "true";

let bedrockClient = null;

if (!isDemoMode) {
  bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// --- DEMO MODE MOCK RESPONSES ---
const MOCK_EXTRACTION = {
  documentType: "Blood Test Report",
  patientName: "Rajesh Kumar",
  date: "2026-02-28",
  facility: "Apollo Diagnostics, New Delhi",
  findings: [
    { test: "Hemoglobin", value: "13.2 g/dL", range: "13.0–17.0", status: "normal" },
    { test: "Total WBC Count", value: "11,200 /μL", range: "4,000–11,000", status: "high" },
    { test: "Platelet Count", value: "2.1 Lakh/μL", range: "1.5–4.0 Lakh", status: "normal" },
    { test: "Fasting Blood Sugar", value: "142 mg/dL", range: "70–100", status: "high" },
    { test: "HbA1c", value: "7.2%", range: "<5.7%", status: "high" },
    { test: "Total Cholesterol", value: "238 mg/dL", range: "<200", status: "high" },
    { test: "HDL Cholesterol", value: "38 mg/dL", range: ">40", status: "low" },
    { test: "LDL Cholesterol", value: "162 mg/dL", range: "<100", status: "high" },
    { test: "Triglycerides", value: "190 mg/dL", range: "<150", status: "high" },
    { test: "Serum Creatinine", value: "0.9 mg/dL", range: "0.7–1.3", status: "normal" },
    { test: "SGPT (ALT)", value: "34 U/L", range: "7–56", status: "normal" },
    { test: "TSH", value: "3.8 mIU/L", range: "0.4–4.0", status: "normal" },
  ],
  summary:
    "Blood report shows elevated fasting glucose (142 mg/dL) and HbA1c (7.2%), indicating poorly controlled Type 2 Diabetes Mellitus. Lipid profile is deranged with high LDL (162), low HDL (38), and borderline triglycerides (190), suggesting significant cardiovascular risk. Mildly elevated WBC count warrants monitoring. Renal and liver function are normal.",
};

const MOCK_INSIGHTS = {
  riskAlerts: [
    {
      severity: "high",
      title: "Cardiovascular Risk – Metabolic Syndrome Pattern",
      detail:
        "Combination of high HbA1c (7.2%), elevated LDL (162), low HDL (38), and high triglycerides (190) constitutes metabolic syndrome. ACC/AHA guidelines recommend statin therapy initiation.",
    },
    {
      severity: "high",
      title: "Uncontrolled Diabetes – HbA1c Above Target",
      detail:
        "HbA1c of 7.2% is above the ADA target of <7%. Current anti-diabetic regimen may need intensification. Consider adding SGLT2 inhibitor for dual cardio-renal benefit.",
    },
    {
      severity: "medium",
      title: "Leukocytosis – Mild Elevation",
      detail:
        "WBC count 11,200/μL is marginally above reference range. Could indicate subclinical infection, stress response, or steroid use. Repeat if persistent.",
    },
  ],
  recommendations: [
    "Schedule cardiology consultation for comprehensive cardiovascular risk assessment",
    "Consider adding Atorvastatin 20mg for LDL management (target <70 mg/dL given diabetes)",
    "Review current diabetes medications – HbA1c goal <7% per ADA 2026 guidelines",
    "Dietary counseling: Mediterranean diet pattern shown to improve lipid profile and glycemic control",
    "Repeat CBC in 2 weeks to reassess WBC trend",
    "Annual eye examination (diabetic retinopathy screening) and urine microalbumin test",
  ],
  drugInteractions: [],
  trendAnalysis:
    "This is the first uploaded report. Upload previous reports to enable longitudinal trend tracking of glucose, HbA1c, and lipid levels over time.",
};

const MOCK_CHAT_RESPONSES = [
  "Based on your uploaded blood report from February 28, 2026, your **HbA1c is 7.2%**, which indicates your average blood sugar over the past 3 months has been above the recommended target of <7%. Your fasting blood sugar was also elevated at **142 mg/dL** (normal: 70–100). This suggests your current diabetes management plan may need adjustment. I'd recommend discussing SGLT2 inhibitor addition with your endocrinologist, as these medications offer both glucose-lowering and cardioprotective benefits.",
  "Your lipid profile shows a concerning pattern:\n\n• **Total Cholesterol:** 238 mg/dL (high)\n• **LDL ('bad' cholesterol):** 162 mg/dL (should be <100 with diabetes)\n• **HDL ('good' cholesterol):** 38 mg/dL (too low, target >40)\n• **Triglycerides:** 190 mg/dL (borderline high)\n\nGiven your diabetes, the **ACC/AHA guidelines strongly recommend statin therapy** to reduce cardiovascular risk. A Mediterranean-style diet and 150 min/week of moderate exercise can also significantly improve these numbers.",
  "Looking at the overall picture from your report, your **kidney function (creatinine 0.9)** and **liver function (SGPT 34)** are both within normal limits – that's reassuring. Your **thyroid (TSH 3.8)** is also normal. The main areas needing attention are your **blood sugar control** and **cholesterol levels**. I'd prioritize getting your HbA1c below 7% and your LDL below 100 mg/dL within the next 3–6 months.",
];

// --- NOVA API FUNCTIONS ---

export async function analyzeDocument(imageBase64, mimeType) {
  if (isDemoMode) {
    await new Promise((r) => setTimeout(r, 1500));
    return MOCK_EXTRACTION;
  }

  const payload = {
    messages: [
      {
        role: "user",
        content: [
          {
            image: {
              format: mimeType.split("/")[1] || "png",
              source: { bytes: imageBase64 },
            },
          },
          {
            text: `You are a medical document intelligence AI. Analyze this medical document image and extract ALL information in the following JSON format. Be thorough and accurate.

{
  "documentType": "type of document (e.g., Blood Test Report, Prescription, Discharge Summary, X-ray)",
  "patientName": "patient name if visible",
  "date": "date in YYYY-MM-DD format",
  "facility": "hospital/lab name",
  "findings": [
    { "test": "test name", "value": "result value", "range": "reference range", "status": "normal|high|low|critical" }
  ],
  "summary": "A comprehensive clinical summary of the document findings, written at a medical professional level"
}

Return ONLY valid JSON, no markdown.`,
          },
        ],
      },
    ],
    inferenceConfig: {
      maxTokens: 4096,
      temperature: 0.1,
    },
  };

  const command = new InvokeModelCommand({
    modelId: "amazon.nova-lite-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  const text = result.output?.message?.content?.[0]?.text || "";

  try {
    return JSON.parse(text);
  } catch {
    return { documentType: "Unknown", summary: text, findings: [] };
  }
}

export async function generateInsights(extractedData) {
  if (isDemoMode) {
    await new Promise((r) => setTimeout(r, 1000));
    return MOCK_INSIGHTS;
  }

  const payload = {
    messages: [
      {
        role: "user",
        content: [
          {
            text: `You are an expert clinical decision support AI. Based on the following extracted medical data, generate clinical insights in JSON format.

Medical Data:
${JSON.stringify(extractedData, null, 2)}

Return JSON in this format:
{
  "riskAlerts": [{ "severity": "high|medium|low", "title": "alert title", "detail": "detailed explanation with evidence-based guidelines" }],
  "recommendations": ["actionable recommendation 1", "recommendation 2"],
  "drugInteractions": [{ "drugs": ["drug1", "drug2"], "severity": "major|moderate|minor", "detail": "interaction details" }],
  "trendAnalysis": "analysis of trends if multiple reports available, otherwise state this is the first report"
}

Return ONLY valid JSON.`,
          },
        ],
      },
    ],
    inferenceConfig: {
      maxTokens: 4096,
      temperature: 0.2,
    },
  };

  const command = new InvokeModelCommand({
    modelId: "amazon.nova-lite-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  const text = result.output?.message?.content?.[0]?.text || "";

  try {
    return JSON.parse(text);
  } catch {
    return { riskAlerts: [], recommendations: [text], drugInteractions: [], trendAnalysis: "" };
  }
}

export async function chatWithHistory(question, medicalContext, chatHistory) {
  if (isDemoMode) {
    await new Promise((r) => setTimeout(r, 800));
    const idx = chatHistory.length % MOCK_CHAT_RESPONSES.length;
    return MOCK_CHAT_RESPONSES[idx];
  }

  const systemPrompt = `You are NovaDoc, an AI medical assistant. You have access to the patient's medical records and answer questions about their health data with clinical accuracy. Always cite specific values from the records. Be helpful but remind the patient to consult their healthcare provider for medical decisions.

Patient Medical Records:
${JSON.stringify(medicalContext, null, 2)}`;

  const messages = [
    ...chatHistory.map((m) => ({
      role: m.role,
      content: [{ text: m.content }],
    })),
    { role: "user", content: [{ text: question }] },
  ];

  const payload = {
    system: [{ text: systemPrompt }],
    messages,
    inferenceConfig: {
      maxTokens: 2048,
      temperature: 0.3,
    },
  };

  const command = new InvokeModelCommand({
    modelId: "amazon.nova-lite-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.output?.message?.content?.[0]?.text || "I couldn't process that request.";
}
