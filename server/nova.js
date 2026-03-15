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

// --- DRUG INTERACTION DATABASE (curated for demo) ---
const DRUG_INTERACTIONS = [
  { drugs: ["Metformin", "Atorvastatin"], severity: "minor", detail: "Co-administration is generally safe and common in diabetic patients. Monitor liver function periodically." },
  { drugs: ["Metformin", "Insulin"], severity: "moderate", detail: "Concurrent use increases hypoglycemia risk. Regular blood glucose monitoring recommended. Adjust doses based on HbA1c targets." },
  { drugs: ["Atorvastatin", "Amlodipine"], severity: "moderate", detail: "Amlodipine may increase atorvastatin levels. Limit atorvastatin dose to 20mg when combined. Monitor for myopathy symptoms." },
  { drugs: ["Aspirin", "Clopidogrel"], severity: "major", detail: "Dual antiplatelet therapy increases bleeding risk significantly. Only combine under cardiologist supervision post-stenting or ACS." },
  { drugs: ["Metformin", "Contrast Dye"], severity: "major", detail: "Hold Metformin 48 hours before and after IV contrast procedures. Risk of lactic acidosis. Resume only after confirming normal renal function." },
  { drugs: ["Ramipril", "Spironolactone"], severity: "major", detail: "Both drugs increase potassium. Combination raises hyperkalemia risk – can cause fatal cardiac arrhythmias. Monitor K+ levels within 1 week of starting." },
  { drugs: ["Glimepiride", "Fluconazole"], severity: "major", detail: "Fluconazole inhibits CYP2C9, dramatically increasing glimepiride levels. Severe hypoglycemia risk. Use alternative antifungal or halve glimepiride dose." },
  { drugs: ["Warfarin", "Aspirin"], severity: "major", detail: "Massive increase in bleeding risk. GI hemorrhage probability increases 2-3x. Requires INR monitoring every 1-2 weeks." },
  { drugs: ["SGLT2 inhibitor", "Furosemide"], severity: "moderate", detail: "Both drugs cause diuresis. Combined volume depletion risk, especially in elderly. Monitor blood pressure and hydration status." },
  { drugs: ["Pantoprazole", "Clopidogrel"], severity: "moderate", detail: "PPIs reduce clopidogrel activation via CYP2C19 inhibition. Consider switching to famotidine for gastroprotection." },
];

// --- DEMO MODE MOCK RESPONSES ---
const MOCK_EXTRACTION = {
  documentType: "Blood Test Report",
  patientName: "Rajesh Kumar",
  date: "2026-02-28",
  facility: "Apollo Diagnostics, New Delhi",
  medications: ["Metformin 500mg", "Atorvastatin 10mg", "Aspirin 75mg"],
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
      detail: "Combination of high HbA1c (7.2%), elevated LDL (162), low HDL (38), and high triglycerides (190) constitutes metabolic syndrome. ACC/AHA guidelines recommend statin therapy initiation.",
    },
    {
      severity: "high",
      title: "Uncontrolled Diabetes – HbA1c Above Target",
      detail: "HbA1c of 7.2% is above the ADA target of <7%. Current anti-diabetic regimen may need intensification. Consider adding SGLT2 inhibitor for dual cardio-renal benefit.",
    },
    {
      severity: "medium",
      title: "Leukocytosis – Mild Elevation",
      detail: "WBC count 11,200/μL is marginally above reference range. Could indicate subclinical infection, stress response, or steroid use. Repeat if persistent.",
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
  trendAnalysis: "This is the first uploaded report. Upload previous reports to enable longitudinal trend tracking of glucose, HbA1c, and lipid levels over time.",
};

