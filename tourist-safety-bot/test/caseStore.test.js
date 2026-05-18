const assert = require("node:assert/strict");
const test = require("node:test");

const { createManualCase, deleteCase, getCase, updateCase } = require("../src/lib/caseStore");

test("creates, updates, and deletes a manual case", async () => {
  const created = await createManualCase({
    description: "CRUD test tourist report",
    incident_type: "scam",
    severity: "medium",
    location: "Siam, Bangkok"
  });

  assert.match(created.case_id, /^CASE-/);
  assert.equal(created.channel, "manual");
  assert.equal(created.status, "New");

  const updated = await updateCase(created.case_id, {
    status: "In progress",
    severity: "high",
    location: "Phaya Thai, Bangkok",
    unexpected_field: "ignored"
  });

  assert.equal(updated.status, "In progress");
  assert.equal(updated.severity, "high");
  assert.equal(updated.location, "Phaya Thai, Bangkok");
  assert.equal(updated.unexpected_field, undefined);

  const deleted = await deleteCase(created.case_id);
  assert.equal(deleted, true);

  const afterDelete = await getCase(created.case_id);
  assert.equal(afterDelete, null);
});
