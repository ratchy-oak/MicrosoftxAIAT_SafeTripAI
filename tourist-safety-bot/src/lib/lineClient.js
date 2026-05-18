const crypto = require("node:crypto");

function verifyLineSignature(rawBody, signature) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelSecret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function replyLineMessage(replyToken, message) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    return {
      skipped: true,
      reason: "Missing LINE_CHANNEL_ACCESS_TOKEN"
    };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text: message
        }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));

  return {
    skipped: false,
    ok: response.ok,
    status: response.status,
    data
  };
}

module.exports = {
  replyLineMessage,
  verifyLineSignature
};
