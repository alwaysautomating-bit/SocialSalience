import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const SANDBOX_SOCIAL_SIGNALS = [
  {
    id: "recSandbox1",
    signal: "I spent 4 hours yesterday manually migrating customer invoices in Google Sheets because our CRM doesn't sync when payment fails. It feels like we are on a treadmill compiling data rather than doing real client support.",
    topic: "Invoice Processing Automation",
    painPoint: "Manual invoice compilation and data entry duplication when CRM sync fails.",
    sourcePlatform: "LinkedIn",
    sourceLink: "https://linkedin.com/feed",
    languageUsed: "compiling data, spent 4 hours, invoice manually, CRM treadmill",
    signalStrength: 4,
    dateCaptured: "2026-05-20"
  },
  {
    id: "recSandbox2",
    signal: "No matter how many times I tell our on-site plumbers to take photos before starting work, they always forget. So we have no evidence when the customer claims the damage was already there. I tried building an tracking dashboard in Notion but nobody's using it.",
    topic: "Field Service Quality Control",
    painPoint: "Field technicians forgetting to capture pre-work proof; failed tracking compliance.",
    sourcePlatform: "Reddit",
    sourceLink: "https://reddit.com/r/plumbing",
    languageUsed: "always forget, no evidence, nobody's using it",
    signalStrength: 5,
    dateCaptured: "2026-05-19"
  },
  {
    id: "recSandbox3",
    signal: "Most AI agents we tried just hallucinate. They give long answers that read well but don't translate to a specific next step. We tried deploying an autonomous agent that directly schedules customer visits and it booked a technician three times on the same slot.",
    topic: "AI Agent Implementation",
    painPoint: "Over-trusting complex autonomous agents for scheduling, leading to coordination chaos.",
    sourcePlatform: "X",
    sourceLink: "https://x.com",
    languageUsed: "hallucinate, double booking, autonomous agent failed, scheduling slot",
    signalStrength: 4,
    dateCaptured: "2026-05-18"
  },
  {
    id: "recSandbox4",
    signal: "Our bank account got cleaned out because an automated bot approved a payout to a vendor email spoof. The accounting team just saw 'invoice approved' in the workflow and authorized it immediately. There was no real validation.",
    topic: "Payment Fraud & Security",
    painPoint: "Automated approvals without identity verification against vendor master records.",
    sourcePlatform: "YouTube",
    sourceLink: "https://youtube.com",
    languageUsed: "bank got cleaned, vendor spoof, automated bot approved",
    signalStrength: 5,
    dateCaptured: "2026-05-17"
  }
];

const SANDBOX_AUDIENCES = [
  {
    id: "audSandbox1",
    name: "Operations Managers",
    description: "Mid-market ops leaders managing field teams or workflows.",
    painPoints: "Manual coordination overhead, compliance failures, missed approvals",
    languageStyle: "Direct, systems-focused, prefers checklists and process language",
    cares: "Reducing rework, audit trails, accountability",
    resists: "Buzzword-heavy AI pitches, vague promises",
    exampleHooks: "Your team is following the wrong checklist and you won't know until it's too late."
  },
  {
    id: "audSandbox2",
    name: "SMB Founders",
    description: "Small business owners running 5–50 person service operations.",
    painPoints: "Cash flow surprises, team accountability, doing too many jobs at once",
    languageStyle: "Plain language, story-first, risk-aware, practical",
    cares: "Saving time, protecting money, not being embarrassed by their systems",
    resists: "Complexity, long implementation timelines, anything that requires IT",
    exampleHooks: "I almost got defrauded because my software approved a payment I didn't see."
  },
  {
    id: "audSandbox3",
    name: "AI-Curious Operators",
    description: "Technical operators exploring how AI fits into real workflows.",
    painPoints: "Over-automating, hallucinating agents, unpredictable AI behavior in production",
    languageStyle: "Technical but skeptical, prefers honest trade-offs over hype",
    cares: "Reliability, predictability, appropriate automation scope",
    resists: "Hype, autonomy theater, black-box decisions",
    exampleHooks: "The agent scheduled three appointments in the same slot. Here's why it happens and how to prevent it."
  }
];

