const { app } = require("@azure/functions");
const { processTravelerMessage } = require("../lib/evidenceWorkflow");
const { extractWhatsAppMessage } = require("../lib/messageParser");
const { sendWhatsAppMessage } = require("../lib/whatsappClient");

app.http("whatsappWebhook", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "whatsappWebhook",
  handler: async (request, context) => {
    if (request.method === "GET") {
      const mode = request.query.get("hub.mode");
      const token = request.query.get("hub.verify_token");
      const challenge = request.query.get("hub.challenge");
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "tourist_safety_verify";

      if (mode === "subscribe" && token === verifyToken) {
        return {
          status: 200,
          body: challenge || ""
        };
      }

      return {
        status: 403,
        body: "Verification failed"
      };
    }

    const body = await request.json().catch(() => null);
    context.log("WhatsApp webhook received", JSON.stringify(body));

    const normalized = extractWhatsAppMessage(body);

    if (!normalized) {
      context.log("WhatsApp webhook ignored: no supported message found");
      return {
        status: 200,
        jsonBody: {
          status: "ignored",
          reason: "No supported WhatsApp message found"
        }
      };
    }

    context.log(
      "WhatsApp message extracted",
      JSON.stringify({
        sender: normalized.sender,
        message: normalized.message
      })
    );

    if (normalized.message.startsWith("[Unsupported")) {
      const unsupportedReply = "Please send a text message describing your situation.";
      await sendWhatsAppMessage(normalized.sender, unsupportedReply);
      return {
        status: 200,
        jsonBody: {
          status: "processed",
          received_message: normalized.message,
          action: "unsupported_message_type"
        }
      };
    }

    const workflowResult = await processTravelerMessage(normalized);
    context.log("Workflow result", JSON.stringify(workflowResult));

    const whatsappSend = await sendWhatsAppMessage(normalized.sender, workflowResult.reply);
    context.log("WhatsApp send result", JSON.stringify(whatsappSend));

    return {
      status: 200,
      jsonBody: {
        status: "processed",
        received_message: normalized.message,
        action: workflowResult.action,
        agent_result: workflowResult.agent_result,
        case: workflowResult.case,
        whatsapp_send: whatsappSend
      }
    };
  }
});
