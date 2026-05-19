const { createCase, getCase, updateCase } = require("./caseStore");
const { clearConversation, getConversation, upsertConversation } = require("./conversationStore");
const { runTouristSafetyAgent } = require("./touristSafetyAgent");

const evidenceRequirements = {
  scam: ["location", "time", "amount", "person_or_business", "evidence", "contact"],
  crime: ["current_safety", "location", "time", "suspect_detail", "injury_status", "evidence", "contact"],
  lost_item: ["item", "last_seen_location", "time", "item_detail", "contact"],
  accident: ["current_safety", "location", "injury_status", "urgent_help_needed", "contact"],
  medical: ["current_safety", "location", "symptoms", "urgent_help_needed", "contact"],
  medical_emergency: ["current_safety", "location", "symptoms", "urgent_help_needed", "contact"],
  transport: ["location", "time", "route_or_vehicle", "amount", "evidence", "contact"],
  immigration: ["issue_type", "nationality", "document_detail", "location", "deadline", "contact"],
  other: ["description", "current_safety", "location", "contact"]
};

async function processTravelerMessage(normalized) {
  if (!normalized || typeof normalized.message !== "string" || !normalized.message.trim()) {
    const reply = "Please send a text message describing your situation.";
    return {
      reply,
      agent_result: { reply, should_create_case: false, workflow_state: "guidance", evidence_status: "none", missing_fields: [] },
      case: null,
      action: "guidance_only"
    };
  }

  const language = detectLanguage(normalized.message);
  const conversation = await getConversation(normalized.channel, normalized.sender);
  const activeCase = conversation && conversation.active_case_id
    ? await getCase(conversation.active_case_id)
    : null;

  if (activeCase) {
    // Guard: if the case is waiting for confirmation but the user is describing a new incident,
    // discard the stale case and start fresh instead of merging old evidence into the new report.
    if (
      activeCase.workflow_state === "confirm_submit" &&
      !isConfirmation(normalized.message) &&
      !isGeneralAdviceQuestion(normalized.message)
    ) {
      const agentResult = await runTouristSafetyAgent(normalized.message);

      if (agentResult.should_create_case) {
        await clearConversation(normalized.channel, normalized.sender);
        return createNewCase(normalized, agentResult);
      }
    }

    return continueActiveCase(normalized, activeCase);
  }

  if (isGeneralAdviceQuestion(normalized.message)) {
    const agentResult = await runTouristSafetyAgent(normalized.message);
    const reply = buildGeneralAdviceReply(normalized.message, language, agentResult);

    return {
      reply,
      agent_result: {
        ...agentResult,
        reply,
        should_create_case: false,
        workflow_state: "guidance",
        evidence_status: "none",
        missing_fields: []
      },
      case: null,
      action: "guidance_only"
    };
  }

  const agentResult = await runTouristSafetyAgent(normalized.message);

  if (!agentResult.should_create_case) {
    return {
      reply: agentResult.reply,
      agent_result: {
        ...agentResult,
        workflow_state: "guidance",
        evidence_status: "none",
        missing_fields: []
      },
      case: null,
      action: "guidance_only"
    };
  }

  return createNewCase(normalized, agentResult);
}

async function createNewCase(normalized, agentResult) {
  const collectedFields = extractFieldsFromMessage(normalized.message, {
    incident_type: agentResult.incident_type,
    channel: normalized.channel,
    sender: normalized.sender,
    location: normalized.location,
    timestamp: normalized.timestamp
  });
  const missingFields = calculateMissingFields(agentResult.incident_type, collectedFields);
  const workflowState = missingFields.length ? "collect_evidence" : "confirm_submit";
  const evidenceStatus = missingFields.length ? "partial" : "full";
  const status = missingFields.length ? "Waiting info" : "Pending confirmation";
  const reply = buildReply({
    language: detectLanguage(normalized.message),
    incidentType: agentResult.incident_type,
    severity: agentResult.severity,
    workflowState,
    missingFields,
    collectedFields,
    baseReply: agentResult.reply
  });

  const createdCase = await createCase({
    message: normalized.message,
    sender: normalized.sender,
    channel: normalized.channel,
    location: collectedFields.location || collectedFields.last_seen_location || normalized.location,
    agentResult: {
      ...agentResult,
      reply
    },
    status,
    workflow_state: workflowState,
    evidence_status: evidenceStatus,
    missing_fields: missingFields,
    collected_fields: collectedFields,
    case_report: missingFields.length ? null : buildCaseReport(agentResult.incident_type, collectedFields, normalized.message)
  });

  await upsertConversation({
    channel: normalized.channel,
    sender: normalized.sender,
    active_case_id: createdCase.case_id,
    workflow_state: workflowState,
    pending_fields: missingFields
  });

  return {
    reply,
    agent_result: {
      ...agentResult,
      reply,
      workflow_state: workflowState,
      evidence_status: evidenceStatus,
      missing_fields: missingFields,
      collected_fields: collectedFields,
      should_create_case: false,
      requires_confirmation: workflowState === "confirm_submit"
    },
    case: createdCase,
    action: "case_started"
  };
}

