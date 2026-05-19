const { app } = require("@azure/functions");
const { processTravelerMessage } = require("../lib/evidenceWorkflow");
const { extractLineMessages } = require("../lib/messageParser");
const { replyLineMessage, verifyLineSignature } = require("../lib/lineClient");

app.http("lineWebhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "lineWebhook",
  handler: async (request, context) => {
    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature");

    if (!verifyLineSignature(rawBody, signature)) {
      context.warn("LINE webhook rejected: invalid signature");
      return {
        status: 401,
        jsonBody: {
          error: "Invalid LINE signature"
        }
      };
    }

    let body;
    try {
      body = JSON.parse(rawBody || "{}");
    } catch {
      context.warn("LINE webhook rejected: invalid JSON body");
      return {
        status: 400,
        jsonBody: {
          error: "Invalid request body"
        }
      };
    }
    context.log("LINE webhook received", JSON.stringify(body));

    const messages = extractLineMessages(body);

    if (!messages.length) {
      context.log("LINE webhook ignored: no supported message found");
      return {
        status: 200,
        jsonBody: {
          status: "ignored",
          reason: "No supported LINE message found"
        }
      };
    }

    const results = [];

    for (const normalized of messages) {
      context.log(
        "LINE message extracted",
        JSON.stringify({
          sender: normalized.sender,
          message: normalized.message
        })
      );

      if (normalized.message.startsWith("[Unsupported")) {
        const unsupportedReply = /[฀-๿]/.test(normalized.message)
          ? "ระบบรองรับเฉพาะข้อความตัวอักษรครับ กรุณาพิมพ์อธิบายปัญหาของคุณ"
          : "Please send a text message describing your situation.";
        await replyLineMessage(normalized.replyToken, unsupportedReply);
        results.push({ received_message: normalized.message, action: "unsupported_message_type" });
        continue;
      }

      const workflowResult = await processTravelerMessage(normalized);
      context.log("Workflow result", JSON.stringify(workflowResult));

      const lineReply = await replyLineMessage(normalized.replyToken, workflowResult.reply);
      context.log("LINE reply result", JSON.stringify(lineReply));

      results.push({
        received_message: normalized.message,
        action: workflowResult.action,
        agent_result: workflowResult.agent_result,
        case: workflowResult.case,
        line_reply: lineReply
      });
    }

    return {
      status: 200,
      jsonBody: {
        status: "processed",
        results
      }
    };
  }
});
