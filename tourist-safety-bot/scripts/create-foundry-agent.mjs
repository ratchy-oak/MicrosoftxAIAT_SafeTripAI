import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const projectRoot = path.resolve(__dirname, "..");
const docsDir = path.join(projectRoot, "docs");

const endpoint = process.env.FOUNDRY_PROJECT_ENDPOINT || process.env.AZURE_AI_PROJECT_ENDPOINT;
const deploymentName =
  process.env.AZURE_AI_MODEL_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || process.env.MODEL_DEPLOYMENT_NAME;
const agentName = process.env.AZURE_AI_AGENT_NAME || "SafeTripAITouristSafetyAgent";

if (!endpoint) {
  throw new Error("Missing FOUNDRY_PROJECT_ENDPOINT. Copy it from your Azure AI Foundry project overview.");
}

if (!deploymentName) {
  throw new Error("Missing AZURE_AI_MODEL_DEPLOYMENT. Use the model deployment name from Foundry Models + endpoints.");
}

const { TOURIST_SAFETY_AGENT_INSTRUCTIONS } = require("../src/lib/agentInstructions");

const project = new AIProjectClient(endpoint, new DefaultAzureCredential());
const openAIClient = project.getOpenAIClient();

const vectorStore = await openAIClient.vectorStores.create({
  name: `${agentName}-Knowledge`
});

const docFiles = fs
  .readdirSync(docsDir)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort();

for (const fileName of docFiles) {
  const filePath = path.join(docsDir, fileName);
  const fileStream = fs.createReadStream(filePath);
  const uploadedFile = await openAIClient.vectorStores.files.uploadAndPoll(vectorStore.id, fileStream);
  console.log(`Uploaded ${fileName}: ${uploadedFile.id}`);
}

const agent = await project.agents.createVersion(agentName, {
  kind: "prompt",
  model: deploymentName,
  instructions: TOURIST_SAFETY_AGENT_INSTRUCTIONS,
  tools: [
    {
      type: "file_search",
      vector_store_ids: [vectorStore.id]
    }
  ]
});

console.log("");
console.log("Azure Foundry Agent is ready.");
console.log(`Agent name: ${agent.name}`);
console.log(`Agent version: ${agent.version}`);
console.log("");
console.log("Set these Function App environment variables:");
console.log("AZURE_AI_USE_AGENT=true");
console.log(`FOUNDRY_PROJECT_ENDPOINT=${endpoint}`);
console.log(`AZURE_AI_AGENT_NAME=${agent.name}`);