async function continueActiveCase(normalized, activeCase) {
  const language = detectLanguage(normalized.message);

  if (isConfirmation(normalized.message) && activeCase.workflow_state === "confirm_submit") {
    const collectedFields = activeCase.collected_fields || {};
    const submitted = await updateCase(activeCase.case_id, {
      status: "New",
      workflow_state: "submitted",
      evidence_status: "full",
      missing_fields: [],
      case_report: activeCase.case_report || buildCaseReport(activeCase.incident_type, collectedFields, activeCase.description),
      last_reply: buildSubmittedReply(language)
    });

    await clearConversation(normalized.channel, normalized.sender);

    return {
      reply: submitted.last_reply,
      agent_result: {
        reply: submitted.last_reply,
        incident_type: submitted.incident_type,
        severity: submitted.severity,
        should_create_case: true,
        workflow_state: "submitted",
        evidence_status: "full",
        missing_fields: [],
        requires_confirmation: false
      },
      case: submitted,
      action: "case_submitted"
    };
  }

  const nextFields = extractFieldsFromMessage(normalized.message, {
    ...activeCase,
    timestamp: normalized.timestamp
  });
  const collectedFields = mergeCollectedFields(activeCase.collected_fields || {}, nextFields);
  const missingFields = calculateMissingFields(activeCase.incident_type, collectedFields);
  const workflowState = missingFields.length ? "collect_evidence" : "confirm_submit";
  const evidenceStatus = missingFields.length ? "partial" : "full";
  const status = missingFields.length ? "Waiting info" : "Pending confirmation";
  const caseReport = missingFields.length
    ? activeCase.case_report
    : buildCaseReport(activeCase.incident_type, collectedFields, activeCase.description);
  const reply = buildReply({
    language,
    incidentType: activeCase.incident_type,
    severity: activeCase.severity,
    workflowState,
    missingFields,
    collectedFields,
    baseReply: ""
  });

  const updatedCase = await updateCase(activeCase.case_id, {
    location: collectedFields.location || collectedFields.last_seen_location || activeCase.location,
    status,
    workflow_state: workflowState,
    evidence_status: evidenceStatus,
    missing_fields: missingFields,
    collected_fields: collectedFields,
    case_report: caseReport,
    last_reply: reply
  });

  await upsertConversation({
    channel: normalized.channel,
    sender: normalized.sender,
    active_case_id: updatedCase.case_id,
    workflow_state: workflowState,
    pending_fields: missingFields
  });

  return {
    reply,
    agent_result: {
      reply,
      incident_type: updatedCase.incident_type,
      severity: updatedCase.severity,
      should_create_case: false,
      workflow_state: workflowState,
      evidence_status: evidenceStatus,
      missing_fields: missingFields,
      collected_fields: collectedFields,
      requires_confirmation: workflowState === "confirm_submit"
    },
    case: updatedCase,
    action: "case_updated"
  };
}

function calculateMissingFields(incidentType, collectedFields) {
  const requirements = evidenceRequirements[incidentType] || evidenceRequirements.other;
  return requirements.filter((field) => !hasField(collectedFields, field));
}

