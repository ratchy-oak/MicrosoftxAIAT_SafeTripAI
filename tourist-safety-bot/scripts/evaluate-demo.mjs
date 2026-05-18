import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";

process.env.AZURE_AI_USE_AGENT = "false";
process.env.AzureWebJobsStorage = process.env.AzureWebJobsStorage || "";

const require = createRequire(import.meta.url);
const { processTravelerMessage } = require("../src/lib/evidenceWorkflow");

const scenarios = [
  {
    id: "scam-full",
    title: "Taxi overcharge with full evidence",
    messages: [
      "I was overcharged by a taxi near Siam on May 18 around 8 PM. I paid 1200 baht and have a receipt photo."
    ],
    expected: {
      incident_type: "scam",
      severity: "medium",
      action: "case_started",
      workflow_state: "confirm_submit",
      evidence_status: "full",
      missing_fields: [],
      collected_fields: ["location", "time", "amount", "person_or_business", "evidence", "contact"]
    }
  },
  {
    id: "scam-partial-then-full",
    title: "Taxi overcharge evidence collection",
    messages: [
      "I was overcharged by taxi near Siam",
      "Around 8 PM, I paid 1200 baht and I have a receipt photo"
    ],
    expected: {
      incident_type: "scam",
      severity: "medium",
      action: "case_updated",
      workflow_state: "confirm_submit",
      evidence_status: "full",
      missing_fields: [],
      collected_fields: ["location", "time", "amount", "person_or_business", "evidence", "contact"]
    }
  },
  {
    id: "lost-passport-guidance",
    title: "Hypothetical lost passport advice",
    messages: ["What should I do if I lose my passport in Bangkok?"],
    expected: {
      action: "guidance_only",
      should_create_case: false,
      workflow_state: "guidance",
      evidence_status: "none",
      missing_fields: []
    }
  },
  {
    id: "lost-passport-case",
    title: "Actual lost passport case",
    messages: [
      "I lost my passport",
      "Last seen near Asok BTS yesterday around 6 PM"
    ],
    expected: {
      incident_type: "lost_item",
      severity: "low",
      action: "case_updated",
      workflow_state: "confirm_submit",
      evidence_status: "full",
      missing_fields: [],
      collected_fields: ["item", "last_seen_location", "time", "item_detail", "contact"]
    }
  },
  {
    id: "crime-high",
    title: "Robbery case",
    messages: [
      "I was robbed near my hotel last night. I am safe now, no injury, and I have a photo of the suspect."
    ],
    expected: {
      incident_type: "crime",
      severity: "high",
      action: "case_started",
      workflow_state: "confirm_submit",
      evidence_status: "full",
      missing_fields: [],
      collected_fields: ["current_safety", "location", "time", "suspect_detail", "injury_status", "evidence", "contact"]
    }
  },
  {
    id: "accident-high",
    title: "Motorbike accident case",
    messages: [
      "My friend is injured after a motorbike accident near Patong. We are safe and need urgent hospital help."
    ],
    expected: {
      incident_type: "medical_emergency",
      severity: "high",
      action: "case_started",
      workflow_state: "confirm_submit",
      evidence_status: "full",
      missing_fields: [],
      collected_fields: ["current_safety", "location", "injury_status", "urgent_help_needed", "contact"]
    }
  },
  {
    id: "thai-scam",
    title: "Thai taxi overcharge",
    messages: [
      "โดนแท็กซี่โกงค่าโดยสารที่สยาม วันนี้เวลา 2 ทุ่ม จ่ายไป 1200 บาท มีรูปใบเสร็จ"
    ],
    expected: {
      incident_type: "scam",
      severity: "medium",
      action: "case_started",
      workflow_state: "confirm_submit",
      evidence_status: "full",
      missing_fields: [],
      collected_fields: ["location", "time", "amount", "person_or_business", "evidence", "contact"],
      language: "th"
    }
  },
  {
    id: "general-taxi",
    title: "General taxi safety question",
    messages: ["How can I avoid taxi scams from Suvarnabhumi airport?"],
    expected: {
      action: "guidance_only",
      should_create_case: false,
      workflow_state: "guidance",
      evidence_status: "none",
      missing_fields: []
    }
  }
];

const results = [];