const getAirtableConfig = () => {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID || "appjGfq4FGNbbd5Ap";
  const tableSocial = process.env.AIRTABLE_TABLE_SOCIAL_SIGNALS || "tblGAMmNNRpr14aDB";
  const tableConnections = process.env.AIRTABLE_TABLE_CONNECTIONS || "tblIbhMuEAci9TYQl";
  const tableAudiences = process.env.AIRTABLE_TABLE_AUDIENCES || "tblEhbCol2AAO3Lwc";
  const tablePostDrafts = process.env.AIRTABLE_TABLE_POST_DRAFTS || "tblXBsDqdyRpI50Yz";
  return {
    isConfigured: !!apiKey && apiKey.trim() !== "" && apiKey !== "MY_AIRTABLE_API_KEY",
    apiKey,
    baseId,
    tableSocial,
    tableConnections,
    tableAudiences,
    tablePostDrafts
  };
};

const SIGNAL_FIELDS = {
  signal:         process.env.AIRTABLE_FIELD_SIGNAL                  || "fldpnrIJFTCikox3A",
  connections:    process.env.AIRTABLE_FIELD_SIGNAL_CONNECTIONS       || "flduhkW2UNpKPbO8Z",
  topic:          process.env.AIRTABLE_FIELD_SIGNAL_TOPIC             || "flduNi6ttv9SuK1ZT",
  painPoint:      process.env.AIRTABLE_FIELD_SIGNAL_PAIN_POINT        || "fldDWZAzsB1njgLHX",
  sourceLink:     process.env.AIRTABLE_FIELD_SIGNAL_SOURCE_LINK       || "fldoO89AlVfKXNFul",
  sourcePlatform: process.env.AIRTABLE_FIELD_SIGNAL_SOURCE_PLATFORM   || "fld8K6x20GEzXd09C",
  languageUsed:   process.env.AIRTABLE_FIELD_SIGNAL_LANGUAGE_USED     || "fldl3ZRXRzLdpjdu5",
  dateCaptured:   process.env.AIRTABLE_FIELD_SIGNAL_DATE_CAPTURED     || "fld2eAy6hqMhyiIFE",
  signalStrength: process.env.AIRTABLE_FIELD_SIGNAL_STRENGTH          || "fldPka3Ne2f5P9FsL",
};

const AUDIENCE_FIELDS = {
  name:          process.env.AIRTABLE_FIELD_AUDIENCE_NAME           || "fldWRHCxTHCnb1Jzl",
  description:   process.env.AIRTABLE_FIELD_AUDIENCE_DESCRIPTION    || "fld1GF8MYudfGtGb5",
  painPoints:    process.env.AIRTABLE_FIELD_AUDIENCE_PAIN_POINTS    || "fldOP4FmonczkBrJX",
  languageStyle: process.env.AIRTABLE_FIELD_AUDIENCE_LANGUAGE_STYLE || "fldkF0xqC8j1GvsXq",
  cares:         process.env.AIRTABLE_FIELD_AUDIENCE_CARES          || "fldmIbrk81PNUd4P1",
  resists:       process.env.AIRTABLE_FIELD_AUDIENCE_RESISTS        || "fld3Nl3IEE9Fbmx4c",
  exampleHooks:  process.env.AIRTABLE_FIELD_AUDIENCE_EXAMPLE_HOOKS  || "fldzfFZMJ7El0OtJK",
};

const POST_FIELDS = {
  postId:      process.env.AIRTABLE_FIELD_POST_ID           || "fldene0t8B1SLJxEM",
  connection:  process.env.AIRTABLE_FIELD_POST_CONNECTION   || "fldaKeA1VCv6IN9cc",
  audience:    process.env.AIRTABLE_FIELD_POST_AUDIENCE     || "fldqO9b0JAo69sSst",
  platform:    process.env.AIRTABLE_FIELD_POST_PLATFORM     || "fldB8jjFnvn2oPJTK",
  hook:        process.env.AIRTABLE_FIELD_POST_HOOK         || "fldqsyFYJ775brt5t",
  draft:       process.env.AIRTABLE_FIELD_POST_DRAFT        || "fldIfsSCs43xUYSNY",
  cta:         process.env.AIRTABLE_FIELD_POST_CTA          || "fldRtyGVNAKhgtcmN",
  batchName:   process.env.AIRTABLE_FIELD_POST_BATCH_NAME   || "fldSbkB1pZ64s3cD9",
  createdDate: process.env.AIRTABLE_FIELD_POST_CREATED_DATE || "fldBifDkD5PPlwDM6",
};

