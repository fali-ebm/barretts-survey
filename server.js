/**
 * Barrett's Esophagus Screening Survey — Backend Server
 * Pure Node.js, zero npm dependencies.
 *
 * LOCAL:   node server.js
 * RAILWAY: Deployed automatically via GitHub. Set ADMIN_PIN env variable.
 *          Attach a Railway Volume mounted at /data for persistent storage.
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const PORT      = process.env.PORT       || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN  || 'AGA2026';

// Data file: use /data/ if it exists (Railway persistent volume),
// otherwise fall back to local directory (development)
const DATA_DIR  = fs.existsSync("/app/data") ? "/app/data" : fs.existsSync("/data") ? "/data" : __dirname;
const DATA_FILE = path.join(DATA_DIR, 'responses.json');

const PUBLIC_DIR = path.join(__dirname, 'public');

// ── DATA LAYER ────────────────────────────────────────────────────────────────
function readResponses() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading responses:', e.message);
    return [];
  }
}

function writeResponses(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function appendResponse(record) {
  const all = readResponses();
  all.push(record);
  writeResponses(all);
  return all.length;
}

if (!fs.existsSync(DATA_FILE)) writeResponses([]);

// ── MIME TYPES ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Pin',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function buildCSV(responses) {
  const headers = [
    'Response_ID','Timestamp','Medical_Provider','Specialty','Via_Social_Media',
    'Scenario1_15pct_Code','Scenario2_10pct_Code','Scenario3_7pct_Code','Scenario4_5pct_Code','Scenario5_2pct_Code',
    'Scenario1_15pct_Label','Scenario2_10pct_Label','Scenario3_7pct_Label','Scenario4_5pct_Label','Scenario5_2pct_Label',
    'Comments'
  ];
  const esc = v => `"${String(v||'').replace(/"/g,'""')}"`;
  const rows = responses.map(r => [
    esc(r.id), esc(r.timestamp), esc(r.role), esc(r.specialty), esc(r.via_social),
    r.scenario1_val||'', r.scenario2_val||'', r.scenario3_val||'', r.scenario4_val||'', r.scenario5_val||'',
    esc(r.scenario1_label), esc(r.scenario2_label), esc(r.scenario3_label), esc(r.scenario4_label), esc(r.scenario5_label),
    esc(r.comments)
  ].join(','));
  return [headers.join(','), ...rows].join('\r\n');
}

// ── SERVER ────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;
  const method   = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Pin',
    });
    res.end();
    return;
  }

  // ── API ───────────────────────────────────────────────────────────────────

  // POST /api/response
  if (pathname === '/api/response' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const record = {
        id:              crypto.randomUUID(),
        timestamp:       new Date().toISOString(),
        role:            body.role            || '',
        specialty:       body.specialty       || '',
        via_social:      body.via_social      || '',
        scenario1_val:   body.scenario1_val   || '',
        scenario2_val:   body.scenario2_val   || '',
        scenario3_val:   body.scenario3_val   || '',
        scenario4_val:   body.scenario4_val   || '',
        scenario5_val:   body.scenario5_val   || '',
        scenario1_label: body.scenario1_label || '',
        scenario2_label: body.scenario2_label || '',
        scenario3_label: body.scenario3_label || '',
        scenario4_label: body.scenario4_label || '',
        scenario5_label: body.scenario5_label || '',
        comments:        body.comments        || '',
        ip_hash:         crypto.createHash('sha256')
                           .update(req.socket.remoteAddress || '')
                           .digest('hex').slice(0,8)
      };
      const total = appendResponse(record);
      console.log(`[${new Date().toLocaleTimeString()}] Response saved — total: ${total}`);
      jsonResponse(res, 201, { ok: true, total });
    } catch (e) {
      jsonResponse(res, 400, { ok: false, error: e.message });
    }
    return;
  }

  // GET /api/responses
  if (pathname === '/api/responses' && method === 'GET') {
    if (req.headers['x-admin-pin'] !== ADMIN_PIN) {
      jsonResponse(res, 401, { ok: false, error: 'Incorrect PIN' }); return;
    }
    const all = readResponses();
    jsonResponse(res, 200, { ok: true, count: all.length, responses: all });
    return;
  }

  // GET /api/responses/csv
  if (pathname === '/api/responses/csv' && method === 'GET') {
    if (parsed.searchParams.get('pin') !== ADMIN_PIN) {
      jsonResponse(res, 401, { ok: false, error: 'Incorrect PIN' }); return;
    }
    const all  = readResponses();
    const csv  = buildCSV(all);
    const date = new Date().toISOString().slice(0,10);
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="BarrettsScreening_n${all.length}_${date}.csv"`,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(csv);
    return;
  }

  // GET /api/stats
  if (pathname === '/api/stats' && method === 'GET') {
    if (req.headers['x-admin-pin'] !== ADMIN_PIN) {
      jsonResponse(res, 401, { ok: false, error: 'Incorrect PIN' }); return;
    }
    const all = readResponses();
    const stats = {
      total: all.length,
      medical_providers: all.filter(r=>r.role==='Yes').length,
      complete: all.filter(r=>r.scenario1_val&&r.scenario2_val&&r.scenario3_val&&r.scenario4_val).length,
      specialties: {},
      scenario_breakdown: { s1:{}, s2:{}, s3:{}, s4:{}, s5:{} }
    };
    all.forEach(r => {
      stats.specialties[r.specialty] = (stats.specialties[r.specialty]||0)+1;
      ['1','2','3','4','5'].forEach(n => {
        const v = r[`scenario${n}_val`];
        if (v) stats.scenario_breakdown[`s${n}`][v] = (stats.scenario_breakdown[`s${n}`][v]||0)+1;
      });
    });
    jsonResponse(res, 200, { ok: true, stats });
    return;
  }

  // DELETE /api/responses
  if (pathname === '/api/responses' && method === 'DELETE') {
    try {
      const body = await parseBody(req);
      if (body.pin !== ADMIN_PIN) {
        jsonResponse(res, 401, { ok: false, error: 'Incorrect PIN' }); return;
      }
      const prev = readResponses().length;
      writeResponses([]);
      console.log(`[${new Date().toLocaleTimeString()}] All ${prev} responses cleared`);
      jsonResponse(res, 200, { ok: true, cleared: prev });
    } catch (e) {
      jsonResponse(res, 400, { ok: false, error: e.message });
    }
    return;
  }

  // ── STATIC FILES ──────────────────────────────────────────────────────────
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext  = path.extname(filePath);
      const mime = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404); res.end('Not found');
    }
  } catch (e) { res.writeHead(500); res.end('Server error'); }
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Barrett\'s Esophagus Screening Survey — Server Running   ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  URL:       http://localhost:${PORT}                          ║`);
  console.log(`║  Admin PIN: ${ADMIN_PIN}                                   ║`);
  console.log(`║  Data:      ${DATA_FILE}`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} in use. Try: PORT=3001 node server.js`);
  else console.error('Server error:', err);
  process.exit(1);
});
