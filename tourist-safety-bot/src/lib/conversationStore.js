const { TableClient } = require("@azure/data-tables");

const tableName = process.env.CONVERSATIONS_TABLE_NAME || "SafeTripConversations";
const memoryConversations = new Map();
let tableClient;
let tableReadyPromise;

function getConversationId(channel, sender) {
  return `${String(channel || "unknown").trim()}:${String(sender || "unknown").trim()}`;
}

function getTableClient() {
  const connectionString = process.env.AzureWebJobsStorage;

  if (!connectionString || connectionString === "UseDevelopmentStorage=true") {
    return null;
  }

  if (!tableClient) {
    tableClient = TableClient.fromConnectionString(connectionString, tableName);
  }

  return tableClient;
}

async function ensureTable() {
  const client = getTableClient();

  if (!client) {
    return null;
  }

  if (!tableReadyPromise) {
    tableReadyPromise = client.createTable().catch((error) => {
      if (error.statusCode !== 409) {
        tableReadyPromise = null;
        throw error;
      }
    });
  }

  await tableReadyPromise;
  return client;
}

async function getConversation(channel, sender) {
  const conversationId = getConversationId(channel, sender);

  try {
    const client = await ensureTable();

    if (client) {
      const entity = await client.getEntity("conversation", conversationId);
      return fromTableEntity(entity);
    }
  } catch (error) {
    if (error.statusCode !== 404) {
      console.error("Failed to load conversation", error.message);
    }
  }

  return memoryConversations.get(conversationId) || null;
}

async function upsertConversation({ channel, sender, active_case_id, workflow_state, pending_fields }) {
  const now = new Date().toISOString();
  const record = {
    conversation_id: getConversationId(channel, sender),
    channel: String(channel || "unknown").trim(),
    sender: String(sender || "unknown").trim(),
    active_case_id: String(active_case_id || "").trim(),
    workflow_state: String(workflow_state || "collect_evidence").trim(),
    pending_fields: Array.isArray(pending_fields) ? pending_fields : [],
    updated_at: now
  };

  memoryConversations.set(record.conversation_id, record);

  try {
    const client = await ensureTable();

    if (client) {
      await client.upsertEntity(toTableEntity(record), "Replace");
    }
  } catch (error) {
    console.error("Failed to persist conversation", error.message);
  }

  return record;
}

async function clearConversation(channel, sender) {
  const conversationId = getConversationId(channel, sender);
  memoryConversations.delete(conversationId);

  try {
    const client = await ensureTable();

    if (client) {
      await client.deleteEntity("conversation", conversationId);
      return true;
    }
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }

    console.error("Failed to delete conversation", error.message);
  }

  return true;
}

function toTableEntity(record) {
  return {
    partitionKey: "conversation",
    rowKey: record.conversation_id,
    channel: record.channel,
    sender: record.sender,
    active_case_id: record.active_case_id,
    workflow_state: record.workflow_state,
    pending_fields: JSON.stringify(record.pending_fields || []),
    updated_at: record.updated_at
  };
}

function fromTableEntity(entity) {
  return {
    conversation_id: entity.rowKey,
    channel: entity.channel,
    sender: entity.sender,
    active_case_id: entity.active_case_id,
    workflow_state: entity.workflow_state,
    pending_fields: parseJson(entity.pending_fields, []),
    updated_at: entity.updated_at
  };
}

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = {
  clearConversation,
  getConversation,
  getConversationId,
  upsertConversation
};
