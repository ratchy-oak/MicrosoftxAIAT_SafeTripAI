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

  if (includesAny(lower, ["scam", "overcharged", "taxi", "rip off", "โกง", "หลอก", "แท็กซี่"])) {
    incidentType = "scam";
    severity = "medium";
    shouldCreateCase = true;
  }

  if (includesAny(lower, ["passport", "lost", "wallet", "bag", "หาย", "พาสปอร์ต", "กระเป๋า"])) {
    incidentType = "lost_item";
    severity = severity === "medium" ? "medium" : "low";
    shouldCreateCase = true;
  }

  if (includesAny(lower, ["robbed", "stolen", "assault", "threat", "crime", "ปล้น", "ขโมย", "ทำร้าย"])) {
    incidentType = "crime";
    severity = "high";
    shouldCreateCase = true;
  }

  if (includesAny(lower, ["accident", "injured", "hurt", "bleeding", "crash", "อุบัติเหตุ", "เจ็บ", "เลือด"])) {
    incidentType = "accident";
    severity = "high";
    shouldCreateCase = true;
  }

  if (includesAny(lower, ["hospital", "medical", "emergency", "ambulance", "โรงพยาบาล", "ฉุกเฉิน", "ป่วย"])) {
    incidentType = "medical_emergency";
    severity = "high";
    shouldCreateCase = true;
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

  return "Thank you for reporting. Please share more details such as location, time, and what happened.";
}

module.exports = {
  runTouristSafetyAgent,
  runMockTouristSafetyAgent
};