function extractFieldsFromMessage(message, context = {}) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const fields = {};

  if (text) {
    fields.description = text;
  }

  if (context.timestamp) {
    fields.message_received_at = context.timestamp;
  }

  const location = normalizeKnownLocation(context.location) || extractLocation(text);
  if (location) {
    fields.location = location;
    fields.last_seen_location = location;
  }

  const time = extractTime(text);
  if (time) {
    fields.time = time;
  }

  const amount = extractAmount(text);
  if (amount) {
    fields.amount = amount;
  }

  const contact = extractContact(text);
  if (contact) {
    fields.contact = contact;
  }

  // Channel:sender is the most reliable contact; always use it when available
  // (overrides any phone number the user may have mentioned in passing)
  if (context.channel && context.sender && context.sender !== "unknown-line-user") {
    fields.contact = `${context.channel}:${context.sender}`;
  }

  if (includesAny(lower, ["receipt", "screenshot", "photo", "picture", "video", "chat", "plate", "license", "ใบเสร็จ", "รูป", "สลิป", "ทะเบียน"])) {
    fields.evidence = text;
  }

  if (includesAny(lower, ["taxi", "driver", "shop", "seller", "hotel", "tour", "plate", "license", "แท็กซี่", "คนขับ", "ร้าน", "โรงแรม", "ทะเบียน"])) {
    fields.person_or_business = text;
    fields.route_or_vehicle = text;
  }

  if (includesAny(lower, ["safe", "not safe", "danger", "alone", "ปลอดภัย", "ไม่ปลอดภัย", "อันตราย"])) {
    fields.current_safety = text;
  }

  if (includesAny(lower, ["injured", "hurt", "bleeding", "no injury", "เจ็บ", "บาดเจ็บ", "เลือด", "ไม่เจ็บ"])) {
    fields.injury_status = text;
  }

  if (includesAny(lower, ["ambulance", "hospital", "emergency", "urgent", "help now", "โรงพยาบาล", "ฉุกเฉิน", "ด่วน"])) {
    fields.urgent_help_needed = text;
    fields.symptoms = text;
  }

  const item = extractLostItem(text);
  if (item) {
    fields.item = item;
    fields.item_detail = text;
  }

  if (includesAny(lower, ["suspect", "thief", "robber", "attacker", "คนร้าย", "ขโมย", "ผู้ต้องสงสัย"])) {
    fields.suspect_detail = text;
  }

  if (includesAny(lower, ["passport", "visa", "immigration", "overstay", "พาสปอร์ต", "วีซ่า", "ตรวจคนเข้าเมือง"])) {
    fields.issue_type = text;
    fields.document_detail = text;
  }

  const nationality = extractNationality(text);
  if (nationality) {
    fields.nationality = nationality;
  }

  if (includesAny(lower, ["deadline", "expires", "expire", "today", "tomorrow", "หมดอายุ", "วันนี้", "พรุ่งนี้"])) {
    fields.deadline = text;
  }

  return fields;
}