// Hindi translations of insights
const MOCK_INSIGHTS_HI = {
  riskAlerts: [
    {
      severity: "high",
      title: "हृदय रोग का खतरा – मेटाबोलिक सिंड्रोम",
      detail: "HbA1c (7.2%), बढ़ा हुआ LDL (162), कम HDL (38), और उच्च ट्राइग्लिसराइड्स (190) का संयोजन मेटाबोलिक सिंड्रोम है। ACC/AHA दिशानिर्देश स्टैटिन थेरेपी शुरू करने की सलाह देते हैं।",
    },
    {
      severity: "high",
      title: "अनियंत्रित मधुमेह – HbA1c लक्ष्य से ऊपर",
      detail: "HbA1c 7.2% है जो ADA लक्ष्य <7% से ऊपर है। मधुमेह की दवाइयों को बढ़ाने की जरूरत हो सकती है। SGLT2 इनहिबिटर जोड़ने पर विचार करें।",
    },
    {
      severity: "medium",
      title: "ल्यूकोसाइटोसिस – हल्की वृद्धि",
      detail: "WBC काउंट 11,200/μL सामान्य सीमा से थोड़ा ऊपर है। संक्रमण, तनाव, या स्टेरॉयड के कारण हो सकता है। लगातार रहने पर दोबारा जांच करें।",
    },
  ],
  recommendations: [
    "हृदय रोग विशेषज्ञ से मिलें – व्यापक हृदय जोखिम मूल्यांकन के लिए",
    "Atorvastatin 20mg जोड़ने पर विचार करें – LDL लक्ष्य <70 mg/dL (मधुमेह में)",
    "मधुमेह की दवाइयों की समीक्षा करें – ADA 2026 दिशानिर्देश अनुसार HbA1c <7%",
    "आहार परामर्श: भूमध्यसागरीय आहार पैटर्न लिपिड प्रोफाइल और ग्लाइसेमिक नियंत्रण में सुधार करता है",
    "2 सप्ताह में CBC दोबारा करें – WBC प्रवृत्ति का आकलन करने के लिए",
    "वार्षिक नेत्र परीक्षा (डायबिटिक रेटिनोपैथी स्क्रीनिंग) और यूरिन माइक्रोएल्ब्यूमिन टेस्ट",
  ],
  trendAnalysis: "यह पहली अपलोड की गई रिपोर्ट है। ग्लूकोज, HbA1c और लिपिड स्तर की समय-श्रृंखला ट्रैकिंग के लिए पिछली रिपोर्ट अपलोड करें।",
};

const MOCK_CHAT_RESPONSES = [
  "Based on your uploaded blood report from February 28, 2026, your **HbA1c is 7.2%**, which indicates your average blood sugar over the past 3 months has been above the recommended target of <7%. Your fasting blood sugar was also elevated at **142 mg/dL** (normal: 70–100). This suggests your current diabetes management plan may need adjustment. I'd recommend discussing SGLT2 inhibitor addition with your endocrinologist, as these medications offer both glucose-lowering and cardioprotective benefits.",
  "Your lipid profile shows a concerning pattern:\n\n• **Total Cholesterol:** 238 mg/dL (high)\n• **LDL ('bad' cholesterol):** 162 mg/dL (should be <100 with diabetes)\n• **HDL ('good' cholesterol):** 38 mg/dL (too low, target >40)\n• **Triglycerides:** 190 mg/dL (borderline high)\n\nGiven your diabetes, the **ACC/AHA guidelines strongly recommend statin therapy** to reduce cardiovascular risk. A Mediterranean-style diet and 150 min/week of moderate exercise can also significantly improve these numbers.",
  "Looking at the overall picture from your report, your **kidney function (creatinine 0.9)** and **liver function (SGPT 34)** are both within normal limits – that's reassuring. Your **thyroid (TSH 3.8)** is also normal. The main areas needing attention are your **blood sugar control** and **cholesterol levels**. I'd prioritize getting your HbA1c below 7% and your LDL below 100 mg/dL within the next 3–6 months.",
];

const MOCK_CHAT_RESPONSES_HI = [
  "आपकी 28 फरवरी 2026 की रक्त रिपोर्ट के अनुसार, आपका **HbA1c 7.2%** है, जिसका मतलब है कि पिछले 3 महीनों में आपका औसत ब्लड शुगर **लक्ष्य <7% से ऊपर** रहा है। आपका फास्टिंग ब्लड शुगर भी **142 mg/dL** (सामान्य: 70-100) पर बढ़ा हुआ था। मैं SGLT2 इनहिबिटर जोड़ने के बारे में अपने डॉक्टर से बात करने की सलाह दूंगा।",
  "आपकी लिपिड प्रोफाइल चिंताजनक है:\n\n• **कुल कोलेस्ट्रॉल:** 238 mg/dL (अधिक)\n• **LDL ('बुरा' कोलेस्ट्रॉल):** 162 mg/dL (मधुमेह में <100 होना चाहिए)\n• **HDL ('अच्छा' कोलेस्ट्रॉल):** 38 mg/dL (बहुत कम)\n• **ट्राइग्लिसराइड्स:** 190 mg/dL (सीमा-रेखा पर)\n\n**ACC/AHA दिशानिर्देश स्टैटिन थेरेपी की सिफारिश करते हैं।** भूमध्यसागरीय आहार और सप्ताह में 150 मिनट व्यायाम से काफी सुधार हो सकता है।",
  "आपकी रिपोर्ट की समग्र तस्वीर देखें तो **किडनी (क्रिएटिनिन 0.9)** और **लिवर (SGPT 34)** – दोनों सामान्य हैं, यह अच्छी बात है। **थायरॉयड (TSH 3.8)** भी ठीक है। मुख्य चिंता **ब्लड शुगर** और **कोलेस्ट्रॉल** है। अगले 3-6 महीनों में HbA1c <7% और LDL <100 लाना प्राथमिकता होनी चाहिए।",
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
  "medications": ["list of medications mentioned with dosages"],
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
    return { documentType: "Unknown", summary: text, findings: [], medications: [] };
  }
}

