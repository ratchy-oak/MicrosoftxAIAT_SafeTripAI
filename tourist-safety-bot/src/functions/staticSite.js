const { app } = require("@azure/functions");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SafeTripAI Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f7fb;
      --surface: #ffffff;
      --surface-soft: #f8fafc;
      --ink: #15202b;
      --muted: #657586;
      --line: #e2e8f0;
      --blue: #2563eb;
      --blue-dark: #1d4ed8;
      --green: #16803c;
      --green-bg: #e9f8ef;
      --amber: #9a5b00;
      --amber-bg: #fff5dc;
      --red: #c82d2d;
      --red-bg: #fff0f0;
      --violet: #6d4aff;
      --shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--bg);
    }
    button, input, select, textarea {
      font: inherit;
    }
    button {
      border: 0;
      cursor: pointer;
    }
    .app-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 244px 1fr;
    }
    .sidebar {
      background: #111827;
      color: #e5edf7;
      padding: 26px 20px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 750;
      font-size: 18px;
      letter-spacing: 0;
    }
    .brand-logo {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: #ffffff;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    }
    .brand-logo svg {
      width: 28px;
      height: 28px;
      display: block;
    }
    .nav-label {
      color: #94a3b8;
      font-size: 12px;
      text-transform: uppercase;
      margin: 10px 8px 8px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: #e5edf7;
      text-decoration: none;
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(255,255,255,0.08);
      font-weight: 650;
    }
    .sidebar-note {
      margin-top: auto;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      padding: 14px;
      color: #cbd5e1;
      font-size: 13px;
      line-height: 1.45;
      background: rgba(255,255,255,0.05);
    }
    .main {
      min-width: 0;
      padding: 30px clamp(24px, 3vw, 42px);
    }
    .topbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0;
      font-size: 30px;
      letter-spacing: 0;
      line-height: 1.1;
    }
    .subtitle {
      color: var(--muted);
      margin-top: 8px;
      line-height: 1.4;
      max-width: 760px;
    }
    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .button {
      min-height: 42px;
      border-radius: 8px;
      padding: 10px 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--surface);
      color: var(--ink);
      border: 1px solid var(--line);
      font-weight: 700;
      transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
    }
    .button:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(22, 34, 51, 0.08);
    }
    .button.primary {
      color: #fff;
      background: var(--blue);
      border-color: var(--blue);
    }
    .button.primary:hover {
      background: var(--blue-dark);
    }
    .button.danger {
      color: var(--red);
      border-color: #f2c1c1;
      background: #fffafa;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 18px;
      margin-bottom: 24px;
    }
    .metric {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(22, 34, 51, 0.05);
    }
    .metric-label {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 780;
      letter-spacing: 0;
    }
    .metric-accent {
      width: 34px;
      height: 3px;
      border-radius: 999px;
      margin-top: 12px;
      background: var(--blue);
    }
    .metric.high .metric-accent { background: var(--red); }
    .metric.medium .metric-accent { background: #e3a008; }
    .metric.resolved .metric-accent { background: var(--green); }
    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .panel-head {
      padding: 18px 20px;
      display: grid;
      grid-template-columns: minmax(280px, 1fr) 180px 180px;
      gap: 14px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-soft);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: 12px;
      color: var(--muted);
      font-weight: 650;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      min-height: 44px;
      padding: 12px 14px;
      background: #fff;
      color: var(--ink);
      outline: none;
      transition: border-color 140ms ease, box-shadow 140ms ease;
    }
    textarea {
      min-height: 92px;
      resize: vertical;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
    }
    .table-wrap {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 13px;
      min-width: 1180px;
    }
    th, td {
      text-align: left;
      padding: 18px 10px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
      overflow-wrap: anywhere;
      overflow: hidden;
    }
    th {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      background: #fff;
      letter-spacing: 0;
      white-space: nowrap;
    }
    tbody tr {
      transition: background 140ms ease;
    }
    tbody tr:hover {
      background: #f8fbff;
    }
    th:nth-child(1), td:nth-child(1) { width: 14%; }
    th:nth-child(2), td:nth-child(2) { width: 10%; }
    th:nth-child(3), td:nth-child(3) { width: 8%; }
    th:nth-child(4), td:nth-child(4) { width: 7%; }
    th:nth-child(5), td:nth-child(5) { width: 8%; }
    th:nth-child(6), td:nth-child(6) { width: 7%; }
    th:nth-child(7), td:nth-child(7) { width: 8%; }
    th:nth-child(8), td:nth-child(8) { width: 8%; }
    th:nth-child(9), td:nth-child(9) { width: 23%; }
    th:nth-child(10), td:nth-child(10) { width: 7%; }
    .case-id {
      font-weight: 750;
      color: #1f2937;
      line-height: 1.2;
      word-break: break-word;
    }
    .meta {
      color: var(--muted);
      font-size: 12px;
      margin-top: 6px;
      line-height: 1.35;
    }
    .sender-meta {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .channel-badge {
      display: inline-flex;
      align-items: center;
      justify-self: start;
      border-radius: 7px;
      padding: 5px 8px;
      background: #eef2f7;
      color: #334155;
      font-size: 12px;
      font-weight: 750;
      text-transform: capitalize;
      white-space: nowrap;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      justify-self: start;
      border-radius: 999px;
      padding: 5px 9px;
      font-size: 12px;
      font-weight: 750;
      text-transform: capitalize;
      white-space: nowrap;
    }
    .pill.high { background: var(--red-bg); color: var(--red); }
    .pill.medium { background: var(--amber-bg); color: var(--amber); }
    .pill.low { background: var(--green-bg); color: var(--green); }
    .type-label {
      display: inline-flex;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.25;
    }
    .status {
      display: inline-flex;
      justify-self: start;
      max-width: 100%;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 9px;
      color: #334155;
      background: #fff;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .status.status-new { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
    .status.status-in-progress { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }
    .status.status-waiting-info { background: var(--amber-bg); border-color: #fde68a; color: var(--amber); }
    .status.status-pending-confirmation { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }
    .status.status-resolved, .status.status-closed { background: var(--green-bg); border-color: #bbf7d0; color: var(--green); }
    .workflow {
      display: inline-flex;
      justify-self: start;
      min-width: 0;
      border-radius: 999px;
      padding: 5px 9px;
      color: #1e3a8a;
      background: #eff6ff;
      font-size: 12px;
      font-weight: 750;
      text-transform: capitalize;
      line-height: 1.1;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .evidence {
      display: inline-flex;
      justify-self: start;
      border-radius: 999px;
      padding: 5px 9px;
      color: var(--muted);
      background: #f3f6fa;
      font-size: 12px;
      font-weight: 750;
      text-transform: capitalize;
      white-space: nowrap;
    }
    .evidence.full { background: var(--green-bg); color: var(--green); }
    .evidence.partial { background: var(--amber-bg); color: var(--amber); }
    .evidence.none, .evidence.unknown { background: var(--red-bg); color: var(--red); }
    .description-text,
    .reply-text {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .description-text {
      -webkit-line-clamp: 3;
      line-clamp: 3;
      line-height: 1.35;
    }
    .reply-text {
      -webkit-line-clamp: 2;
      line-clamp: 2;
      border-top: 1px solid #eef2f7;
      padding-top: 8px;
      margin-top: 10px;
      color: var(--muted);
      line-height: 1.35;
    }
    .description-cell {
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .detail-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
      overflow: hidden;
    }
    .detail-chip {
      display: inline-flex;
      align-items: center;
      max-width: min(100%, 220px);
      border: 1px solid #dbeafe;
      border-radius: 8px;
      background: #eff6ff;
      color: #1e40af;
      font-size: 11px;
      font-weight: 750;
      padding: 4px 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .detail-more {
      color: #475569;
      background: #f8fafc;
      border-color: #e2e8f0;
    }
    .field-section {
      grid-column: 1 / -1;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      background: #fbfdff;
    }
    .field-section-title {
      font-size: 13px;
      font-weight: 780;
      color: #233142;
      margin-bottom: 12px;
    }
    .field-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .field-grid .span-2 {
      grid-column: 1 / -1;
    }
    .row-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: stretch;
    }
    .link-button {
      color: var(--blue);
      background: #eff6ff;
      border-radius: 7px;
      padding: 7px 9px;
      font-weight: 750;
      min-width: 64px;
      text-align: center;
      white-space: nowrap;
    }
    .delete-button {
      color: var(--red);
      background: #fff1f2;
      border-radius: 7px;
      padding: 7px 9px;
      font-weight: 750;
      min-width: 64px;
      text-align: center;
      white-space: nowrap;
    }
    @media (max-width: 1320px) and (min-width: 821px) {
      .app-shell { grid-template-columns: 220px 1fr; }
      .sidebar { padding-left: 16px; padding-right: 16px; }
      .main { padding: 26px 24px; }
      table {
        min-width: 1120px;
        font-size: 12px;
      }
      th, td {
        padding: 16px 8px;
      }
      .case-id {
        font-size: 13px;
      }
      .workflow,
      .status,
      .pill,
      .evidence,
      .channel-badge {
        font-size: 11px;
        padding: 5px 7px;
      }
      .detail-chip {
        font-size: 10px;
        max-width: 160px;
      }
      .link-button,
      .delete-button {
        padding: 7px 8px;
      }
    }
    .empty {
      text-align: center;
      color: var(--muted);
      padding: 46px 12px;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.48);
      padding: 20px;
      z-index: 20;
    }
    .modal-backdrop.open {
      display: flex;
    }
    .modal {
      width: min(980px, 100%);
      max-height: calc(100dvh - 32px);
      background: var(--surface);
      border-radius: 8px;
      box-shadow: 0 28px 70px rgba(15, 23, 42, 0.28);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal-head {
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--line);
    }
    .modal-title {
      font-size: 18px;
      font-weight: 780;
    }
    .modal-body {
      padding: 18px 20px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      overflow-y: auto;
    }
    .modal-body .span-2 {
      grid-column: 1 / -1;
    }
    .modal-foot {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid var(--line);
      background: var(--surface-soft);
    }
    .confirm-card {
      width: min(420px, 100%);
      background: var(--surface);
      border-radius: 8px;
      box-shadow: 0 28px 70px rgba(15, 23, 42, 0.28);
      padding: 20px;
    }
    .confirm-title {
      font-size: 18px;
      font-weight: 780;
      margin-bottom: 8px;
    }
    .confirm-copy {
      color: var(--muted);
      line-height: 1.45;
      margin-bottom: 18px;
    }
    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .toast {
      position: fixed;
      right: 22px;
      bottom: 22px;
      background: #111827;
      color: #fff;
      padding: 12px 14px;
      border-radius: 8px;
      box-shadow: var(--shadow);
      opacity: 0;
      transform: translateY(10px);
      pointer-events: none;
      transition: opacity 180ms ease, transform 180ms ease;
      z-index: 30;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    @media (max-width: 1000px) {
      .app-shell { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .panel-head { grid-template-columns: 1fr; }
      .main { padding: 18px; }
    }
    @media (max-width: 820px) {
      .table-wrap {
        overflow-x: visible;
      }
      table,
      thead,
      tbody,
      tr,
      th,
      td {
        display: block;
        width: 100%;
      }
      table {
        min-width: 0;
        border-collapse: separate;
        border-spacing: 0 12px;
        padding: 12px;
      }
      thead {
        display: none;
      }
      tbody tr {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(22, 34, 51, 0.05);
        overflow: hidden;
      }
      tbody tr:hover {
        background: #fff;
      }
      th:nth-child(n), td:nth-child(n) {
        width: 100%;
      }
      td {
        display: grid;
        grid-template-columns: 112px minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        padding: 12px 14px;
        overflow: visible;
      }
      td::before {
        content: attr(data-label);
        color: var(--muted);
        font-size: 11px;
        font-weight: 780;
        text-transform: uppercase;
      }
      .row-actions {
        display: flex;
        flex-wrap: wrap;
      }
      .row-actions .link-button,
      .row-actions .delete-button {
        min-width: 92px;
      }
      .detail-list {
        flex-wrap: wrap;
        overflow: visible;
      }
      .detail-chip {
        max-width: 100%;
      }
    }
    @media (max-width: 620px) {
      .topbar { flex-direction: column; }
      .actions { width: 100%; justify-content: stretch; }
      .button { flex: 1; }
      .metrics { grid-template-columns: 1fr; }
      .modal-body { grid-template-columns: 1fr; }
      .field-grid { grid-template-columns: 1fr; }
      .modal-backdrop { padding: 10px; }
      .modal-head,
      .modal-body,
      .modal-foot { padding-left: 14px; padding-right: 14px; }
      .modal-foot {
        flex-direction: column-reverse;
      }
      .modal-foot .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      td {
        grid-template-columns: 1fr;
        gap: 6px;
      }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-logo" aria-hidden="true">
          <svg viewBox="0 0 100 112" role="img">
            <path fill="#2ecc71" d="M50 2 88 16v32c0 29.5-15.9 52.5-38 62C27.9 100.5 12 77.5 12 48V16L50 2Z"/>
            <path fill="#ffffff" d="M50 13 22 23v25c0 2.8.2 5.5.5 8H50V13Z"/>
            <path fill="#ffffff" d="M50 56v41.8C65.4 90 76.4 75 79 56H50Z"/>
          </svg>
        </div>
        <span>SafeTripAI</span>
      </div>
      <div>
        <div class="nav-label">Operations</div>
        <a class="nav-item" href="/api/dashboard">
          <span>Case dashboard</span>
          <span id="navCount">0</span>
        </a>
      </div>
    </aside>
    <main class="main">
      <section class="topbar">
        <div>
          <h1>Tourist Safety Cases</h1>
          <div class="subtitle">Track incoming reports, update follow-up status, and manage demo cases in one place.</div>
        </div>
        <div class="actions">
          <button class="button" id="refreshCases" type="button">Refresh</button>
          <button class="button primary" id="newCase" type="button">New case</button>
        </div>
      </section>

      <section class="metrics" aria-label="Case summary">
        <div class="metric">
          <div class="metric-label">Total cases</div>
          <div class="metric-value" id="totalCases">0</div>
          <div class="metric-accent"></div>
        </div>
        <div class="metric high">
          <div class="metric-label">High severity</div>
          <div class="metric-value" id="highCases">0</div>
          <div class="metric-accent"></div>
        </div>
        <div class="metric medium">
          <div class="metric-label">Active cases</div>
          <div class="metric-value" id="activeCases">0</div>
          <div class="metric-accent"></div>
        </div>
        <div class="metric resolved">
          <div class="metric-label">Resolved / closed</div>
          <div class="metric-value" id="closedCases">0</div>
          <div class="metric-accent"></div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="field">
            <label for="searchCases">Search</label>
            <input id="searchCases" type="search" placeholder="Search by case, location, sender, or description">
          </div>
          <div class="field">
            <label for="statusFilter">Status</label>
            <select id="statusFilter">
              <option value="">All statuses</option>
              <option>New</option>
              <option>In progress</option>
              <option>Waiting info</option>
              <option>Pending confirmation</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
          </div>
          <div class="field">
            <label for="severityFilter">Severity</label>
            <select id="severityFilter">
              <option value="">All severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Case</th>
                <th>Channel</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Workflow</th>
                <th>Evidence</th>
                <th>Location</th>
                <th>Status</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="caseRows"></tbody>
          </table>
        </div>
      </section>
    </main>
  </div>

  <div class="modal-backdrop" id="caseModal" aria-hidden="true">
    <form class="modal" id="caseForm">
      <div class="modal-head">
        <div class="modal-title" id="modalTitle">New case</div>
        <button class="link-button" id="closeModal" type="button">Close</button>
      </div>
      <div class="modal-body">
        <input id="caseId" type="hidden">
        <div class="field">
          <label for="caseChannel">Channel</label>
          <select id="caseChannel">
            <option>manual</option>
            <option>line</option>
            <option>mock</option>
            <option>whatsapp</option>
            <option>external</option>
          </select>
        </div>
        <div class="field">
          <label for="caseSender">Sender</label>
          <input id="caseSender" placeholder="dashboard-user">
        </div>
        <div class="field">
          <label for="caseType">Incident type</label>
          <select id="caseType">
            <option value="scam">Scam</option>
            <option value="crime">Crime</option>
            <option value="lost_item">Lost item</option>
            <option value="accident">Accident</option>
            <option value="medical_emergency">Medical emergency</option>
            <option value="transport">Transport</option>
            <option value="immigration">Immigration</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="field">
          <label for="caseSeverity">Severity</label>
          <select id="caseSeverity">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="field">
          <label for="caseStatus">Status</label>
          <select id="caseStatus">
            <option>New</option>
            <option>In progress</option>
            <option>Waiting info</option>
            <option>Pending confirmation</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
        </div>
        <div class="field">
          <label for="caseLocation">Location</label>
          <input id="caseLocation" placeholder="Siam, Bangkok">
        </div>
        <div class="field">
          <label for="caseWorkflow">Workflow</label>
          <select id="caseWorkflow">
            <option value="manual">Manual</option>
            <option value="intake">Intake</option>
            <option value="collect_evidence">Collect evidence</option>
            <option value="guidance">Guidance</option>
            <option value="draft_case_report">Draft case report</option>
            <option value="confirm_submit">Confirm submit</option>
            <option value="submitted">Submitted</option>
            <option value="tracking">Tracking</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div class="field">
          <label for="caseEvidence">Evidence</label>
          <select id="caseEvidence">
            <option value="unknown">Unknown</option>
            <option value="none">None</option>
            <option value="partial">Partial</option>
            <option value="full">Full</option>
          </select>
        </div>
        <div class="field span-2">
          <label for="caseDescription">Description</label>
          <textarea id="caseDescription" placeholder="Describe what happened" required></textarea>
        </div>
        <div class="field span-2">
          <label for="caseMissingFields">Missing fields</label>
          <input id="caseMissingFields" placeholder="location, time, evidence">
        </div>
        <div class="field-section">
          <div class="field-section-title">Collected information</div>
          <div class="field-grid">
            <div class="field">
              <label for="caseCollectedTime">Time</label>
              <input id="caseCollectedTime" placeholder="May 18, around 8 PM">
            </div>
            <div class="field">
              <label for="caseCollectedAmount">Amount</label>
              <input id="caseCollectedAmount" placeholder="1200 baht">
            </div>
            <div class="field">
              <label for="caseCollectedContact">Contact</label>
              <input id="caseCollectedContact" placeholder="LINE ID, phone, or email">
            </div>
            <div class="field">
              <label for="caseCollectedItem">Item</label>
              <input id="caseCollectedItem" placeholder="passport, wallet, phone">
            </div>
            <div class="field">
              <label for="caseCollectedParty">Person / business</label>
              <input id="caseCollectedParty" placeholder="taxi, shop, hotel, driver">
            </div>
            <div class="field">
              <label for="caseCollectedVehicle">Route / vehicle</label>
              <input id="caseCollectedVehicle" placeholder="taxi plate, route, vehicle detail">
            </div>
            <div class="field">
              <label for="caseCollectedSafety">Current safety</label>
              <input id="caseCollectedSafety" placeholder="safe now, still in danger">
            </div>
            <div class="field">
              <label for="caseCollectedInjury">Injury status</label>
              <input id="caseCollectedInjury" placeholder="no injury, injured, bleeding">
            </div>
            <div class="field">
              <label for="caseCollectedSuspect">Suspect detail</label>
              <input id="caseCollectedSuspect" placeholder="appearance, direction, name">
            </div>
            <div class="field">
              <label for="caseCollectedDeadline">Deadline</label>
              <input id="caseCollectedDeadline" placeholder="visa expiry, appointment, due date">
            </div>
            <div class="field span-2">
              <label for="caseCollectedEvidence">Evidence</label>
              <textarea id="caseCollectedEvidence" placeholder="receipt photo, screenshot, chat record, plate number"></textarea>
            </div>
          </div>
        </div>
        <div class="field-section">
          <div class="field-section-title">Case report</div>
          <div class="field-grid">
            <div class="field span-2">
              <label for="caseReportSummary">Summary</label>
              <textarea id="caseReportSummary" placeholder="Short summary for officer follow-up"></textarea>
            </div>
            <div class="field">
              <label for="caseReportAction">Recommended action</label>
              <input id="caseReportAction" placeholder="Officer follow-up recommended">
            </div>
            <div class="field">
              <label for="caseReportPriority">Priority note</label>
              <input id="caseReportPriority" placeholder="urgent, normal, needs more evidence">
            </div>
          </div>
        </div>
        <div class="field span-2">
          <label for="caseReply">Last reply / notes</label>
          <textarea id="caseReply" placeholder="Officer notes or latest chatbot reply"></textarea>
        </div>
      </div>
      <div class="modal-foot">
        <button class="button danger" id="deleteFromModal" type="button">Delete case</button>
        <div class="actions">
          <button class="button" id="cancelModal" type="button">Cancel</button>
          <button class="button primary" type="submit">Save case</button>
        </div>
      </div>
    </form>
  </div>

  <div class="modal-backdrop" id="confirmModal" aria-hidden="true">
    <div class="confirm-card" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
      <div class="confirm-title" id="confirmTitle">Delete this case?</div>
      <div class="confirm-copy">This will remove the case from the dashboard data. This action cannot be undone.</div>
      <div class="confirm-actions">
        <button class="button" id="cancelDelete" type="button">Cancel</button>
        <button class="button danger" id="confirmDelete" type="button">Delete case</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const state = {
      cases: [],
      filteredCases: []
    };

    const elements = {
      activeCases: document.querySelector("#activeCases"),
      caseRows: document.querySelector("#caseRows"),
      closedCases: document.querySelector("#closedCases"),
      highCases: document.querySelector("#highCases"),
      navCount: document.querySelector("#navCount"),
      searchCases: document.querySelector("#searchCases"),
      severityFilter: document.querySelector("#severityFilter"),
      statusFilter: document.querySelector("#statusFilter"),
      totalCases: document.querySelector("#totalCases"),
      toast: document.querySelector("#toast")
    };

    const modal = document.querySelector("#caseModal");
    const confirmModal = document.querySelector("#confirmModal");
    const form = document.querySelector("#caseForm");
    const modalTitle = document.querySelector("#modalTitle");
    const deleteFromModal = document.querySelector("#deleteFromModal");
    const cancelDelete = document.querySelector("#cancelDelete");
    const confirmDelete = document.querySelector("#confirmDelete");
    let pendingDeleteId = "";

    function escapeHtml(value) {
      const el = document.createElement("span");
      el.textContent = value == null ? "" : String(value);
      return el.innerHTML;
    }

    function formatDate(value) {
      if (!value) {
        return "";
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    }

    async function api(path, options) {
      const response = await fetch(path, {
        headers: {
          "Content-Type": "application/json"
        },
        ...options
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      return data;
    }

    async function loadCases(options = {}) {
      const data = await api("/api/cases");
      state.cases = Array.isArray(data.cases) ? data.cases : [];
      applyFilters();

      if (!options.silent) {
        showToast("Cases refreshed");
      }
    }

    function applyFilters() {
      const query = elements.searchCases.value.trim().toLowerCase();
      const status = elements.statusFilter.value;
      const severity = elements.severityFilter.value;

      state.filteredCases = state.cases.filter((item) => {
        const searchable = [
          item.case_id,
          item.channel,
          item.sender,
          item.incident_type,
          item.severity,
          item.workflow_state,
          item.evidence_status,
          formatMissingFields(item.missing_fields),
          item.location,
          item.status,
          item.description,
          JSON.stringify(item.collected_fields || {}),
          JSON.stringify(item.case_report || {})
        ].join(" ").toLowerCase();

        return (!query || searchable.includes(query))
          && (!status || item.status === status)
          && (!severity || item.severity === severity);
      });

      renderMetrics();
      renderTable();
    }

    function renderMetrics() {
      const total = state.cases.length;
      const high = state.cases.filter((item) => item.severity === "high").length;
      const closed = state.cases.filter((item) => ["Resolved", "Closed"].includes(item.status)).length;
      const active = state.cases.filter((item) => !["Resolved", "Closed"].includes(item.status)).length;

      elements.totalCases.textContent = total;
      elements.highCases.textContent = high;
      elements.activeCases.textContent = active;
      elements.closedCases.textContent = closed;
      elements.navCount.textContent = total;
    }

    function renderTable() {
      elements.caseRows.innerHTML = "";

      if (!state.filteredCases.length) {
        const row = document.createElement("tr");
        row.innerHTML = "<td class='empty' colspan='10'>No cases match the current filters</td>";
        elements.caseRows.appendChild(row);
        return;
      }

      for (const item of state.filteredCases) {
        const row = document.createElement("tr");
        row.innerHTML =
          "<td data-label='Case'><div class='case-id'>" + escapeHtml(item.case_id) + "</div><div class='meta'>" + escapeHtml(formatDate(item.timestamp)) + "</div></td>"
          + "<td data-label='Channel'><span class='channel-badge'>" + escapeHtml(item.channel || "-") + "</span><div class='meta sender-meta' title='" + escapeHtml(item.sender || "") + "'>" + escapeHtml(formatSender(item.sender)) + "</div></td>"
          + "<td data-label='Type'>" + renderTypeLabel(item.incident_type || "other") + "</td>"
          + "<td data-label='Severity'><span class='pill " + escapeHtml(item.severity || "low") + "'>" + escapeHtml(item.severity || "low") + "</span></td>"
          + "<td data-label='Workflow'>" + renderWorkflowPill(item.workflow_state || "manual") + "</td>"
          + "<td data-label='Evidence'><span class='evidence " + escapeHtml(item.evidence_status || "unknown") + "'>" + escapeHtml(item.evidence_status || "unknown") + "</span><div class='meta'>" + escapeHtml(formatMissingFields(item.missing_fields)) + "</div></td>"
          + "<td data-label='Location'>" + escapeHtml(item.location || "Unknown location") + "</td>"
          + "<td data-label='Status'>" + renderStatusPill(item.status || "New") + "</td>"
          + "<td data-label='Description'><div class='description-cell'><div class='description-text'>" + escapeHtml(item.description || "") + "</div>" + renderCollectedDetails(item.collected_fields) + renderLastReply(item.last_reply) + "</div></td>"
          + "<td data-label='Actions'><div class='row-actions'><button class='link-button' data-action='edit' data-id='" + escapeHtml(item.case_id) + "' type='button'>Edit</button><button class='delete-button' data-action='delete' data-id='" + escapeHtml(item.case_id) + "' type='button'>Delete</button></div></td>";
        elements.caseRows.appendChild(row);
      }
    }

    function renderTypeLabel(value) {
      const label = formatIncidentType(value);
      return "<span class='type-label' title='" + escapeHtml(label) + "'>" + escapeHtml(label) + "</span>";
    }

    function renderWorkflowPill(value) {
      const label = formatWorkflow(value);
      return "<span class='workflow' title='" + escapeHtml(label) + "'>" + escapeHtml(label) + "</span>";
    }

    function renderStatusPill(value) {
      const label = formatStatus(value);
      return "<span class='status " + escapeHtml(statusClass(value || "New")) + "' title='" + escapeHtml(label) + "'>" + escapeHtml(label) + "</span>";
    }

    function openModal(item) {
      const isEdit = Boolean(item);
      modalTitle.textContent = isEdit ? "Edit case" : "New case";
      deleteFromModal.style.visibility = isEdit ? "visible" : "hidden";

      setField("caseId", item && item.case_id);
      setField("caseChannel", item && item.channel || "manual");
      setField("caseSender", item && item.sender || "dashboard");
      setField("caseType", item && item.incident_type || "other");
      setField("caseSeverity", item && item.severity || "low");
      setField("caseStatus", item && item.status || "New");
      setField("caseLocation", item && item.location || "");
      setField("caseWorkflow", item && item.workflow_state || "manual");
      setField("caseEvidence", item && item.evidence_status || "unknown");
      setField("caseMissingFields", formatMissingFields(item && item.missing_fields || []));
      setField("caseDescription", item && item.description || "");
      setField("caseReply", item && item.last_reply || "");
      setCollectedFields(item && item.collected_fields || {});
      setCaseReportFields(item && item.case_report || {}, item || {});

      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.querySelector("#caseDescription").focus();
    }

    function closeModal() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }

    function setField(id, value) {
      document.querySelector("#" + id).value = value || "";
    }

    function getPayload() {
      return {
        channel: document.querySelector("#caseChannel").value,
        sender: document.querySelector("#caseSender").value,
        incident_type: document.querySelector("#caseType").value,
        severity: document.querySelector("#caseSeverity").value,
        status: document.querySelector("#caseStatus").value,
        location: document.querySelector("#caseLocation").value,
        workflow_state: document.querySelector("#caseWorkflow").value,
        evidence_status: document.querySelector("#caseEvidence").value,
        missing_fields: parseMissingFields(document.querySelector("#caseMissingFields").value),
        collected_fields: buildCollectedFields(),
        case_report: buildCaseReportPayload(),
        description: document.querySelector("#caseDescription").value,
        last_reply: document.querySelector("#caseReply").value
      };
    }

    function setCollectedFields(fields) {
      const source = fields && typeof fields === "object" ? fields : {};
      setField("caseCollectedTime", source.time || "");
      setField("caseCollectedAmount", source.amount || "");
      setField("caseCollectedContact", source.contact || "");
      setField("caseCollectedItem", source.item || "");
      setField("caseCollectedParty", source.person_or_business || "");
      setField("caseCollectedVehicle", source.route_or_vehicle || "");
      setField("caseCollectedSafety", source.current_safety || "");
      setField("caseCollectedInjury", source.injury_status || "");
      setField("caseCollectedSuspect", source.suspect_detail || "");
      setField("caseCollectedDeadline", source.deadline || "");
      setField("caseCollectedEvidence", source.evidence || "");
    }

    function setCaseReportFields(report, item) {
      const source = report && typeof report === "object" ? report : {};
      setField("caseReportSummary", source.summary || item.description || "");
      setField("caseReportAction", source.recommended_action || "");
      setField("caseReportPriority", source.priority_note || "");
    }

    function buildCollectedFields() {
      const location = document.querySelector("#caseLocation").value.trim();
      const description = document.querySelector("#caseDescription").value.trim();
      const fields = compactObject({
        description,
        location,
        last_seen_location: location,
        time: document.querySelector("#caseCollectedTime").value,
        amount: document.querySelector("#caseCollectedAmount").value,
        contact: document.querySelector("#caseCollectedContact").value,
        item: document.querySelector("#caseCollectedItem").value,
        item_detail: document.querySelector("#caseCollectedItem").value,
        person_or_business: document.querySelector("#caseCollectedParty").value,
        route_or_vehicle: document.querySelector("#caseCollectedVehicle").value,
        current_safety: document.querySelector("#caseCollectedSafety").value,
        injury_status: document.querySelector("#caseCollectedInjury").value,
        suspect_detail: document.querySelector("#caseCollectedSuspect").value,
        deadline: document.querySelector("#caseCollectedDeadline").value,
        evidence: document.querySelector("#caseCollectedEvidence").value
      });

      return fields;
    }

    function buildCaseReportPayload() {
      const collectedFields = buildCollectedFields();
      const summary = document.querySelector("#caseReportSummary").value.trim()
        || document.querySelector("#caseDescription").value.trim();
      const recommendedAction = document.querySelector("#caseReportAction").value.trim()
        || "Officer follow-up recommended";
      const priorityNote = document.querySelector("#caseReportPriority").value.trim();

      if (!summary && !Object.keys(collectedFields).length) {
        return null;
      }

      return compactObject({
        summary,
        incident_type: document.querySelector("#caseType").value,
        location: collectedFields.location,
        time: collectedFields.time,
        amount: collectedFields.amount,
        contact: collectedFields.contact,
        item: collectedFields.item,
        evidence: collectedFields.evidence,
        person_or_business: collectedFields.person_or_business,
        current_safety: collectedFields.current_safety,
        injury_status: collectedFields.injury_status,
        recommended_action: recommendedAction,
        priority_note: priorityNote
      });
    }

    function compactObject(source) {
      return Object.fromEntries(
        Object.entries(source).filter(([, value]) => {
          if (value === undefined || value === null) {
            return false;
          }

          if (typeof value === "object") {
            return Object.keys(value).length > 0;
          }

          return String(value).trim() !== "";
        }).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
      );
    }

    function formatWorkflow(value) {
      const raw = String(value || "manual");
      const labels = {
        "collect_evidence": "Evidence",
        "draft_case_report": "Draft",
        "confirm_submit": "Confirm",
        "submitted": "Submitted",
        "guidance": "Guidance",
        "intake": "Intake",
        "tracking": "Tracking",
        "closed": "Closed",
        "manual": "Manual"
      };

      return labels[raw] || toTitleLabel(raw);
    }

    function formatStatus(value) {
      const label = String(value || "New");
      const labels = {
        "Pending confirmation": "Pending",
        "Waiting info": "Need info"
      };

      return labels[label] || label;
    }

    function formatIncidentType(value) {
      return toTitleLabel(value || "other");
    }

    function toTitleLabel(value) {
      return String(value || "")
        .replace(/_/g, " ")
        .replace(/\\b\\w/g, (char) => char.toUpperCase());
    }

    function formatSender(value) {
      const sender = String(value || "");

      if (sender.length <= 18) {
        return sender;
      }

      return sender.slice(0, 8) + "..." + sender.slice(-6);
    }

    function statusClass(value) {
      return "status-" + String(value || "new")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    function formatMissingFields(value) {
      if (!Array.isArray(value) || !value.length) {
        return "";
      }

      return value.join(", ");
    }

    function parseMissingFields(value) {
      return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    function renderCollectedDetails(fields) {
      const details = collectDisplayFields(fields);

      if (!details.length) {
        return "";
      }

      const visibleDetails = details.slice(0, 4);
      const extraCount = details.length - visibleDetails.length;
      const moreChip = extraCount > 0
        ? "<span class='detail-chip detail-more'>+" + escapeHtml(extraCount) + " more</span>"
        : "";

      return "<div class='detail-list'>" + visibleDetails.map((item) => (
        "<span class='detail-chip'>" + escapeHtml(item.label + ": " + item.value) + "</span>"
      )).join("") + moreChip + "</div>";
    }

    function renderLastReply(reply) {
      if (!reply) {
        return "";
      }

      return "<div class='reply-text'>" + escapeHtml(reply) + "</div>";
    }

    function collectDisplayFields(fields) {
      const source = fields && typeof fields === "object" ? fields : {};
      const keys = [
        ["time", "Time"],
        ["amount", "Amount"],
        ["evidence", "Evidence"],
        ["contact", "Contact"],
        ["item", "Item"],
        ["current_safety", "Safety"],
        ["injury_status", "Injury"]
      ];

      return keys
        .map(([key, label]) => ({ label, value: formatCollectedValue(key, source[key]) }))
        .filter((item) => item.value)
        .map((item) => ({
          label: item.label,
          value: String(item.value).length > 34 ? String(item.value).slice(0, 31) + "..." : String(item.value)
        }));
    }

    function formatCollectedValue(key, value) {
      if (!value) {
        return "";
      }

      if (key === "evidence") {
        return "Provided";
      }

      return String(value);
    }

    async function saveCase(event) {
      event.preventDefault();
      const caseId = document.querySelector("#caseId").value;
      const payload = getPayload();

      if (caseId) {
        await api("/api/cases/" + encodeURIComponent(caseId), {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        await loadCases({ silent: true });
        showToast("Case updated");
      } else {
        await api("/api/cases", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        await loadCases({ silent: true });
        showToast("Case created");
      }

      closeModal();
    }

    async function deleteCase(caseId) {
      if (!caseId) {
        return;
      }

      await api("/api/cases/" + encodeURIComponent(caseId), {
        method: "DELETE"
      });
      closeModal();
      closeConfirm();
      await loadCases({ silent: true });
      showToast("Case deleted");
    }

    function requestDelete(caseId) {
      if (!caseId) {
        return;
      }

      pendingDeleteId = caseId;
      confirmModal.classList.add("open");
      confirmModal.setAttribute("aria-hidden", "false");
      confirmDelete.focus();
    }

    function closeConfirm() {
      pendingDeleteId = "";
      confirmModal.classList.remove("open");
      confirmModal.setAttribute("aria-hidden", "true");
    }

    function findCase(caseId) {
      return state.cases.find((item) => item.case_id === caseId);
    }

    function showToast(message) {
      elements.toast.textContent = message;
      elements.toast.classList.add("show");
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(() => {
        elements.toast.classList.remove("show");
      }, 1900);
    }

    document.querySelector("#refreshCases").addEventListener("click", loadCases);
    document.querySelector("#newCase").addEventListener("click", () => openModal(null));
    document.querySelector("#closeModal").addEventListener("click", closeModal);
    document.querySelector("#cancelModal").addEventListener("click", closeModal);
    form.addEventListener("submit", saveCase);
    elements.searchCases.addEventListener("input", applyFilters);
    elements.statusFilter.addEventListener("change", applyFilters);
    elements.severityFilter.addEventListener("change", applyFilters);

    deleteFromModal.addEventListener("click", () => {
      requestDelete(document.querySelector("#caseId").value);
    });
    cancelDelete.addEventListener("click", closeConfirm);
    confirmDelete.addEventListener("click", () => deleteCase(pendingDeleteId));

    elements.caseRows.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");

      if (!button) {
        return;
      }

      const caseId = button.dataset.id;

      if (button.dataset.action === "edit") {
        openModal(findCase(caseId));
      }

      if (button.dataset.action === "delete") {
        requestDelete(caseId);
      }
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    confirmModal.addEventListener("click", (event) => {
      if (event.target === confirmModal) {
        closeConfirm();
      }
    });

    loadCases().catch((error) => {
      showToast(error.message);
    });
  </script>
</body>
</html>`;

app.http("staticSite", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "dashboard",
  handler: async () => ({
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    },
    body: html
  })
});
