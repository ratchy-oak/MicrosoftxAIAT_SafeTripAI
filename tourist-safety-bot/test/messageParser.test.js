const test = require("node:test");
const assert = require("node:assert/strict");
const { extractLineMessages, extractMockMessage, extractWhatsAppMessage } = require("../src/lib/messageParser");

test("extracts mock messages", () => {
  const result = extractMockMessage({
    sender: "demo-user",
    message: "Lost passport",
    location: "Asok"
  });

  assert.equal(result.channel, "mock");
  assert.equal(result.sender, "demo-user");
  assert.equal(result.message, "Lost passport");
  assert.equal(result.location, "Asok");
});

test("extracts text from WhatsApp Cloud API payload", () => {
  const result = extractWhatsAppMessage({
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  from: "66812345678",
                  type: "text",
                  text: {
                    body: "I need help"
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  });

  assert.equal(result.channel, "whatsapp");
  assert.equal(result.sender, "66812345678");
  assert.equal(result.message, "I need help");
});

test("extracts LINE text message events", () => {
  const result = extractLineMessages({
    events: [
      {
        type: "message",
        replyToken: "reply-token",
        source: {
          type: "user",
          userId: "U123"
        },
        message: {
          type: "text",
          text: "I lost my passport"
        }
      }
    ]
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].channel, "line");
  assert.equal(result[0].sender, "U123");
  assert.equal(result[0].replyToken, "reply-token");
  assert.equal(result[0].message, "I lost my passport");
});