const CONN_FIELDS = {
  name:            process.env.AIRTABLE_FIELD_CONNECTION_NAME             || "fldzLib73pSnkxnbM",
  externalSignal:  process.env.AIRTABLE_FIELD_CONNECTION_EXTERNAL_SIGNAL  || "fldHugYLExsw1uvfr",
  why:             process.env.AIRTABLE_FIELD_CONNECTION_WHY              || "fldHWsPwLDpPjPhQp",
  gap:             process.env.AIRTABLE_FIELD_CONNECTION_GAP              || "fldE40w0468VShv1v",
  angle:           process.env.AIRTABLE_FIELD_CONNECTION_ANGLE            || "fldNikzBPxsqOeXI1",
  outputType:      process.env.AIRTABLE_FIELD_CONNECTION_OUTPUT_TYPE      || "fldP4kX01LMPTNPXv",
  reviewStatus:    process.env.AIRTABLE_FIELD_CONNECTION_REVIEW_STATUS    || "fldZhJOlyHKIQa1ad",
  internalInsight: process.env.AIRTABLE_FIELD_CONNECTION_INTERNAL_INSIGHT || "fldQz8PzvAm3FQrOe",
  insightUrl:      process.env.AIRTABLE_FIELD_CONNECTION_INSIGHT_URL      || "fldlv4IrB92IGnuSI",
  strength:        process.env.AIRTABLE_FIELD_CONNECTION_STRENGTH         || "fldOxabDnzhuHMD2c",
  draftBrief:      process.env.AIRTABLE_FIELD_CONNECTION_DRAFT_BRIEF      || "fld1LhHeaehEfSekv",
};

function normalizeSignalRecord(rec: any): Record<string, any> {
  const f = rec.fields || {};
  const pick = (id: string, ...names: string[]): any => {
    if (f[id] !== undefined && f[id] !== null && f[id] !== "") return f[id];
    for (const name of names) {
      if (f[name] !== undefined && f[name] !== null && f[name] !== "") return f[name];
    }
    return undefined;
  };
  return {
    id: rec.id,
    signal:         pick(SIGNAL_FIELDS.signal,         "Signal", "Signal Text", "External Signal") || "",
    connections:    pick(SIGNAL_FIELDS.connections,    "Connections") || [],
    topic:          pick(SIGNAL_FIELDS.topic,          "Topic", "Focus Topic") || "",
    painPoint:      pick(SIGNAL_FIELDS.painPoint,      "Pain Point", "Operator Pain Point") || "",
    sourceLink:     pick(SIGNAL_FIELDS.sourceLink,     "Source Link", "Link", "URL") || "",
    sourcePlatform: pick(SIGNAL_FIELDS.sourcePlatform, "Source Platform", "Platform") || "",
    languageUsed:   pick(SIGNAL_FIELDS.languageUsed,   "Language Used", "Language", "Jargon") || "",
    dateCaptured:   pick(SIGNAL_FIELDS.dateCaptured,   "Date Captured", "Date", "Captured Date") || "",
    signalStrength: pick(SIGNAL_FIELDS.signalStrength, "Signal Strength", "Strength") || "",
  };
}

