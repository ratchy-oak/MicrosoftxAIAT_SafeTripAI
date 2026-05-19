const { runAzureFoundryAgent } = require("./azureFoundryAgent");

function detectLanguage(message) {
  return /[\u0E00-\u0E7F]/.test(message) ? "th" : "en";
}

async function runTouristSafetyAgent(message) {
  try {
    const azureResult = await runAzureFoundryAgent(message);

    if (azureResult) {
      return azureResult;
    }
  } catch (error) {
    console.warn("Azure Foundry Agent fallback:", error.message);
  }

  return runMockTouristSafetyAgent(message);
}

async function runMockTouristSafetyAgent(message) {
  const language = detectLanguage(message);
  const lower = message.toLowerCase();

  let incidentType = "other";
  let severity = "low";
  let shouldCreateCase = false;

  if (includesAny(lower, [
    "scam", "overcharged", "overcharge", "rip off", "rip-off", "fraud", "cheated",
    "โกง", "หลอก", "แท็กซี่", "ถูกโกง", "ถูกหลอก", "โดนโกง", "โดนหลอก",
    "คิดเงินเกิน", "เก็บเงินเกิน", "โกงเงิน"
  ])) {
    incidentType = "scam";
    severity = "medium";
    shouldCreateCase = true;
  }

  if (includesAny(lower, [
    "passport", "lost", "wallet", "bag", "phone",
    "หาย", "พาสปอร์ต", "กระเป๋า", "โทรศัพท์", "มือถือ", "กระเป๋าเงิน",
    "ของหาย", "สูญหาย", "วางลืม"
  ])) {
    incidentType = "lost_item";
    severity = severity === "medium" ? "medium" : "low";
    shouldCreateCase = true;
  }

  if (includesAny(lower, [
    "robbed", "robbery", "stolen", "assault", "assaulted", "attacked", "mugged",
    "threat", "threatening", "stabbed", "crime",
    "ปล้น", "ขโมย", "ทำร้าย", "ถูกปล้น", "ถูกทำร้าย", "ถูกขโมย", "ถูกทุบ",
    "โดนปล้น", "โดนขโมย", "โดนทำร้าย", "จี้", "วิ่งราว", "ล้วงกระเป๋า"
  ])) {
    incidentType = "crime";
    severity = "high";
    shouldCreateCase = true;
  }

  if (includesAny(lower, [
    "accident", "crash", "hit by", "knocked down", "fell", "injured", "hurt", "bleeding",
    "อุบัติเหตุ", "รถชน", "ถูกรถ", "ชนรถ", "ถูกชน", "โดนรถชน",
    "เจ็บ", "บาดเจ็บ", "เลือด", "ล้ม", "หกล้ม", "ตก"
  ])) {
    incidentType = "accident";
    severity = "high";
    shouldCreateCase = true;
  }

  if (includesAny(lower, [
    "hospital", "medical", "emergency", "ambulance", "sick", "faint", "unconscious",
    "โรงพยาบาล", "ฉุกเฉิน", "ป่วย", "หมดสติ", "เป็นลม",
    "หายใจไม่ออก", "เจ็บหน้าอก", "หัวใจ", "ชัก"
  ])) {
    incidentType = "medical_emergency";
    severity = "high";
    shouldCreateCase = true;
  }

  if (!shouldCreateCase && includesAny(lower, [
    "transport", "tuk-tuk", "tuk tuk", "songthaew", "boat", "bus", "train", "ferry",
    "meter tamper", "wrong route",
    "ทุกทุก", "สองแถว", "เรือ", "รถเมล์", "รถไฟ", "รถบัส",
    "มิเตอร์", "ค่าโดยสาร", "ไม่ยอมไป", "ไม่ยอมพา"
  ])) {
    incidentType = "transport";
    severity = "medium";
    shouldCreateCase = true;
  }

  // Broad fallback: Thai real-incident prefix "ถูก"/"โดน" not caught by specific keywords above
  if (!shouldCreateCase && (lower.includes("โดน") || lower.includes("ถูก")) && lower.length > 5) {
    shouldCreateCase = true;
    severity = "medium";
  }

  return {
    reply: buildReply({ language, incidentType, severity }),
    incident_type: incidentType,
    severity,
    should_create_case: shouldCreateCase,
    required_info: shouldCreateCase ? ["location", "contact", "short_description"] : ["short_description"],
    agent_source: "mock"
  };
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function buildReply({ language, incidentType, severity }) {
  if (language === "th") {
    if (severity === "high") {
      return "รับทราบครับ เหตุนี้อาจมีความเร่งด่วน กรุณาไปยังจุดที่ปลอดภัย โทรเบอร์ฉุกเฉินในพื้นที่หากมีอันตรายทันที และส่งตำแหน่ง/เบอร์ติดต่อเพื่อสร้างรายงานช่วยเหลือ";
    }

    if (incidentType === "scam") {
      return "กรณีนี้อาจเป็นการหลอกลวงหรือคิดค่าบริการเกินจริง กรุณาเก็บใบเสร็จ รูปภาพ ป้ายทะเบียน หรือแชตไว้เป็นหลักฐาน และส่งตำแหน่งเพื่อสร้างรายงาน";
    }

    if (incidentType === "lost_item") {
      return "ผมช่วยบันทึกเหตุของหายได้ครับ กรุณาส่งตำแหน่งล่าสุด รายละเอียดสิ่งของ และช่องทางติดต่อกลับ";
    }

    if (incidentType === "transport") {
      return "รับทราบปัญหาการเดินทางครับ กรุณาแชร์เส้นทาง เลขทะเบียน หรือข้อมูลรถ พร้อมจำนวนเงินที่ถูกเรียกเก็บ เพื่อสร้างรายงาน";
    }

    return "ขอบคุณที่แจ้งข้อมูลครับ กรุณาเล่ารายละเอียดเพิ่มเติม เช่น สถานที่ เวลา และสิ่งที่เกิดขึ้น";
  }

  if (severity === "high") {
    return "This may be urgent. Please move to a safe area, call local emergency services if you are in immediate danger, and share your location and contact details so a report can be prepared.";
  }

  if (incidentType === "scam") {
    return "This may be a scam or overcharging case. Please keep receipts, screenshots, license plate details, or chat records, and share your location so a report can be prepared.";
  }

  if (incidentType === "lost_item") {
    return "I can help prepare a lost item report. Please share the last known location, item details, and a contact method.";
  }

  if (incidentType === "transport") {
    return "I can help with this transport issue. Please share the route, vehicle details or plate number, and the amount charged.";
  }

  return "Thank you for reporting. Please share more details such as location, time, and what happened.";
}

module.exports = {
  runTouristSafetyAgent,
  runMockTouristSafetyAgent
};
