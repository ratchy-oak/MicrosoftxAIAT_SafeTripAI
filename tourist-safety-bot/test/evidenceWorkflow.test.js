const assert = require("node:assert/strict");
const test = require("node:test");

const { getCase } = require("../src/lib/caseStore");
const { processTravelerMessage } = require("../src/lib/evidenceWorkflow");

test("collects missing evidence into the same active case before confirmation", async () => {
  const sender = `workflow-user-${Date.now()}`;

  const first = await processTravelerMessage({
    channel: "line",
    sender,
    message: "I was overcharged by taxi near Siam",
    location: null
  });

  assert.equal(first.action, "case_started");
  assert.equal(first.case.incident_type, "scam");
  assert.equal(first.case.status, "Waiting info");
  assert.equal(first.case.workflow_state, "collect_evidence");
  assert.ok(first.case.missing_fields.includes("time"));
  assert.ok(first.case.missing_fields.includes("amount"));
  assert.ok(first.case.missing_fields.includes("evidence"));

  const second = await processTravelerMessage({
    channel: "line",
    sender,
    message: "Around 8 PM, I paid 1200 baht and I have a receipt photo",
    location: null
  });

  assert.equal(second.action, "case_updated");
  assert.equal(second.case.case_id, first.case.case_id);
  assert.equal(second.case.workflow_state, "confirm_submit");
  assert.equal(second.case.evidence_status, "full");
  assert.deepEqual(second.case.missing_fields, []);
  assert.equal(second.case.collected_fields.amount, "1200 baht");
  assert.equal(second.case.collected_fields.time, "Around 8 PM");

  const confirmed = await processTravelerMessage({
    channel: "line",
    sender,
    message: "yes",
    location: null
  });

  assert.equal(confirmed.action, "case_submitted");
  assert.equal(confirmed.case.case_id, first.case.case_id);
  assert.equal(confirmed.case.status, "New");
  assert.equal(confirmed.case.workflow_state, "submitted");

  const persisted = await getCase(first.case.case_id);
  assert.equal(persisted.status, "New");
});

test("does not ask again for fields already included in the first message", async () => {
  const sender = `complete-scam-${Date.now()}`;

  const result = await processTravelerMessage({
    channel: "line",
    sender,
    message: "I was overcharged by a taxi near Siam on May 18 around 8 PM. I paid 1200 baht and have a receipt photo.",
    location: null
  });

  assert.equal(result.action, "case_started");
  assert.equal(result.case.workflow_state, "confirm_submit");
  assert.deepEqual(result.case.missing_fields, []);
  assert.equal(result.case.collected_fields.location, "Siam");
  assert.equal(result.case.collected_fields.amount, "1200 baht");
  assert.match(result.case.collected_fields.time, /May 18/i);
  assert.match(result.case.collected_fields.time, /8 PM/i);
  assert.ok(result.case.collected_fields.evidence);
});

test("keeps hypothetical advice questions out of the case workflow", async () => {
  const sender = `guidance-user-${Date.now()}`;

  const result = await processTravelerMessage({
    channel: "line",
    sender,
    message: "What should I do if I lose my passport in Bangkok?",
    location: null
  });

  assert.equal(result.action, "guidance_only");
  assert.equal(result.case, null);
  assert.equal(result.agent_result.should_create_case, false);
  assert.deepEqual(result.agent_result.missing_fields, []);
});

test("extracts time and place from later evidence updates without overwriting the original report", async () => {
  const sender = `lost-item-${Date.now()}`;

  const first = await processTravelerMessage({
    channel: "line",
    sender,
    message: "I lost my passport",
    location: null
  });

  assert.equal(first.action, "case_started");
  assert.ok(first.case.missing_fields.includes("last_seen_location"));
  assert.ok(first.case.missing_fields.includes("time"));

  const second = await processTravelerMessage({
    channel: "line",
    sender,
    message: "Last seen near Asok BTS yesterday around 6 PM",
    location: null
  });

  assert.equal(second.action, "case_updated");
  assert.equal(second.case.collected_fields.description, "I lost my passport");
  assert.equal(second.case.collected_fields.latest_message, "Last seen near Asok BTS yesterday around 6 PM");
  assert.equal(second.case.collected_fields.last_seen_location, "Asok BTS");
  assert.match(second.case.collected_fields.time, /yesterday/i);
  assert.match(second.case.collected_fields.time, /6 PM/i);
  assert.ok(!second.case.missing_fields.includes("last_seen_location"));
  assert.ok(!second.case.missing_fields.includes("time"));
});
