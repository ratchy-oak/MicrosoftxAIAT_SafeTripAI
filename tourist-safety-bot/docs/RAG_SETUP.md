# SafeTripAI Azure Foundry RAG Setup

This project already supports two modes:

1. Mock agent mode: works immediately and keeps the LINE demo alive.
2. Azure Foundry Agent mode: enabled when Azure Foundry settings are added to the Function App.

## What is already in the code

- `src/lib/touristSafetyAgent.js` calls Azure Foundry first when configured.
- If Azure Foundry fails or is not configured, it falls back to the local mock agent.
- `docs/*.md` contains the starter knowledge base for RAG.
- `scripts/create-foundry-agent.mjs` creates a vector store, uploads the docs, and creates the Foundry Agent with file search.

## Environment variables

Set these in Azure Function App > Settings > Environment variables:

```text
AZURE_AI_USE_AGENT=true
FOUNDRY_PROJECT_ENDPOINT=<your Azure AI Foundry project endpoint>
AZURE_AI_AGENT_NAME=SafeTripAITouristSafetyAgent
```

For local setup, add the same values to `local.settings.json`.

## Create the Foundry Agent from this repo

Before running the script, sign in with Azure CLI and make sure your active subscription contains the Azure AI Foundry project:

```bash
az login
az account set --subscription "<your subscription id>"
```

Then run:

```bash
cd tourist-safety-bot
export FOUNDRY_PROJECT_ENDPOINT="<your Foundry project endpoint>"
export AZURE_AI_MODEL_DEPLOYMENT="<your model deployment name>"
export AZURE_AI_AGENT_NAME="SafeTripAITouristSafetyAgent"
npm run create:foundry-agent
```

The script prints the Function App environment variables to use after the agent is created.

## Azure permission needed

The deployed Function App needs permission to call the Foundry project.

Recommended production/demo setup:

1. Open Azure Portal.
2. Open Function App `safetripai-func`.
3. Go to Identity.
4. Enable System assigned managed identity.
5. Open your Azure AI Foundry project or Azure AI resource.
6. Go to Access control (IAM).
7. Add role assignment for the Function App managed identity.
8. Use an Azure AI/Foundry role that can run agents, such as Azure AI User or equivalent in your resource.
9. Restart the Function App.

## Test

Send a LINE message to the SafeTrip AI official account:

```text
I was overcharged by a taxi near Siam. What should I do?
```

Expected behavior:

- LINE replies with the Azure Foundry Agent answer.
- Medium/high incidents still create a case.
- The dashboard updates at `/api/dashboard`.

If Azure Foundry is not ready, the app still falls back to the mock agent so the demo continues working.

