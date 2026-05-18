# SafeTripAI Tourist Safety Bot

Demo backend for a tourist safety assistant with:

- Mock chat endpoint for reliable demos
- WhatsApp webhook verification and message handling
- In-memory case creation
- Simple browser dashboard

## Local Prerequisites

Use Node.js 22 for Azure Functions:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH node -v
func --version
az --version
```

Expected:

- Node `v22.x`
- Azure Functions Core Tools `4.x`
- Azure CLI installed

## Run Locally

```bash
cd tourist-safety-bot
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm install
PATH=/opt/homebrew/opt/node@22/bin:$PATH func start
```

Open:

```text
http://localhost:7071/api/dashboard
```

## Test With Curl

Mock chat:

```bash
curl -s -X POST http://localhost:7071/api/mockChat \
  -H 'Content-Type: application/json' \
  -d '{"message":"I was overcharged by a taxi near Siam","location":"Siam, Bangkok"}'
```

Cases:

```bash
curl -s http://localhost:7071/api/cases
```

WhatsApp webhook verification:

```bash
curl -s 'http://localhost:7071/api/whatsappWebhook?hub.mode=subscribe&hub.verify_token=tourist_safety_verify&hub.challenge=test123'
```

Expected response:

```text
test123
```

Legal pages for Meta app setup:

```text
http://localhost:7071/api/privacy
http://localhost:7071/api/data-deletion
```

## Environment Variables

Local values are in `local.settings.json`.

For real WhatsApp Cloud API, set these in Azure Function App configuration:

```text
WHATSAPP_VERIFY_TOKEN=tourist_safety_verify
WHATSAPP_ACCESS_TOKEN=<Meta access token>
WHATSAPP_PHONE_NUMBER_ID=<Meta phone number id>
GRAPH_API_VERSION=v24.0
```

## Current Demo Scope

This version intentionally uses:

- Mock agent logic in `src/lib/touristSafetyAgent.js`
- In-memory cases in `src/lib/caseStore.js`
- Mock dashboard served by Azure Functions

Next production upgrades:

1. Persist cases in Azure Table Storage or Cosmos DB.
2. Replace mock agent logic with Azure AI Foundry or Azure OpenAI.
3. Add authentication to the dashboard.
4. Configure WhatsApp Cloud API webhook in Meta Developer Console.
