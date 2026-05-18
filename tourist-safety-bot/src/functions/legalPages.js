const { app } = require("@azure/functions");

const privacyHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SafeTripAI Privacy Policy</title>
  <style>
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
      margin: 0;
      color: #172026;
      background: #fff;
    }
    main {
      max-width: 780px;
      margin: 0 auto;
      padding: 40px 20px 64px;
    }
    h1 {
      font-size: 28px;
      margin: 0 0 8px;
      letter-spacing: 0;
    }
    h2 {
      font-size: 18px;
      margin-top: 28px;
      letter-spacing: 0;
    }
    p, li {
      color: #384750;
    }
  </style>
</head>
<body>
  <main>
    <h1>SafeTripAI Privacy Policy</h1>
    <p>Last updated: May 17, 2026</p>
    <p>SafeTripAI is a tourist safety assistance demo that helps prepare incident reports from user-submitted messages.</p>

    <h2>Information We Process</h2>
    <p>When a user sends a message to SafeTripAI, we may process the message text, sender identifier, approximate location if provided, incident category, severity, timestamp, and case status.</p>

    <h2>How We Use Information</h2>
    <p>We use submitted information to classify safety incidents, prepare case records, generate first-step safety guidance, and display cases in the demo dashboard.</p>

    <h2>Sharing</h2>
    <p>This demo does not sell personal information. In a production deployment, incident reports may be shared only with authorized safety or support personnel for response and follow-up.</p>

    <h2>Retention</h2>
    <p>The deployed demo stores case records in Azure Table Storage when configured. Local development may use temporary in-memory storage. A production deployment should define a formal retention schedule.</p>

    <h2>User Requests</h2>
    <p>Users may request deletion of demo data using the data deletion page linked below.</p>

    <h2>Contact</h2>
    <p>For demo privacy questions, contact the SafeTripAI project owner.</p>
  </main>
</body>
</html>`;

const deletionHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SafeTripAI Data Deletion</title>
  <style>
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
      margin: 0;
      color: #172026;
      background: #fff;
    }
    main {
      max-width: 780px;
      margin: 0 auto;
      padding: 40px 20px 64px;
    }
    h1 {
      font-size: 28px;
      margin: 0 0 8px;
      letter-spacing: 0;
    }
    p, li {
      color: #384750;
    }
  </style>
</head>
<body>
  <main>
    <h1>SafeTripAI Data Deletion Instructions</h1>
    <p>Last updated: May 17, 2026</p>
    <p>SafeTripAI is currently a demo application. Deployed demo records may be stored in Azure Table Storage, while local development records may be stored temporarily in memory.</p>
    <p>For a deployed production system, users can request deletion by contacting the SafeTripAI project owner and providing the phone number or sender identifier used for the report.</p>
  </main>
</body>
</html>`;

app.http("privacyPolicy", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "privacy",
  handler: async () => ({
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    },
    body: privacyHtml
  })
});

app.http("dataDeletion", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "data-deletion",
  handler: async () => ({
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    },
    body: deletionHtml
  })
});