function mergeCollectedFields(existing, next) {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(next || {})) {
    if (!hasField({ value }, "value")) {
      continue;
    }

    if (key === "description" && hasField(merged, key)) {
      merged.latest_message = value;
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function buildReply({ language, incidentType, severity, workflowState, missingFields, collectedFields, baseReply }) {
  if (workflowState === "confirm_submit") {
    return buildConfirmationReply(language, incidentType, severity, collectedFields);
  }

  const question = buildMissingFieldQuestion(language, missingFields, incidentType);

  if (language === "th") {
    const safetyPrefix = severity === "high"
      ? "หากมีอันตรายทันที ให้ไปอยู่ในที่ปลอดภัยและโทร 191 หรือ 1669 สำหรับเหตุฉุกเฉินทางการแพทย์ก่อนนะครับ "
      : "";
    return `${safetyPrefix}${baseReply ? `${baseReply} ` : ""}${question}`.trim();
  }

  const safetyPrefix = severity === "high"
    ? "If you are in immediate danger, move to a safe place and call 191, or 1669 for medical emergency first. "
    : "";
  return `${safetyPrefix}${baseReply ? `${baseReply} ` : ""}${question}`.trim();
}

function buildMissingFieldQuestion(language, missingFields, incidentType) {
  const nextFields = missingFields.slice(0, 3);

  if (language === "th") {
    return `เพื่อเตรียมรายงาน${formatIncidentType(incidentType, language)} ขอข้อมูลเพิ่ม: ${nextFields.map((field) => fieldLabel(field, language)).join(", ")} ครับ`;
  }

  return `To prepare a ${formatIncidentType(incidentType, language)} report, please share: ${nextFields.map((field) => fieldLabel(field, language)).join(", ")}.`;
}

function buildConfirmationReply(language, incidentType, severity, fields) {
  if (language === "th") {
    return [
      "ผมมีข้อมูลพอสำหรับร่างรายงานแล้วครับ",
      `ประเภท: ${formatIncidentType(incidentType, language)}`,
      `ความเร่งด่วน: ${fieldLabel(severity, language)}`,
      `สถานที่: ${fields.location || fields.last_seen_location || "ไม่ระบุ"}`,
      "ต้องการให้ส่งเคสนี้เข้า dashboard เพื่อให้เจ้าหน้าที่ติดตามไหมครับ? ตอบว่า \"ยืนยัน\" หรือ \"ส่งเลย\""
    ].join("\n");
  }

  return [
    "I have enough information to draft a case report.",
    `Type: ${formatIncidentType(incidentType, language)}`,
    `Severity: ${severity}`,
    `Location: ${fields.location || fields.last_seen_location || "not provided"}`,
    "Do you want me to submit this case to the officer dashboard for follow-up? Reply \"yes\" or \"confirm\"."
  ].join("\n");
}

function buildSubmittedReply(language) {
  if (language === "th") {
    return "ส่งเคสเข้า dashboard ให้เจ้าหน้าที่ติดตามแล้วครับ กรุณาเก็บหลักฐานไว้และรอการติดต่อกลับ";
  }

  return "Your case has been submitted to the officer dashboard for follow-up. Please keep your evidence and stay reachable.";
}

function buildCaseReport(incidentType, fields, description) {
  return {
    summary: description,
    incident_type: incidentType,
    location: fields.location || fields.last_seen_location || "Unknown location",
    time: fields.time || "",
    amount: fields.amount || "",
    contact: fields.contact || "",
    item: fields.item || "",
    evidence: fields.evidence || "",
    person_or_business: fields.person_or_business || "",
    current_safety: fields.current_safety || "",
    injury_status: fields.injury_status || "",
    collected_fields: fields,
    recommended_action: "Officer follow-up recommended"
  };
}

function hasField(fields, field) {
  const value = fields && fields[field];
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function detectLanguage(message) {
  return /[\u0E00-\u0E7F]/.test(message) ? "th" : "en";
}

function isConfirmation(message) {
  const lower = String(message || "").trim().toLowerCase();
  return [
    "yes",
    "confirm",
    "submit",
    "send",
    "ok",
    "sure",
    "ยืนยัน",
    "ส่งเลย",
    "ตกลง",
    "ใช่",
    "โอเค"
  ].some((keyword) => {
    if (lower === keyword) {
      return true;
    }

    // Short words need word boundaries to avoid partial matches (e.g. "ok" in "Asok", "Bangkok")
    if (keyword.length <= 4) {
      return new RegExp(`\\b${keyword}\\b`).test(lower);
    }

    return lower.includes(keyword);
  });
}

function extractLocation(text) {
  const patterns = [
    /\b(?:near|around|in)\s+([^,.!?]{2,80})/i,
    /\bat\s+(?!around\b)([^,.!?]{2,80})/i,
    /(?:แถว|ที่|ใกล้|บริเวณ)\s*([^,.!?]{2,60})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match && match[1]) {
      const location = cleanupLocationValue(match[1]);

      if (location && !looksLikeTime(location)) {
        return location;
      }
    }
  }

  return "";
}

function extractTime(text) {
  const datePatterns = [
    /\b\d{4}-\d{1,2}-\d{1,2}\b/i,
    /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/i,
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?\b/i,
    /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*(?:\s+\d{4})?\b/i,
    /\b(?:yesterday|today|tonight|tomorrow|last night|this morning|this afternoon|this evening)\b/i,
    /(?:เมื่อวาน|วันนี้|คืนนี้|พรุ่งนี้|เมื่อคืน|เช้านี้|บ่ายนี้|เย็นนี้|วันที่\s*\d{1,2}|(?:\d{1,2}\s*)?(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.))/i
  ];
  const timePatterns = [
    /\b(?:around|about|at)?\s*\d{1,2}(?::\d{2})\s*(?:am|pm)?\b/i,
    /\b(?:around|about|at)?\s*\d{1,2}\s*(?:am|pm)\b/i,
    /\b\d{1,2}\.\d{2}\b/i,
    /(?:เวลา\s*)?\d{1,2}\s*(?:โมง|ทุ่ม|นาฬิกา)(?:\s*\d{1,2}\s*นาที)?/i
  ];
  const date = firstMatch(text, datePatterns);
  const time = firstMatch(text, timePatterns);

  if (date && time && !date.toLowerCase().includes(time.toLowerCase())) {
    return cleanupExtractedValue(`${date}, ${time}`);
  }

  return cleanupExtractedValue(date || time || "");
}

function extractAmount(text) {
  const currencyMatch = text.match(/(?:฿\s*)?\d[\d,]*(?:\.\d+)?\s*(?:baht|thb|บาท)/i);

  if (currencyMatch) {
    return cleanupExtractedValue(currencyMatch[0]);
  }

  const actionMatch = text.match(/\b(?:paid|charged|cost|costs|pay)\s+(?:฿\s*)?(\d[\d,]*(?:\.\d+)?)/i);

  if (actionMatch) {
    return cleanupExtractedValue(actionMatch[1]);
  }

  return "";
}

function extractContact(text) {
  const phone = text.match(/(?:\+?\d[\d\s-]{7,}\d)/);
  if (phone) {
    return cleanupExtractedValue(phone[0]);
  }

  const line = text.match(/\bline(?:\s*id)?[:\s]+([a-z0-9._-]{3,})/i);
  return line ? `LINE ID: ${line[1]}` : "";
}

function extractLostItem(text) {
  const lower = text.toLowerCase();
  const items = [
    ["passport", "passport"],
    ["wallet", "wallet"],
    ["bag", "bag"],
    ["phone", "phone"],
    ["พาสปอร์ต", "passport"],
    ["กระเป๋า", "bag"],
    ["มือถือ", "phone"],
    ["โทรศัพท์", "phone"]
  ];
  const found = items.find(([keyword]) => lower.includes(keyword));
  return found ? found[1] : "";
}

function extractNationality(text) {
  const match = text.match(/\b(?:i am|i'm|nationality)\s+([a-z]{4,30})\b/i);
  return match ? cleanupExtractedValue(match[1]) : "";
}

function cleanupExtractedValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[.?!,]+$/g, "")
    .trim();
}

function cleanupLocationValue(value) {
  return cleanupExtractedValue(value)
    .replace(/\b(?:on|at|around|about)\s+(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\.\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|yesterday|today|tonight|tomorrow).*$/i, "")
    .replace(/\b(?:yesterday|today|tonight|tomorrow|last night|this morning|this afternoon|this evening).*$/i, "")
    .replace(/(?:เมื่อวาน|วันนี้|คืนนี้|พรุ่งนี้|เมื่อคืน|เวลา|ตอนเช้า|ตอนบ่าย|ตอนเย็น).*$/i, "")
    .trim();
}

function normalizeKnownLocation(value) {
  const location = cleanupExtractedValue(value);
  return location && location.toLowerCase() !== "unknown location" ? location : "";
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);

    if (match) {
      return cleanupExtractedValue(match[0]);
    }
  }

  return "";
}