for (const [index, scenario] of scenarios.entries()) {
  const sender = `eval-${scenario.id}-${Date.now()}-${index}`;
  let result;
  const timings = [];

  for (const message of scenario.messages) {
    const started = performance.now();
    result = await processTravelerMessage({
      channel: "eval",
      sender,
      message,
      location: null,
      timestamp: new Date("2026-05-18T12:00:00+07:00").toISOString()
    });
    timings.push(performance.now() - started);
  }

  const finalCase = result.case;
  const finalAgent = result.agent_result || {};
  const classification = scoreClassification(result, finalCase, finalAgent, scenario.expected);
  const evidence = scoreEvidence(finalCase, finalAgent, scenario.expected);
  const recommendation = scoreRecommendation(result.reply, finalAgent, scenario.expected, scenario.messages.at(-1));
  const latencyMs = timings.reduce((sum, value) => sum + value, 0);

  results.push({
    id: scenario.id,
    title: scenario.title,
    action: result.action,
    incident_type: finalCase?.incident_type || finalAgent.incident_type || "none",
    severity: finalCase?.severity || finalAgent.severity || "none",
    workflow_state: finalCase?.workflow_state || finalAgent.workflow_state || "none",
    evidence_status: finalCase?.evidence_status || finalAgent.evidence_status || "none",
    classification,
    evidence,
    recommendation,
    latencyMs
  });
}

const classificationHitRate = percent(results.filter((item) => item.classification.pass).length, results.length);
const evidenceCorrectness = averagePercent(results.map((item) => item.evidence.score));
const recommendationQuality = averagePercent(results.map((item) => item.recommendation.score));
const latencies = results.map((item) => item.latencyMs).sort((a, b) => a - b);
const averageLatency = average(latencies);
const p95Latency = percentile(latencies, 0.95);

printSummary({
  classificationHitRate,
  evidenceCorrectness,
  recommendationQuality,
  averageLatency,
  p95Latency
});
printScenarioDetails(results);

function scoreClassification(result, finalCase, finalAgent, expected) {
  const checks = [];

  if (expected.action) {
    checks.push(result.action === expected.action);
  }

  if (expected.incident_type) {
    checks.push((finalCase?.incident_type || finalAgent.incident_type) === expected.incident_type);
  }

  if (expected.severity) {
    checks.push((finalCase?.severity || finalAgent.severity) === expected.severity);
  }

  if (expected.should_create_case !== undefined) {
    checks.push(Boolean(finalAgent.should_create_case) === expected.should_create_case);
  }

  if (expected.workflow_state) {
    checks.push((finalCase?.workflow_state || finalAgent.workflow_state) === expected.workflow_state);
  }

  return {
    pass: checks.every(Boolean),
    checks_passed: checks.filter(Boolean).length,
    checks_total: checks.length
  };
}

function scoreEvidence(finalCase, finalAgent, expected) {
  const checks = [];
  const missingFields = finalCase?.missing_fields || finalAgent.missing_fields || [];
  const collectedFields = finalCase?.collected_fields || finalAgent.collected_fields || {};

  if (expected.evidence_status) {
    checks.push((finalCase?.evidence_status || finalAgent.evidence_status) === expected.evidence_status);
  }

  if (expected.missing_fields) {
    checks.push(sameStringSet(missingFields, expected.missing_fields));
  }

  for (const field of expected.collected_fields || []) {
    checks.push(hasValue(collectedFields[field]));
  }

  if (!checks.length) {
    return { score: 100, checks_passed: 0, checks_total: 0 };
  }

  return {
    score: percent(checks.filter(Boolean).length, checks.length),
    checks_passed: checks.filter(Boolean).length,
    checks_total: checks.length
  };
}

function scoreRecommendation(reply, finalAgent, expected, message) {
  const text = String(reply || "");
  const lower = text.toLowerCase();
  const checks = [
    text.trim().length > 20,
    text.length <= 800,
    doesNotClaimDispatch(lower),
    hasPracticalGuidance(lower, text),
    handlesMissingFields(finalAgent, lower),
    expected.language === "th" ? /[\u0E00-\u0E7F]/.test(text) : true,
    !/undefined|null|\[object object\]/i.test(text),
    sameLanguageWhenThai(message, text)
  ];

  return {
    score: percent(checks.filter(Boolean).length, checks.length),
    checks_passed: checks.filter(Boolean).length,
    checks_total: checks.length
  };
}

