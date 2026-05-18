const { app } = require("@azure/functions");
const { processTravelerMessage } = require("../lib/evidenceWorkflow");
const { extractMockMessage } = require("../lib/messageParser");

app.http("mockChat", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "mockChat",
  handler: async (request) => {
    const body = await request.json().catch(() => null);
    const normalized = extractMockMessage(body);

    if (!normalized) {
      return {
        status: 400,
        jsonBody: {
          error: "Send JSON like { \"message\": \"I was overcharged by taxi near Siam\" }"
        }
      };
    }

    const workflowResult = await processTravelerMessage(normalized);

    return {
      status: 200,
      jsonBody: {
        received_message: normalized.message,
        action: workflowResult.action,
        agent_result: workflowResult.agent_result,
        case: workflowResult.case
      }
    };
  }
});
