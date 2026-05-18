const { app } = require("@azure/functions");
const { createManualCase, deleteCase, getCase, listCases, updateCase } = require("../lib/caseStore");
const { calculateMissingFields } = require("../lib/evidenceWorkflow");

app.http("cases", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "cases",
  handler: async (request) => {
    if (request.method === "POST") {
      const body = await request.json().catch(() => null);

      try {
        const createdCase = await createManualCase(body || {});

        return {
          status: 201,
          jsonBody: {
            case: normalizeCaseForResponse(createdCase)
          }
        };
      } catch (error) {
        return {
          status: 400,
          jsonBody: {
            error: error.message
          }
        };
      }
    }

    const cases = await listCases();

    return {
      status: 200,
      jsonBody: {
        cases: cases.map(normalizeCaseForResponse)
      }
    };
  }
});

app.http("caseById", {
  methods: ["GET", "PATCH", "DELETE"],
  authLevel: "anonymous",
  route: "cases/{caseId}",
  handler: async (request) => {
    const caseId = request.params.caseId;

    if (request.method === "GET") {
      const foundCase = await getCase(caseId);

      if (!foundCase) {
        return {
          status: 404,
          jsonBody: {
            error: "Case not found"
          }
        };
      }

      return {
        status: 200,
        jsonBody: {
          case: normalizeCaseForResponse(foundCase)
        }
      };
    }

    if (request.method === "PATCH") {
      const body = await request.json().catch(() => null);
      const updatedCase = await updateCase(caseId, body || {});

      if (!updatedCase) {
        return {
          status: 404,
          jsonBody: {
            error: "Case not found"
          }
        };
      }

      return {
        status: 200,
        jsonBody: {
          case: normalizeCaseForResponse(updatedCase)
        }
      };
    }

    const deleted = await deleteCase(caseId);

    return {
      status: deleted ? 200 : 404,
      jsonBody: {
        deleted
      }
    };
  }
});

function normalizeCaseForResponse(caseRecord) {
  if (!caseRecord) {
    return caseRecord;
  }

  const workflowState = caseRecord.workflow_state || "manual";
  const evidenceStatus = caseRecord.evidence_status || "unknown";
  const shouldClearMissing = ["submitted", "tracking", "closed"].includes(workflowState) || evidenceStatus === "full";
  const missingFields = shouldClearMissing
    ? []
    : calculateMissingFields(caseRecord.incident_type, caseRecord.collected_fields || {});

  return {
    ...caseRecord,
    missing_fields: missingFields
  };
}
