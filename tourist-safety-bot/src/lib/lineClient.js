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
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

async function replyLineMessage(replyToken, message) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    return {
      skipped: true,
      reason: "Missing LINE_CHANNEL_ACCESS_TOKEN"
    };
  }

  // LINE rejects text messages longer than 5000 characters.
  const text = String(message || "");
  const safeText = text.length > 5000 ? `${text.slice(0, 4997)}...` : text;

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
          text: safeText
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
