const test = require("node:test");
const assert = require("node:assert/strict");
const { runTouristSafetyAgent } = require("../src/lib/touristSafetyAgent");

test("classifies taxi overcharging as a medium scam case", async () => {
  const result = await runTouristSafetyAgent("I was overcharged by a taxi near Siam");

  assert.equal(result.incident_type, "scam");
  assert.equal(result.severity, "medium");
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

test("returns Thai reply for Thai input", async () => {
  const result = await runTouristSafetyAgent("เกิดอุบัติเหตุและมีคนเจ็บ");

  assert.equal(result.incident_type, "accident");
  assert.equal(result.severity, "high");
  assert.match(result.reply, /รับทราบ/);
});