async function generatePostId(apiKey: string, baseId: string, tablePostDrafts: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `POST-${year}-`;
  try {
    const url = `https://api.airtable.com/v0/${baseId}/${tablePostDrafts}?fields[]=${POST_FIELDS.postId}&returnFieldsByFieldId=true&maxRecords=500`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    let maxSeq = 0;
    for (const rec of (data.records || [])) {
      const id: string = rec.fields?.[POST_FIELDS.postId] || "";
      if (id.startsWith(prefix)) {
        const seq = parseInt(id.slice(prefix.length), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
  } catch {
    return `${prefix}${String(Date.now() % 9000 + 1000)}`;
  }
}

// GET /api/configured
app.get("/api/configured", (req, res) => {
  const airtable = getAirtableConfig();
  const geminiKey = process.env.GEMINI_API_KEY;
  res.json({
    airtableConfigured: airtable.isConfigured,
    geminiConfigured: !!geminiKey && geminiKey.trim() !== "" && geminiKey !== "MY_GEMINI_API_KEY",
    baseId: airtable.baseId
  });
});

// GET /api/signals
app.get("/api/signals", async (req, res) => {
  const config = getAirtableConfig();
  if (!config.isConfigured) {
    return res.json({ success: true, mode: "sandbox", signals: SANDBOX_SOCIAL_SIGNALS });
  }
  try {
    const url = `https://api.airtable.com/v0/${config.baseId}/${config.tableSocial}?maxRecords=50&view=Grid%20view&returnFieldsByFieldId=true`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${config.apiKey}` } });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${errText}`);
    }
    const data = await response.json();
    const signals = data.records.map((rec: any) => normalizeSignalRecord(rec));
    res.json({ success: true, mode: "live", signals });
  } catch (error: any) {
    console.error("[Airtable] Error fetching signals:", error);
    res.status(500).json({ success: false, error: error.message, mode: "sandbox", signals: SANDBOX_SOCIAL_SIGNALS });
  }
});

// POST /api/suggest-connections
app.post("/api/suggest-connections", async (req, res) => {
  const { signal, insights } = req.body;
  if (!signal) return res.status(400).json({ success: false, error: "External signal text is required" });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.trim() === "" || geminiKey === "MY_GEMINI_API_KEY") {
    return res.status(400).json({ success: false, error: "GEMINI_API_KEY is not configured." });
  }

  try {
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: geminiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
    const insightsText = Array.isArray(insights) ? insights.join("\n") : String(insights);

    const promptText = `You are helping find meaningful collisions between external market signals and internal doctrine.

External signal:
${signal}

Internal insights:
${insightsText}

Return 3 to 5 possible connections.

For each connection return JSON with:
- connection_name
- matched_insight_title
- connection_type: Validates, Contradicts, Extends, Challenges, or Names
- why_it_connects
- gap_opportunity
- suggested_angle
- strength_score from 1 to 5
- draft_brief

Only suggest a connection if there is a meaningful conceptual relationship.
Do not match by keyword alone.
Prefer strong, useful collisions over many weak matches.
The tone should be clear, sharp, practical, and grounded in operational systems thinking.
Do not write a full social post yet.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              connection_name:      { type: Type.STRING },
              matched_insight_title:{ type: Type.STRING },
              connection_type:      { type: Type.STRING },
              why_it_connects:      { type: Type.STRING },
              gap_opportunity:      { type: Type.STRING },
              suggested_angle:      { type: Type.STRING },
              strength_score:       { type: Type.INTEGER },
              draft_brief:          { type: Type.STRING }
            },
            required: ["connection_name","matched_insight_title","connection_type","why_it_connects","gap_opportunity","suggested_angle","strength_score","draft_brief"]
          }
        }
      }
    });

    let rawText = (response.text || "[]").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let suggestions: any[];
    try {
      suggestions = JSON.parse(rawText);
      if (!Array.isArray(suggestions)) suggestions = [suggestions];
    } catch {
      throw new Error("Gemini returned a non-JSON response.");
    }
    res.json({ success: true, suggestions });
  } catch (err: any) {
    console.error("[Gemini] Error:", err);
    res.status(500).json({ success: false, error: "Gemini execution failed: " + err.message });
  }
});

// POST /api/connections
app.post("/api/connections", async (req, res) => {
  const { connection, signalId } = req.body;
  if (!connection) return res.status(400).json({ success: false, error: "Connection object is required" });

  const config = getAirtableConfig();
  if (!config.isConfigured) {
    return res.json({
      success: true, mode: "sandbox",
      message: "Approved in sandbox mode.",
      recordId: "recApproved" + Math.random().toString(36).substring(7),
      record: connection
    });
  }

  try {
    const isSandboxSignal = signalId && signalId.startsWith("recSandbox");
    const airtableFields: Record<string, any> = {
      [CONN_FIELDS.name]:            connection.connection_name,
      [CONN_FIELDS.externalSignal]:  isSandboxSignal ? [] : [signalId],
      [CONN_FIELDS.why]:             connection.why_it_connects,
      [CONN_FIELDS.gap]:             connection.gap_opportunity,
      [CONN_FIELDS.angle]:           connection.suggested_angle,
      [CONN_FIELDS.outputType]:      "LinkedIn Post",
      [CONN_FIELDS.reviewStatus]:    "Approved",
      [CONN_FIELDS.internalInsight]: connection.matched_insight_title,
      [CONN_FIELDS.insightUrl]:      "",
      [CONN_FIELDS.strength]:        Number(connection.strength_score) || 3,
      [CONN_FIELDS.draftBrief]:      connection.draft_brief,
    };

    const url = `https://api.airtable.com/v0/${config.baseId}/${config.tableConnections}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: airtableFields })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Airtable POST failed: ${response.status} - ${errText}`);
    }
    const createdRecord = await response.json();
    res.json({ success: true, mode: "live", recordId: createdRecord.id, record: createdRecord.fields });
  } catch (error: any) {
    console.error("[Airtable] Error creating connection:", error);
    res.status(500).json({ success: false, error: "Failed to write connection: " + error.message });
  }
});

