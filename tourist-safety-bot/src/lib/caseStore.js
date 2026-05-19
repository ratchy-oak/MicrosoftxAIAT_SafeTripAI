const { TableClient } = require("@azure/data-tables");

const tableName = process.env.CASES_TABLE_NAME || "SafeTripCases";
const memoryCases = [];
let caseIdCounter = 0;
let tableClient;
let tableReadyPromise;

const allowedCaseFields = new Set([
  "channel",
  "sender",
  "incident_type",
  "severity",
  "location",
  "description",
  "status",
  "last_reply",
  "workflow_state",
  "evidence_status",
  "missing_fields",
  "collected_fields",
  "case_report"
]);

function getTableClient() {
  const connectionString = process.env.AzureWebJobsStorage;

  if (!connectionString || connectionString === "UseDevelopmentStorage=true") {
    return null;
  }

  if (!tableClient) {
    tableClient = TableClient.fromConnectionString(connectionString, tableName);
  }

  return tableClient;
}

async function ensureTable() {
  const client = getTableClient();

  if (!client) {
    return null;
  }

  if (!tableReadyPromise) {
    tableReadyPromise = client.createTable().catch((error) => {
      if (error.statusCode !== 409) {
        tableReadyPromise = null;
        throw error;
      }
    });
  }

  await tableReadyPromise;
  return client;
}

function buildCaseRecord({
  message,
  sender,
  channel,
  agentResult,
  location,
  workflow_state,
  evidence_status,
  missing_fields,
  collected_fields,
  case_report,
  status
}) {
  const now = new Date();
  return {
    case_id: `CASE-${now.getTime()}-${(++caseIdCounter).toString().padStart(4, "0")}`,
    timestamp: now.toISOString(),
    channel,
    sender,
    incident_type: agentResult.incident_type,
    severity: agentResult.severity,
    location: location || "Unknown location",
    description: message,
    status: status || "New",
    last_reply: agentResult.reply,
    workflow_state: workflow_state || "submitted",
    evidence_status: evidence_status || "unknown",
    missing_fields: missing_fields || [],
    collected_fields: collected_fields || {},
    case_report: case_report || null,
    updated_at: now.toISOString()
  };
}

function buildManualCaseRecord(input) {
  const now = new Date();
  return normalizeCaseRecord({
    case_id: input.case_id || `CASE-${now.getTime()}`,
    timestamp: input.timestamp || now.toISOString(),
    channel: input.channel || "manual",
    sender: input.sender || "dashboard",
    incident_type: input.incident_type || "other",
    severity: input.severity || "low",
    location: input.location || "Unknown location",
    description: input.description || input.message || "",
    status: input.status || "New",
    last_reply: input.last_reply || "",
    workflow_state: input.workflow_state || "manual",
    evidence_status: input.evidence_status || "unknown",
    missing_fields: input.missing_fields || [],
    collected_fields: input.collected_fields || {},
    case_report: input.case_report || null,
    updated_at: input.updated_at || now.toISOString()
  });
}

function normalizeCaseRecord(record) {
  return {
    case_id: String(record.case_id || "").trim(),
    timestamp: record.timestamp || new Date().toISOString(),
    channel: String(record.channel || "manual").trim(),
    sender: String(record.sender || "dashboard").trim(),
    incident_type: normalizeIncidentType(record.incident_type),
    severity: normalizeSeverity(record.severity),
    location: String(record.location || "Unknown location").trim(),
    description: String(record.description || "").trim(),
    status: normalizeStatus(record.status),
    last_reply: String(record.last_reply || "").trim(),
    workflow_state: normalizeWorkflowState(record.workflow_state),
    evidence_status: normalizeEvidenceStatus(record.evidence_status),
    missing_fields: normalizeStringArray(record.missing_fields),
    collected_fields: normalizeObject(record.collected_fields),
    case_report: normalizeNullableObject(record.case_report),
    updated_at: record.updated_at || new Date().toISOString()
  };
}

function toTableEntity(record) {
  return {
    partitionKey: "case",
    rowKey: record.case_id,
    case_id: record.case_id,
    created_at: record.timestamp,
    channel: record.channel || "",
    sender: record.sender || "",
    incident_type: record.incident_type || "other",
    severity: record.severity || "low",
    location: record.location || "Unknown location",
    description: record.description || "",
    status: record.status || "New",
    last_reply: record.last_reply || "",
    workflow_state: record.workflow_state || "manual",
    evidence_status: record.evidence_status || "unknown",
    missing_fields: JSON.stringify(record.missing_fields || []),
    collected_fields: JSON.stringify(record.collected_fields || {}),
    case_report: JSON.stringify(record.case_report || null),
    updated_at: record.updated_at || record.timestamp || ""
  };
}

function fromTableEntity(entity) {
  return {
    case_id: entity.case_id || entity.rowKey,
    timestamp: entity.created_at,
    channel: entity.channel,
    sender: entity.sender,
    incident_type: entity.incident_type,
    severity: entity.severity,
    location: entity.location,
    description: entity.description,
    status: entity.status,
    last_reply: entity.last_reply,
    workflow_state: entity.workflow_state || "manual",
    evidence_status: entity.evidence_status || "unknown",
    missing_fields: parseJson(entity.missing_fields, []),
    collected_fields: parseJson(entity.collected_fields, {}),
    case_report: parseJson(entity.case_report, null),
    updated_at: entity.updated_at
  };
}

