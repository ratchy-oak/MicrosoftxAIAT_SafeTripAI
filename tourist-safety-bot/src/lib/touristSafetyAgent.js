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
  const text = String(message || "").trim();
  const language = detectLanguage(text);
  const lower = text.toLowerCase();

  let incidentType = "other";
  let severity = "low";
  let shouldCreateCase = false;

  if (includesAny(lower, [
    // English
    "scam", "overcharged", "overcharge", "rip off", "rip-off", "fraud", "cheated",
    "gem scam", "fake gem", "tuk-tuk scam", "temple scam", "fake monk", "bracelet scam",
    "pressured to buy", "forced to buy", "overpriced shop",
    // Thai
    "โกง", "หลอก", "แท็กซี่", "ถูกโกง", "ถูกหลอก", "โดนโกง", "โดนหลอก",
    "คิดเงินเกิน", "เก็บเงินเกิน", "โกงเงิน", "ร้านค้าโกง", "ราคาเกิน",
    "อัญมณี", "หินมีค่า", "พระปลอม", "นักบวชปลอม"
  ])) {
    incidentType = "scam";
    severity = "medium";
    shouldCreateCase = true;
  }

  if (includesAny(lower, [
    // English
    "passport", "lost", "wallet", "bag", "phone", "purse", "luggage", "missing item",
    // Thai
    "หาย", "พาสปอร์ต", "กระเป๋า", "โทรศัพท์", "มือถือ", "กระเป๋าเงิน",
    "ของหาย", "สูญหาย", "วางลืม", "หนังสือเดินทาง"
  ])) {
    incidentType = "lost_item";
    severity = severity === "medium" ? "medium" : "low";
    shouldCreateCase = true;
  }

  if (includesAny(lower, [
    // English
    "robbed", "robbery", "stolen", "steal", "assault", "assaulted", "attacked", "mugged",
    "pickpocket", "purse snatched", "bag snatched", "knife", "weapon", "gun",
    "threat", "threatening", "stabbed", "crime", "drugged", "spiked", "drug",
    "sexual assault", "harassment", "molested", "groped",
    // Thai
    "ปล้น", "ขโมย", "ทำร้าย", "ถูกปล้น", "ถูกทำร้าย", "ถูกขโมย", "ถูกทุบ",
    "โดนปล้น", "โดนขโมย", "โดนทำร้าย", "จี้", "วิ่งราว", "ล้วงกระเป๋า",
    "ถูกลักทรัพย์", "มีดาบ", "มีด", "อาวุธ", "ยาเสพติด", "ถูกวางยา",
    "คุกคาม", "ล่วงละเมิด", "ถูกล่วงละเมิด"
  ])) {
    incidentType = "crime";
    severity = "high";
    shouldCreateCase = true;
  }

  if (includesAny(lower, [
    // English
    "accident", "crash", "hit by", "knocked down", "fell", "injured", "hurt", "bleeding",
    "motorbike accident", "bicycle accident", "car accident",
    // Thai — also match "ชน" standalone (collision) since Thai autocorrect can mangle "รถ"
    "อุบัติเหตุ", "รถชน", "ถูกรถ", "ชนรถ", "ถูกชน", "โดนรถชน", "ชน",
    "เจ็บ", "บาดเจ็บ", "เลือด", "ล้ม", "หกล้ม", "ตก", "ถูกจักรยาน", "ถูกมอเตอร์ไซค์"
  ])) {
    incidentType = "accident";
    severity = "high";
    shouldCreateCase = true;
  }

  if (includesAny(lower, [
    // English
    "hospital", "medical", "emergency", "ambulance", "sick", "faint", "unconscious",
    "chest pain", "can't breathe", "difficulty breathing", "seizure", "allergic",
    "food poisoning", "food sick", "heat stroke", "sunstroke", "dengue", "malaria",
    "high fever", "vomiting", "severe pain",
    // Thai
    "โรงพยาบาล", "ฉุกเฉิน", "ป่วย", "หมดสติ", "เป็นลม",
    "หายใจไม่ออก", "เจ็บหน้าอก", "หัวใจ", "ชัก", "แพ้อาหาร",
    "อาหารเป็นพิษ", "โรคร้อน", "ลมแดด", "ไข้สูง", "อาเจียน", "ปวดรุนแรง"
  ])) {
    incidentType = "medical_emergency";
    severity = "high";
    shouldCreateCase = true;
  }

  if (!shouldCreateCase && includesAny(lower, [
    // English
    "transport", "tuk-tuk", "tuk tuk", "songthaew", "boat", "ferry", "bus", "train",
    "meter tamper", "wrong route", "refused to go", "driver refused",
    // Thai
    "ทุกทุก", "สองแถว", "เรือ", "รถเมล์", "รถไฟ", "รถบัส",
    "มิเตอร์", "ค่าโดยสาร", "ไม่ยอมไป", "ไม่ยอมพา", "คนขับปฏิเสธ"
  ])) {
    incidentType = "transport";
    severity = "medium";
    shouldCreateCase = true;
  }

  // Broad fallback: Thai real-incident markers not matched by specific keywords above.
  // Exclude common non-incident uses of "ถูก"/"โดน" (e.g. ถูกใจ=like, ถูกต้อง=correct).
  const falsePositivePatterns = ["ถูกใจ", "ถูกต้อง", "ถูกกฎหมาย", "ถูกโฉลก", "โดนแดด", "โดนฝน", "โดนใจ"];
  if (
    !shouldCreateCase &&
    !includesAny(lower, falsePositivePatterns) &&
    (lower.includes("โดน") || lower.includes("ถูก")) &&
    lower.length > 8
  ) {
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

    if (incidentType === "other") {
      return "รับทราบครับ กรุณาเล่ารายละเอียดเหตุการณ์ที่เกิดขึ้น สถานที่ เวลา และสิ่งที่ต้องการความช่วยเหลือ";
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

  if (incidentType === "other") {
    return "Understood. Please describe what happened, where, and what kind of help you need.";
  }

  return "Thank you for reporting. Please share more details such as location, time, and what happened.";
}

module.exports = {
  runTouristSafetyAgent,
  runMockTouristSafetyAgent
};