function looksLikeTime(value) {
  return /^(?:around|about|at)?\s*(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\.\d{2}|yesterday|today|tonight|tomorrow|เมื่อวาน|วันนี้|คืนนี้|พรุ่งนี้)/i.test(String(value || "").trim());
}

function isGeneralAdviceQuestion(message) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();

  const hypothetical = [
    "what should i do if",
    "what do i do if",
    "what happens if",
    "how can i",
    "how do i",
    "if i lose",
    "if my passport",
    "ถ้า",
    "ควรทำอย่างไร",
    "ทำยังไงดี",
    "ต้องทำยังไง"
  ].some((phrase) => lower.includes(phrase));

  const realIncident = [
    "i was ",
    "i am ",
    "i lost ",
    "i paid ",
    "was stolen",
    "happened",
    "just happened",
    "โดน",
    "ถูก",
    "หายแล้ว",
    "จ่าย",
    "เกิดขึ้น",
    "ตอนนี้"
  ].some((phrase) => lower.includes(phrase));

  return hypothetical && !realIncident;
}

function buildGeneralAdviceReply(message, language, agentResult) {
  const lower = String(message || "").toLowerCase();

  if (language === "th") {
    if (includesAny(lower, ["passport", "พาสปอร์ต", "หนังสือเดินทาง"])) {
      return "ถ้าหนังสือเดินทางหายในไทย ให้เช็กจุดล่าสุดและเอกสารสำรองก่อน จากนั้นแจ้งความที่สถานีตำรวจหรือ Tourist Police 1155 และติดต่อสถานทูตของคุณเพื่อขอเอกสารเดินทางฉุกเฉินครับ";
    }

    if (includesAny(lower, ["taxi", "overcharge", "แท็กซี่", "คิดเงินเกิน"])) {
      return "ถ้าเจอแท็กซี่คิดเงินเกิน ให้จดทะเบียนรถ เก็บใบเสร็จหรือรูป/แชตไว้ หลีกเลี่ยงการปะทะ และแจ้ง Tourist Police 1155 หรือกรมการขนส่งทางบก 1584 ได้ครับ";
    }

    return agentResult.reply || "ได้ครับ เล่าอาการหรือสถานการณ์ที่กังวลมาได้เลย ผมจะช่วยแนะนำขั้นตอนที่ปลอดภัยและทำได้จริง";
  }

  if (includesAny(lower, ["passport"])) {
    return "If you lose your passport in Thailand, first check the last place you had it and keep any ID copies. Then file a police report or contact Tourist Police at 1155, and contact your embassy for emergency travel documents.";
  }

  if (includesAny(lower, ["taxi", "overcharge", "overcharged"])) {
    return "If a taxi overcharges you, keep the receipt, chat, photo, or license plate, avoid confrontation, and report it to Tourist Police 1155 or the Department of Land Transport 1584.";
  }

  return agentResult.reply || "Tell me what situation you are worried about, and I will suggest practical next steps for traveling safely in Thailand.";
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function fieldLabel(field, language) {
  const labels = {
    th: {
      amount: "จำนวนเงิน",
      contact: "ช่องทางติดต่อ",
      current_safety: "ตอนนี้ปลอดภัยไหม",
      deadline: "กำหนดเวลาหรือวันหมดอายุ",
      description: "รายละเอียดเหตุการณ์",
      document_detail: "รายละเอียดเอกสาร",
      evidence: "หลักฐาน เช่น รูป ใบเสร็จ หรือแชต",
      high: "สูง",
      injury_status: "มีใครบาดเจ็บไหม",
      issue_type: "ประเภทปัญหา",
      item: "สิ่งของที่หาย",
      item_detail: "รายละเอียดสิ่งของ",
      last_seen_location: "จุดที่เห็นครั้งล่าสุด",
      location: "สถานที่เกิดเหตุ",
      low: "ต่ำ",
      medium: "ปานกลาง",
      nationality: "สัญชาติ",
      person_or_business: "ข้อมูลคนขับ ร้าน บริษัท หรือเลขทะเบียน",
      route_or_vehicle: "เส้นทางหรือข้อมูลรถ",
      suspect_detail: "รายละเอียดผู้ก่อเหตุ",
      symptoms: "อาการ",
      time: "เวลาเกิดเหตุ",
      urgent_help_needed: "ต้องการความช่วยเหลือเร่งด่วนไหม"
    },
    en: {
      amount: "amount paid or charged",
      contact: "contact method",
      current_safety: "whether you are currently safe",
      deadline: "deadline or expiry date",
      description: "what happened",
      document_detail: "document details",
      evidence: "evidence such as photo, receipt, screenshot, or chat",
      injury_status: "injury status",
      issue_type: "type of issue",
      item: "lost item",
      item_detail: "item details",
      last_seen_location: "last seen location",
      location: "location",
      nationality: "nationality",
      person_or_business: "driver, shop, company, or plate details",
      route_or_vehicle: "route or vehicle details",
      suspect_detail: "suspect details",
      symptoms: "symptoms",
      time: "time",
      urgent_help_needed: "whether urgent help is needed"
    }
  };

  return labels[language][field] || field.replace(/_/g, " ");
}

function formatIncidentType(incidentType, language) {
  const labels = {
    th: {
      accident: "อุบัติเหตุ",
      crime: "อาชญากรรม",
      immigration: "ปัญหาด่านตรวจคนเข้าเมือง",
      lost_item: "ของหาย",
      medical: "เหตุทางการแพทย์",
      medical_emergency: "เหตุฉุกเฉินทางการแพทย์",
      other: "ปัญหาทั่วไป",
      scam: "หลอกลวง/คิดเงินเกินจริง",
      transport: "ปัญหาการเดินทาง"
    },
    en: {
      accident: "accident",
      crime: "crime",
      immigration: "immigration",
      lost_item: "lost item",
      medical: "medical emergency",
      medical_emergency: "medical emergency",
      other: "tourist safety",
      scam: "scam or overcharging",
      transport: "transport"
    }
  };

  return labels[language][incidentType] || incidentType;
}

module.exports = {
  calculateMissingFields,
  evidenceRequirements,
  extractFieldsFromMessage,
  processTravelerMessage
};
