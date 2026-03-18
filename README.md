# Barrett's Esophagus Screening Survey — Server

A self-hosted Node.js web application for the AGA Barrett's esophagus
screening threshold elicitation survey. Zero npm dependencies required.

---

## Files

```
barretts-survey/
├── server.js          ← The backend server (run this)
├── responses.json     ← Created automatically; stores all responses
├── README.md          ← This file
└── public/
    └── index.html     ← The survey frontend (served automatically)
```

---

## Requirements

- Node.js version 14 or higher
- Any computer, VPS, or cloud server
- No npm install needed — uses only Node.js built-in modules

Check your Node.js version:
```
node --version
```

---

## Quick Start (Local / LAN use)

1. Open a terminal and navigate to this folder:
   ```
   cd barretts-survey
   ```

2. Start the server:
   ```
   node server.js
   ```

3. You will see:
   ```
   ╔══════════════════════════════════════════════════════════╗
   ║  Barrett's Esophagus Screening Survey — Server Running   ║
   ║  Survey URL:  http://localhost:3000                      ║
   ║  Admin PIN:   AGA2026                                    ║
   ╚══════════════════════════════════════════════════════════╝
   ```

4. Open http://localhost:3000 in your browser to take the survey.

5. To share on your local network (e.g. at a conference):
   - Find your machine's IP address:
     - Mac: System Preferences → Network
     - Windows: ipconfig in Command Prompt
     - Linux: ip addr or ifconfig
   - Share the URL: http://YOUR_IP_ADDRESS:3000
   - Anyone on the same Wi-Fi can open this URL

---

## Changing the Admin PIN

Before deploying, edit server.js and change this line:

```javascript
const ADMIN_PIN = process.env.ADMIN_PIN || 'AGA2026';
```

Or set an environment variable when starting:
```
ADMIN_PIN=MySecurePin2026 node server.js
```

---

## Changing the Port

Default port is 3000. To use a different port:
```
PORT=8080 node server.js
```

---

## Admin Dashboard

1. Open the survey URL in your browser
2. Click the small "Admin" button in the bottom-right corner
3. Enter the PIN (default: AGA2026)
4. The dashboard shows:
   - Total responses, medical providers, complete responses
   - Live table of all submissions
   - Download all responses as a CSV file
   - Clear all responses (with confirmation)

The CSV download is named:
  BarrettsScreening_n{count}_{date}.csv

CSV columns:
  Response_ID, Timestamp, Medical_Provider, Specialty, Via_Social_Media,
  Scenario1_2pct_Code, Scenario2_5pct_Code, Scenario3_7pct_Code, Scenario4_10pct_Code,
  Scenario1_2pct_Label, Scenario2_5pct_Label, Scenario3_7pct_Label, Scenario4_10pct_Label,
  Comments

Response codes:
  1 = No screening — nearly always
  2 = No screening — consider
  3 = Offer screening — consider
  4 = Offer screening — nearly always

---

## Public Internet Deployment

To make the survey accessible over the internet:

### Option A: ngrok (fastest, for short-term use)
1. Download ngrok from https://ngrok.com
2. Start the survey server: node server.js
3. In another terminal: ngrok http 3000
4. ngrok gives you a public URL like https://abc123.ngrok.io
5. Share that URL — anyone worldwide can access it

### Option B: Railway.app (free, permanent)
1. Create a free account at https://railway.app
2. Install Railway CLI: npm install -g @railway/cli
3. In this folder: railway login then railway up
4. Railway gives you a permanent public URL

### Option C: Render.com (free, permanent)
1. Push this folder to a GitHub repository
2. Connect the repo to Render.com
3. Set Start Command to: node server.js
4. Render deploys and gives you a public URL

### Option D: VPS (DigitalOcean, Linode, AWS EC2)
1. Upload this folder to your server via scp or git
2. Run: node server.js
3. Configure your firewall to allow port 3000 (or 80)
4. Point your domain or share the server IP

---

## Data Storage

Responses are stored in responses.json in the same folder as server.js.
This file is created automatically when the first response is submitted.

To back up responses: copy responses.json to a safe location.
To restore: place the responses.json file back in this folder.

The file is plain JSON — you can open it in any text editor.

---

## Security Notes

- Change the ADMIN_PIN before deploying publicly
- The CSV download URL includes the PIN as a query parameter —
  use HTTPS (via ngrok/Railway/Render) to keep it encrypted in transit
- Response IP addresses are stored as an anonymised 8-character hash
  (not the full IP) to protect respondent privacy
- There is no user authentication on the survey itself —
  anyone with the URL can take it

---

## Stopping the Server

Press Ctrl+C in the terminal where the server is running.
All saved responses remain in responses.json.

## Permissions note for Railway volumes

Railway mounts volumes as root. Add this environment variable in Railway
to avoid permission errors:

  RAILWAY_RUN_UID = 0

Set this under your service Variables tab in the Railway dashboard.
