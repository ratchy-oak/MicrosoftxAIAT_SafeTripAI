const test = require("node:test");
const assert = require("node:assert/strict");
const { runTouristSafetyAgent, runMockTouristSafetyAgent } = require("../src/lib/touristSafetyAgent");

// --- English incident classification ---

test("classifies taxi overcharging as a medium scam case", async () => {
  const result = await runTouristSafetyAgent("I was overcharged by a taxi near Siam");
  assert.equal(result.incident_type, "scam");
  assert.equal(result.severity, "medium");
  assert.equal(result.should_create_case, true);
});

test("classifies pickpocket as a high severity crime", async () => {
  const result = await runMockTouristSafetyAgent("Someone pickpocketed my wallet on the BTS");
  assert.equal(result.incident_type, "crime");
  assert.equal(result.severity, "high");
  assert.equal(result.should_create_case, true);
});

test("classifies drink spiking as a high severity crime", async () => {
  const result = await runMockTouristSafetyAgent("I think my drink was spiked at a bar");
  assert.equal(result.incident_type, "crime");
  assert.equal(result.severity, "high");
  assert.equal(result.should_create_case, true);
});

test("classifies food poisoning as a medical emergency", async () => {
  const result = await runMockTouristSafetyAgent("I have severe food poisoning and can't stop vomiting");
  assert.equal(result.incident_type, "medical_emergency");
  assert.equal(result.severity, "high");
  assert.equal(result.should_create_case, true);
});

test("classifies injury messages as high severity accidents", async () => {
  const result = await runTouristSafetyAgent("There was an accident and my friend is injured");
  assert.equal(result.incident_type, "accident");
  assert.equal(result.severity, "high");
  assert.equal(result.should_create_case, true);
});

test("classifies urgent medical messages as medical emergencies", async () => {
  const result = await runTouristSafetyAgent("My friend needs urgent hospital help");
  assert.equal(result.incident_type, "medical_emergency");
  assert.equal(result.severity, "high");
  assert.equal(result.should_create_case, true);
});

test("classifies gem scam as medium severity scam", async () => {
  const result = await runMockTouristSafetyAgent("A tuk-tuk driver took me to a gem store and pressured me to buy fake gems");
  assert.equal(result.incident_type, "scam");
  assert.equal(result.severity, "medium");
  assert.equal(result.should_create_case, true);
});

test("classifies transport refusal as transport incident", async () => {
  const result = await runMockTouristSafetyAgent("The songthaew driver refused to go to my destination");
  assert.equal(result.incident_type, "transport");
  assert.equal(result.severity, "medium");
  assert.equal(result.should_create_case, true);
});

test("classifies visa overstay as an immigration case", async () => {
  const result = await runMockTouristSafetyAgent("I overstayed my visa and need help");
  assert.equal(result.incident_type, "immigration");
  assert.equal(result.should_create_case, true);
});

test("still classifies a lost passport as lost_item, not immigration", async () => {
  const result = await runMockTouristSafetyAgent("I lost my passport somewhere in Bangkok");
  assert.equal(result.incident_type, "lost_item");
  assert.equal(result.should_create_case, true);
});

test("classifies being followed as a high severity crime", async () => {
  const result = await runMockTouristSafetyAgent("A man has been following me near my hotel");
  assert.equal(result.incident_type, "crime");
  assert.equal(result.severity, "high");
  assert.equal(result.should_create_case, true);
});

// --- Thai incident classification ---

test("classifies Thai car accident via รถชน", async () => {
  const result = await runMockTouristSafetyAgent("ผมถูกรถชน แถวบางมด");
  assert.equal(result.incident_type, "accident");
  assert.equal(result.severity, "high");
  assert.equal(result.should_create_case, true);
});

test("returns Thai reply for Thai accident input", async () => {
  const result = await runTouristSafetyAgent("เกิดอุบัติเหตุและมีคนเจ็บ");
  assert.equal(result.incident_type, "accident");
  assert.equal(result.severity, "high");
  assert.match(result.reply, /รับทราบ/);
});

test("classifies Thai pickpocket as crime", async () => {
  const result = await runMockTouristSafetyAgent("โดนล้วงกระเป๋าในรถเมล์");
  assert.equal(result.incident_type, "crime");
  assert.equal(result.should_create_case, true);
});

test("classifies Thai food poisoning as medical emergency", async () => {
  const result = await runMockTouristSafetyAgent("กินอาหารแล้วอาหารเป็นพิษ อาเจียนมาก");
  assert.equal(result.incident_type, "medical_emergency");
  assert.equal(result.should_create_case, true);
});

test("classifies Thai real-incident ถูก prefix via broad fallback", async () => {
  // Message uses "ถูก" but doesn't match any specific keyword → should still create a case
  const result = await runMockTouristSafetyAgent("ผมถูกไล่ออกจากสถานที่อย่างไม่เป็นธรรม");
  assert.equal(result.should_create_case, true);
  assert.equal(result.severity, "medium");
});

// --- False positive guard ---

test("does not create case for ถูกใจ (non-incident Thai phrase)", async () => {
  const result = await runMockTouristSafetyAgent("ถูกใจมากเลย ขอบคุณครับ");
  assert.equal(result.should_create_case, false);
});

test("does not create case for ถูกต้อง (non-incident Thai phrase)", async () => {
  const result = await runMockTouristSafetyAgent("ถูกต้องครับ ขอบคุณ");
  assert.equal(result.should_create_case, false);
});

// --- Input robustness ---

test("handles null message without crashing", async () => {
  const result = await runMockTouristSafetyAgent(null);
  assert.equal(typeof result.reply, "string");
  assert.equal(result.should_create_case, false);
});

test("handles empty message without crashing", async () => {
  const result = await runMockTouristSafetyAgent("");
  assert.equal(typeof result.reply, "string");
  assert.equal(result.should_create_case, false);
});
