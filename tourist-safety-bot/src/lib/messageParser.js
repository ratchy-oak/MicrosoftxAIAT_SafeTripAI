function extractMockMessage(body) {
  if (!body || typeof body !== "object") {
    return null;
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return null;
  }

  return {
    channel: "mock",
    sender: body.sender || "demo-user",
    message: body.message.trim(),
    location: body.location || null,
    timestamp: body.timestamp || new Date().toISOString(),
    raw_payload: body
  };
}

function extractWhatsAppMessage(body) {
  try {
    const value = body.entry[0].changes[0].value;
    const message = value.messages && value.messages[0];

    if (!message) {
      return null;
    }

    if (message.type !== "text") {
      return {
        channel: "whatsapp",
        sender: message.from,
        message: `[Unsupported ${message.type} message]`,
        location: null,
        timestamp: timestampFromSeconds(message.timestamp),
        raw_payload: body
      };
    }

    return {
      channel: "whatsapp",
      sender: message.from,
      message: message.text.body,
      location: null,
      timestamp: timestampFromSeconds(message.timestamp),
      raw_payload: body
    };
  } catch {
    return null;
  }
}

function extractLineMessages(body) {
  if (!body || !Array.isArray(body.events)) {
    return [];
  }

  return body.events
    .filter((event) => event.type === "message" && event.replyToken)
    .map((event) => {
      const message = event.message || {};
      const source = event.source || {};

      return {
        channel: "line",
        sender: source.userId || source.groupId || source.roomId || "unknown-line-user",
        replyToken: event.replyToken,
        message: message.type === "text" ? message.text : `[Unsupported ${message.type || "unknown"} message]`,
        location: null,
        timestamp: timestampFromMilliseconds(event.timestamp),
        raw_payload: event
      };
    });
}

function timestampFromSeconds(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
}

function timestampFromMilliseconds(value) {
  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) && milliseconds > 0
    ? new Date(milliseconds).toISOString()
    : new Date().toISOString();
}

module.exports = {
  extractMockMessage,
  extractWhatsAppMessage,
  extractLineMessages
};
