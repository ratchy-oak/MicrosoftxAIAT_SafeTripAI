const { TOURIST_SAFETY_AGENT_INSTRUCTIONS } = require("./agentInstructions");

const AZURE_AGENT_TIMEOUT_MS = 15000;

const INCIDENT_TYPES = new Set([
  "scam",
  "accident",
  "crime",
  "lost_item",
  "medical_emergency",
  "transport",
  "immigration",
  "other"
]);
const SEVERITIES = new Set(["low", "medium", "high"]);
const WORKFLOW_STATES = new Set(["guidance", "collect_evidence", "confirm_submit", "submitted"]);
const EVIDENCE_STATUSES = new Set(["none", "partial", "full"]);

async function runAzureFoundryAgent(message) {
  const endpoint = process.env.FOUNDRY_PROJECT_ENDPOINT || process.env.AZURE_AI_PROJECT_ENDPOINT;
  const agentName = process.env.AZURE_AI_AGENT_NAME || process.env.FOUNDRY_AGENT_NAME;

  if (!endpoint || !agentName || process.env.AZURE_AI_USE_AGENT === "false") {
    return null;
  }

  const { AIProjectClient } = await import("@azure/ai-projects");
  const { DefaultAzureCredential } = await import("@azure/identity");

  const project = new AIProjectClient(endpoint, new DefaultAzureCredential());
  const openAIClient = project.getOpenAIClient();

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Azure Foundry Agent timed out")), AZURE_AGENT_TIMEOUT_MS)
  );

  const agentPromise = (async () => {
    const conversation = await openAIClient.conversations.create({
      items: [
        {
          type: "message",
          role: "user",
          content: buildPrompt(message)
        }
      ]
    });

    return openAIClient.responses.create(
      {
        conversation: conversation.id
      },
      {
        body: {
          agent: {
            name: agentName,
            type: "agent_reference"
          }
        }
      }
    );
  })();

  const response = await Promise.race([agentPromise, timeoutPromise]);
  return normalizeAgentResult(extractResponseText(response));
}

function buildPrompt(message) {
  return [
    TOURIST_SAFETY_AGENT_INSTRUCTIONS,
    "",
    "Traveler message:",
    message,
    "",
    "Return JSON only."
  ].join("\n");
}

function extractResponseText(response) {
  if (!response) {
    return "";
  }

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (typeof response.outputText === "string") {
    return response.outputText;
  }

  const chunks = [];
  collectText(response.output, chunks);
  return chunks.join("\n").trim();
}

function collectText(value, chunks) {
  if (!value) {
    return;
  }

  if (typeof value === "string") {
    chunks.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectText(item, chunks);
    }
    return;
  }

  if (typeof value === "object") {
    if ((value.type === "output_text" || value.type === "text") && typeof value.text === "string") {
      chunks.push(value.text);
    }

    collectText(value.content, chunks);
  }
}

function normalizeIncidentType(raw) {
  if (INCIDENT_TYPES.has(raw)) {
    return raw;
  }

  const lower = String(raw || "")
    .toLowerCase()
    .replace(/[\s_\-]/g, "");

  if (/scam|fraud|ripoff|overcharg/.test(lower)) {
    return "scam";
  }

  if (/transport|taxi|tuktuk|vehicle|bus|train|fare/.test(lower)) {
    return "transport";
  }

  if (/crime|rob|steal|assault|attack|theft/.test(lower)) {
    return "crime";
  }

  if (/lost|lostitem|missing/.test(lower)) {
    return "lost_item";
  }

  if (/accident|crash|collide/.test(lower)) {
    return "accident";
  }

  if (/medical|health|sick|hospital|emergency/.test(lower)) {
    return "medical_emergency";
  }

  if (/immigra|visa|overstay|border/.test(lower)) {
    return "immigration";
  }

  return "other";
}

function normalizeAgentResult(text) {
  const parsed = parseJsonFromText(text);

  if (!parsed || typeof parsed.reply !== "string") {
    throw new Error("Azure Foundry Agent did not return the expected JSON shape");
  }

  const incidentType = normalizeIncidentType(parsed.incident_type);
  const severity = SEVERITIES.has(parsed.severity) ? parsed.severity : "low";
  const shouldCreateCase =
    typeof parsed.should_create_case === "boolean"
      ? parsed.should_create_case
      : severity === "medium" || severity === "high";

  return {
    reply: trimForLine(parsed.reply),
    incident_type: incidentType,
    severity,
    should_create_case: shouldCreateCase,
    required_info: Array.isArray(parsed.required_info) ? parsed.required_info : [],
    workflow_state: WORKFLOW_STATES.has(parsed.workflow_state) ? parsed.workflow_state : undefined,
    evidence_status: EVIDENCE_STATUSES.has(parsed.evidence_status) ? parsed.evidence_status : undefined,
    missing_fields: Array.isArray(parsed.missing_fields) ? parsed.missing_fields : [],
    extracted_fields: normalizeObject(parsed.extracted_fields),
    case_report: normalizeObject(parsed.case_report),
    agent_source: "azure_foundry"
  };
}

function parseJsonFromText(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
}

function trimForLine(text) {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  return normalized.length <= 4500 ? normalized : `${normalized.slice(0, 4497)}...`;
}

function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value;
}

module.exports = {
  runAzureFoundryAgent
};