export async function generateInsights(extractedData, lang = "en") {
  if (isDemoMode) {
    await new Promise((r) => setTimeout(r, 1000));
    return lang === "hi" ? MOCK_INSIGHTS_HI : MOCK_INSIGHTS;
  }

  const langInstruction = lang === "hi" ? " Respond in Hindi language." : "";

  const payload = {
    messages: [
      {
        role: "user",
        content: [
          {
            text: `You are an expert clinical decision support AI. Based on the following extracted medical data, generate clinical insights in JSON format.${langInstruction}

Medical Data:
${JSON.stringify(extractedData, null, 2)}

Return JSON in this format:
{
  "riskAlerts": [{ "severity": "high|medium|low", "title": "alert title", "detail": "detailed explanation with evidence-based guidelines" }],
  "recommendations": ["actionable recommendation 1", "recommendation 2"],
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
    return { riskAlerts: [], recommendations: [text], trendAnalysis: "" };
  }
}

export async function chatWithHistory(question, medicalContext, chatHistory, lang = "en") {
  if (isDemoMode) {
    await new Promise((r) => setTimeout(r, 800));
    const responses = lang === "hi" ? MOCK_CHAT_RESPONSES_HI : MOCK_CHAT_RESPONSES;
    const idx = chatHistory.length % responses.length;
    return responses[idx];
  }

  const langNote = lang === "hi" ? " Respond in Hindi." : "";

  const systemPrompt = `You are NovaDoc, an AI medical assistant. You have access to the patient's medical records and answer questions about their health data with clinical accuracy. Always cite specific values from the records. Be helpful but remind the patient to consult their healthcare provider for medical decisions.${langNote}

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

// Check drug interactions from medication lists
export function checkDrugInteractions(medications) {
  if (!medications || medications.length === 0) return [];
  
  const normalizedMeds = medications.map(m => m.toLowerCase().replace(/\d+\s*mg/g, '').trim());
  const found = [];
  
  for (const interaction of DRUG_INTERACTIONS) {
    const [drug1, drug2] = interaction.drugs.map(d => d.toLowerCase());
    const hasDrug1 = normalizedMeds.some(m => m.includes(drug1) || drug1.includes(m));
    const hasDrug2 = normalizedMeds.some(m => m.includes(drug2) || drug2.includes(m));
    
    if (hasDrug1 && hasDrug2) {
      found.push(interaction);
    }
  }
  
  // Always show some interactions for demo richness
  if (isDemoMode && found.length === 0 && medications.length >= 2) {
    found.push(DRUG_INTERACTIONS[0]); // Metformin + Atorvastatin
  }
  
  return found;
}

// Compare findings between two documents for trend tracking
export function compareDocuments(docs) {
  if (!docs || docs.length < 2) return null;
  
  const latest = docs[0];
  const previous = docs[docs.length > 2 ? docs.length - 2 : 1];
  
  const latestFindings = latest.extraction?.findings || [];
  const previousFindings = previous.extraction?.findings || [];
  
  const trends = [];
  
  for (const curr of latestFindings) {
    const prev = previousFindings.find(f => f.test === curr.test);
    if (prev) {
      const currVal = parseFloat(curr.value.replace(/[^0-9.]/g, ''));
      const prevVal = parseFloat(prev.value.replace(/[^0-9.]/g, ''));
      
      if (!isNaN(currVal) && !isNaN(prevVal) && currVal !== prevVal) {
        const change = currVal - prevVal;
        const pct = ((change / prevVal) * 100).toFixed(1);
        trends.push({
          test: curr.test,
          previousValue: prev.value,
          currentValue: curr.value,
          change: change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1),
          percentChange: `${pct}%`,
          direction: change > 0 ? "increased" : "decreased",
          status: curr.status,
          improved: (curr.status === "normal" && prev.status !== "normal") || 
                   (curr.status === "normal" && prev.status === "normal"),
        });
      }
    }
  }
  
  return {
    latestDate: latest.extraction?.date,
    previousDate: previous.extraction?.date,
    trends,
    summary: trends.length > 0 
      ? `Compared ${trends.length} parameters between ${previous.extraction?.date} and ${latest.extraction?.date}.`
      : "No comparable parameters found between the two reports.",
  };
}