function hasPracticalGuidance(lower, original) {
  return [
    "keep",
    "share",
    "call",
    "safe",
    "report",
    "contact",
    "submit",
    "receipt",
    "police",
    "hospital",
    "เก็บ",
    "ส่ง",
    "โทร",
    "ปลอดภัย",
    "รายงาน",
    "ติดต่อ",
    "หลักฐาน"
  ].some((keyword) => lower.includes(keyword) || original.includes(keyword));
}

function handlesMissingFields(finalAgent, lower) {
  const missing = finalAgent.missing_fields || [];
  if (!missing.length) {
    return lower.includes("enough information")
      || lower.includes("submit")
      || lower.includes("submitted")
      || lower.includes("ข้อมูลพอ")
      || lower.includes("ส่งเคส")
      || finalAgent.workflow_state === "guidance";
  }

  return missing.slice(0, 3).some((field) => lower.includes(String(field).replaceAll("_", " ")))
    || lower.includes("please share")
    || lower.includes("ขอข้อมูลเพิ่ม");
}

function doesNotClaimDispatch(lower) {
  return ![
    "police have been dispatched",
    "officers are on the way",
    "ambulance has been sent",
    "เจ้าหน้าที่กำลังไป",
    "ส่งตำรวจแล้ว",
    "รถพยาบาลกำลังไป"
  ].some((phrase) => lower.includes(phrase));
}

function sameLanguageWhenThai(message, reply) {
  if (!/[\u0E00-\u0E7F]/.test(message)) {
    return true;
  }

  return /[\u0E00-\u0E7F]/.test(reply);
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function sameStringSet(actual, expected) {
  const actualSet = new Set((actual || []).map(String));
  const expectedSet = new Set((expected || []).map(String));

  if (actualSet.size !== expectedSet.size) {
    return false;
  }

  return [...expectedSet].every((item) => actualSet.has(item));
}

function percent(value, total) {
  if (!total) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(1));
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averagePercent(values) {
  return Number(average(values).toFixed(1));
}

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }

  const index = Math.min(values.length - 1, Math.ceil(values.length * p) - 1);
  return values[index];
}

function formatMs(value) {
  return `${Number(value.toFixed(1))} ms`;
}

function printSummary(summary) {
  const rows = [
    ["% hit classification case", `${summary.classificationHitRate}%`, "Gold-set scenario checks for incident type, severity, case/guidance route, and workflow state."],
    ["Evidence correctness", `${summary.evidenceCorrectness}%`, "Checks required fields, missing_fields, evidence_status, and extracted structured fields."],
    ["Recommendation explanation quality", `${summary.recommendationQuality}%`, "Rule-based quality rubric: short, practical, no false dispatch claim, asks only needed follow-up, language match."],
    ["Cost and latency", `$0.00 local eval / avg ${formatMs(summary.averageLatency)} / p95 ${formatMs(summary.p95Latency)}`, "Evaluation forced local mock mode; Azure Foundry production cost depends on model and token usage."]
  ];

  console.log("\n## SafeTripAI Evaluation Summary\n");
  printMarkdownTable(["Metric", "Result", "How it was measured"], rows);
}

function printScenarioDetails(items) {
  const rows = items.map((item) => [
    item.title,
    item.incident_type,
    item.severity,
    item.workflow_state,
    item.evidence_status,
    item.classification.pass ? "Pass" : "Fail",
    `${item.evidence.score}%`,
    `${item.recommendation.score}%`,
    formatMs(item.latencyMs)
  ]);

  console.log("\n## Scenario Details\n");
  printMarkdownTable(
    ["Scenario", "Type", "Severity", "Workflow", "Evidence", "Classification", "Evidence Score", "Recommendation Score", "Latency"],
    rows
  );
}

function printMarkdownTable(headers, rows) {
  console.log(`| ${headers.join(" | ")} |`);
  console.log(`| ${headers.map(() => "---").join(" | ")} |`);

  for (const row of rows) {
    console.log(`| ${row.map(escapeTableCell).join(" | ")} |`);
  }
}

function escapeTableCell(value) {
  return String(value).replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}