// GET /api/audiences
app.get("/api/audiences", async (req, res) => {
  const config = getAirtableConfig();
  if (!config.isConfigured) {
    return res.json({ success: true, mode: "sandbox", audiences: SANDBOX_AUDIENCES });
  }
  try {
    const url = `https://api.airtable.com/v0/${config.baseId}/${config.tableAudiences}?maxRecords=50&returnFieldsByFieldId=true`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${config.apiKey}` } });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Airtable audiences error: ${response.status} - ${errText}`);
    }
    const data = await response.json();
    const audiences = (data.records || []).map((rec: any) => {
      const f = rec.fields || {};
      const pick = (id: string, ...names: string[]): any => {
        if (f[id] !== undefined && f[id] !== null && f[id] !== "") return f[id];
        for (const name of names) {
          if (f[name] !== undefined && f[name] !== null && f[name] !== "") return f[name];
        }
        return undefined;
      };
      return {
        id: rec.id,
        name:          pick(AUDIENCE_FIELDS.name, "Name", "Audience Name") || "",
        description:   pick(AUDIENCE_FIELDS.description, "Description") || "",
        painPoints:    pick(AUDIENCE_FIELDS.painPoints, "Pain Points") || "",
        languageStyle: pick(AUDIENCE_FIELDS.languageStyle, "Language Style") || "",
        cares:         pick(AUDIENCE_FIELDS.cares, "Cares") || "",
        resists:       pick(AUDIENCE_FIELDS.resists, "Resists") || "",
        exampleHooks:  pick(AUDIENCE_FIELDS.exampleHooks, "Example Hooks") || "",
      };
    });
    if (audiences.length === 0) {
      return res.json({ success: true, mode: "sandbox", audiences: SANDBOX_AUDIENCES });
    }
    res.json({ success: true, mode: "live", audiences });
  } catch (error: any) {
    console.error("[Airtable] Error fetching audiences:", error);
    res.json({ success: true, mode: "sandbox", audiences: SANDBOX_AUDIENCES });
  }
});