async function createCase(input) {
  const record = normalizeCaseRecord(buildCaseRecord(input));
  await insertCase(record);
  return record;
}

async function createManualCase(input) {
  const record = buildManualCaseRecord(input);

  if (!record.description) {
    throw new Error("Case description is required");
  }

  await insertCase(record);
  return record;
}

async function insertCase(record) {
  memoryCases.unshift(record);

  try {
    const client = await ensureTable();

    if (client) {
      await client.createEntity(toTableEntity(record));
    }
  } catch (error) {
    console.error("Failed to persist case to Azure Table Storage", error.message);
  }
}

async function listCases() {
  try {
    const client = await ensureTable();

    if (client) {
      const records = [];

      for await (const entity of client.listEntities({
        queryOptions: {
          filter: "PartitionKey eq 'case'"
        }
      })) {
        records.push(fromTableEntity(entity));
      }

      return records
        .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
        .slice(0, 100);
    }
  } catch (error) {
    console.error("Failed to load cases from Azure Table Storage", error.message);
  }

  return memoryCases;
}

async function getCase(caseId) {
  const id = normalizeCaseId(caseId);

  try {
    const client = await ensureTable();

    if (client) {
      const entity = await client.getEntity("case", id);
      return fromTableEntity(entity);
    }
  } catch (error) {
    if (error.statusCode !== 404) {
      console.error("Failed to load case from Azure Table Storage", error.message);
    }
  }

  return memoryCases.find((item) => item.case_id === id) || null;
}

async function updateCase(caseId, patch) {
  const id = normalizeCaseId(caseId);
  const existing = await getCase(id);

  if (!existing) {
    return null;
  }

  const sanitizedPatch = sanitizePatch(patch);
  const updated = normalizeCaseRecord({
    ...existing,
    ...sanitizedPatch,
    case_id: existing.case_id,
    timestamp: existing.timestamp,
    updated_at: new Date().toISOString()
  });

  replaceMemoryCase(updated);

  try {
    const client = await ensureTable();

    if (client) {
      await client.updateEntity(toTableEntity(updated), "Replace");
    }
  } catch (error) {
    console.error("Failed to update case in Azure Table Storage", error.message);
  }

  return updated;
}

async function deleteCase(caseId) {
  const id = normalizeCaseId(caseId);
  const memoryIndex = memoryCases.findIndex((item) => item.case_id === id);

  if (memoryIndex !== -1) {
    memoryCases.splice(memoryIndex, 1);
  }

  try {
    const client = await ensureTable();

    if (client) {
      await client.deleteEntity("case", id);
      return true;
    }
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }

    console.error("Failed to delete case from Azure Table Storage", error.message);
  }

  return memoryIndex !== -1;
}

function replaceMemoryCase(record) {
  const index = memoryCases.findIndex((item) => item.case_id === record.case_id);

  if (index === -1) {
    memoryCases.unshift(record);
    return;
  }

  memoryCases[index] = record;
}

function sanitizePatch(patch) {
  const sanitized = {};

  if (!patch || typeof patch !== "object") {
    return sanitized;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (allowedCaseFields.has(key)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function normalizeCaseId(caseId) {
  return String(caseId || "").trim();
}

function normalizeIncidentType(value) {
  const normalized = String(value || "other").trim().toLowerCase();
  const allowed = new Set([
    "scam",
    "accident",
    "crime",
    "lost_item",
    "medical",
    "medical_emergency",
    "transport",
    "immigration",
    "other"
  ]);

  return allowed.has(normalized) ? normalized : "other";
}

function normalizeSeverity(value) {
  const normalized = String(value || "low").trim().toLowerCase();
  return ["low", "medium", "high"].includes(normalized) ? normalized : "low";
}

function normalizeStatus(value) {
  const normalized = String(value || "New").trim();
  const allowed = ["New", "In progress", "Waiting info", "Pending confirmation", "Resolved", "Closed"];
  return allowed.includes(normalized) ? normalized : "New";
}

function normalizeWorkflowState(value) {
  const normalized = String(value || "manual").trim();
  const allowed = [
    "manual",
    "intake",
    "collect_evidence",
    "guidance",
    "draft_case_report",
    "confirm_submit",
    "submitted",
    "tracking",
    "closed"
  ];
  return allowed.includes(normalized) ? normalized : "manual";
}

function normalizeEvidenceStatus(value) {
  const normalized = String(value || "unknown").trim();
  return ["unknown", "none", "partial", "full"].includes(normalized) ? normalized : "unknown";
}

function normalizeStringArray(value) {
  const parsed = typeof value === "string" ? parseJson(value, []) : value;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizeObject(value) {
  const parsed = typeof value === "string" ? parseJson(value, {}) : value;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return parsed;
}

function normalizeNullableObject(value) {
  const parsed = typeof value === "string" ? parseJson(value, null) : value;

  if (!parsed) {
    return null;
  }

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  return parsed;
}

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = {
  createCase,
  createManualCase,
  deleteCase,
  getCase,
  listCases,
  updateCase
};