// POST /api/generate-drafts
app.post("/api/generate-drafts", async (req, res) => {
  const { connection, audiences } = req.body;
  if (!connection) return res.status(400).json({ success: false, error: "Connection is required" });
  if (!Array.isArray(audiences) || audiences.length === 0) return res.status(400).json({ success: false, error: "At least one audience is required" });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.trim() === "" || geminiKey === "MY_GEMINI_API_KEY") {
    return res.status(400).json({ success: false, error: "GEMINI_API_KEY is not configured." });
  }

  try {
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: geminiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });

    const audiencesText = audiences.map((a: any) => `
--- ${a.name} (ID: ${a.id}) ---
Description: ${a.description || "N/A"}
Pain Points: ${a.painPoints || "N/A"}
Language Style: ${a.languageStyle || "N/A"}
Cares About: ${a.cares || "N/A"}
Resists: ${a.resists || "N/A"}
Example Hook Style: ${a.exampleHooks || "N/A"}`).join("\n");

    const promptText = `You are generating audience-tuned post drafts for an approved content collision.

Approved Connection:
- Name: ${connection.connection_name}
- Matched Internal Insight: ${connection.matched_insight_title}
- Connection Type: ${connection.connection_type}
- Why It Connects: ${connection.why_it_connects}
- Gap / Opportunity: ${connection.gap_opportunity}
- Suggested Angle: ${connection.suggested_angle}
- Draft Brief: ${connection.draft_brief}

Target Audiences:
${audiencesText}

Instructions:
For each audience above, generate exactly 2 post drafts using different platforms (LinkedIn, X (Twitter), or Newsletter).
Each draft must:
- Speak directly to that audience's pain points and language style
- Preserve the core claim of the approved angle — do not dilute or reframe the doctrine
- Lead with a sharp hook specific to that audience's frame of reference
- Be platform-appropriate in length (LinkedIn: 150–300 words, X: under 280 chars, Newsletter: 200–400 words)
- Include a clear, specific, non-generic CTA

Return an array of ${audiences.length * 2} post draft objects.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              audience_id:          { type: Type.STRING },
              audience_name:        { type: Type.STRING },
              platform:             { type: Type.STRING },
              hook:                 { type: Type.STRING },
              post_draft:           { type: Type.STRING },
              cta:                  { type: Type.STRING },
              why_this_angle_works: { type: Type.STRING }
            },
            required: ["audience_id","audience_name","platform","hook","post_draft","cta","why_this_angle_works"]
          }
        }
      }
    });

    let rawText = (response.text || "[]").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let drafts: any[];
    try {
      drafts = JSON.parse(rawText);
      if (!Array.isArray(drafts)) drafts = [drafts];
    } catch {
      throw new Error("Gemini returned a non-JSON response for draft generation.");
    }
    res.json({ success: true, drafts });
  } catch (err: any) {
    console.error("[Gemini] Draft generation error:", err);
    res.status(500).json({ success: false, error: "Draft generation failed: " + err.message });
  }
});

// POST /api/post-drafts
app.post("/api/post-drafts", async (req, res) => {
  const { draft, connectionRecordId, audienceRecordId, batchName } = req.body;
  if (!draft) return res.status(400).json({ success: false, error: "Draft is required" });

  const config = getAirtableConfig();
  if (!config.isConfigured) {
    const sandboxPostId = `POST-${new Date().getFullYear()}-${String(Date.now() % 9000 + 1000)}`;
    return res.json({ success: true, mode: "sandbox", recordId: "recDraft" + Math.random().toString(36).substring(7), postId: sandboxPostId });
  }

  try {
    const isSandboxConnection = !connectionRecordId || connectionRecordId.startsWith("recSandbox") || connectionRecordId.startsWith("recApproved");
    const isSandboxAudience = !audienceRecordId || audienceRecordId.startsWith("audSandbox");

    const postId = await generatePostId(config.apiKey!, config.baseId, config.tablePostDrafts);
    const fields: Record<string, any> = {
      [POST_FIELDS.postId]:   postId,
      [POST_FIELDS.platform]: draft.platform,
      [POST_FIELDS.hook]:     draft.hook,
      [POST_FIELDS.draft]:    draft.post_draft,
      [POST_FIELDS.cta]:      draft.cta,
    };
    if (!isSandboxConnection) fields[POST_FIELDS.connection] = [connectionRecordId];
    if (!isSandboxAudience) fields[POST_FIELDS.audience] = [audienceRecordId];
    if (batchName) fields[POST_FIELDS.batchName] = batchName;

    const url = `https://api.airtable.com/v0/${config.baseId}/${config.tablePostDrafts}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Airtable POST drafts failed: ${response.status} - ${errText}`);
    }
    const created = await response.json();
    console.log(`[Airtable] Post draft saved: ${created.id} — ${postId}`);
    res.json({ success: true, mode: "live", recordId: created.id, postId });
  } catch (error: any) {
    console.error("[Airtable] Error saving post draft:", error);
    res.status(500).json({ success: false, error: "Failed to save draft: " + error.message });
  }
});

export default app;
