// Máy chủ nhỏ để chơi game và lưu ảnh bò thẳng vào thư mục assets/cows.
// Chạy: node server.js (hoặc bấm start-game.bat). Không cần cài thêm gì.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIR = path.join(ROOT, 'assets', 'cows');
const PORT = +process.env.PORT || 3000;
const os = require('os');
const TYPES = ['normal', 'small', 'big', 'fast', 'mad', 'red', 'gold', 'rainbow', 'witch', 'ghost'];
const EXTS = ['png', 'webp', 'jpg', 'jpeg'];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.php': 'text/html; charset=utf-8', '.json': 'application/json' };

fs.mkdirSync(DIR, { recursive: true });

function fileName(type, kind) { return type + (kind === 'hooked' ? '-hooked' : ''); }
function removeExisting(base) { EXTS.forEach(e => { try { fs.unlinkSync(path.join(DIR, base + '.' + e)); } catch (_) { /* chưa có */ } }); }

function isLocal(req) { return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress); }

function api(req, res, url) {
  // chỉ máy chạy server mới được đổi ảnh bò; người chơi khác trong mạng LAN chỉ chơi
  if (!isLocal(req)) { res.writeHead(403); return res.end('local only'); }
  const type = url.searchParams.get('type'), kind = url.searchParams.get('kind') === 'hooked' ? 'hooked' : 'src';
  if (!TYPES.includes(type)) { res.writeHead(400); return res.end('bad type'); }
  const base = fileName(type, kind);
  if (req.method === 'DELETE') {
    removeExisting(fileName(type, 'src')); removeExisting(fileName(type, 'hooked'));
    res.writeHead(200); return res.end('ok');
  }
  if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > 12e6) { res.writeHead(413); res.end('too large'); req.destroy(); } else chunks.push(c); });
  req.on('end', () => {
    const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/s.exec(Buffer.concat(chunks).toString('utf8'));
    if (!m) { res.writeHead(400); return res.end('bad image'); }
    removeExisting(base);
    fs.writeFileSync(path.join(DIR, base + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1])), Buffer.from(m[2], 'base64'));
    res.writeHead(200); res.end('ok');
  });
}

/* Bảng thành tích chung: mọi người chơi trong mạng gửi điểm lên đây, lưu ở scores.json */
const SCORES = path.join(ROOT, 'scores.json');
let scores = [];
try { scores = JSON.parse(fs.readFileSync(SCORES, 'utf8')); if (!Array.isArray(scores)) scores = []; } catch (_) { scores = []; }
function board(mode) {
  const best = new Map();
  scores.filter(e => (e.mode || 'catch') === mode).forEach(e => { const k = e.name.toLowerCase(); if (!best.has(k) || e.score > best.get(k).score) best.set(k, e); });
  return [...best.values()].sort((a, b) => b.score - a.score || a.ts - b.ts).slice(0, 50);
}
function scoresApi(req, res, url) {
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  if (req.method === 'GET') return send(200, board(url.searchParams.get('mode') === 'shoot' ? 'shoot' : 'catch'));
  if (req.method !== 'POST') return send(405, {});
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > 4096) { req.destroy(); } else chunks.push(c); });
  req.on('end', () => {
    let b; try { b = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (_) { return send(400, {}); }
    const name = String(b.name || '').replace(/[\x00-\x1f<>]/g, '').trim().slice(0, 16), score = Math.floor(+b.score), level = Math.floor(+b.level) || 1;
    if (!name || !(score >= 0) || score > 1e6) return send(400, {});
    const mode = b.mode === 'shoot' ? 'shoot' : 'catch';
    scores.push({ name, score, level, mode, win: !!b.win, ts: Date.now() });
    if (scores.length > 1000) scores = scores.slice(-1000);
    fs.writeFile(SCORES, JSON.stringify(scores), () => {});
    send(200, board(mode));
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/skin') return api(req, res, url);
  if (url.pathname === '/api/scores.php') return scoresApi(req, res, url);
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = fs.existsSync(path.join(ROOT, 'index.html')) ? '/index.html' : '/index.php';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || ['server.js', 'scores.json'].includes(path.basename(file))) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? 'Cổng ' + PORT + ' đang được dùng. Hãy tắt cửa sổ game cũ rồi chạy lại.' : e.message); process.exit(1); });
server.listen(PORT, '0.0.0.0', () => {
  console.log('Bắt Bò đang chạy.');
  console.log('  Máy này:   http://localhost:' + PORT);
  Object.values(os.networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal).forEach(i => console.log('  Mạng LAN:  http://' + i.address + ':' + PORT));
  console.log('Ảnh bò lưu vào: ' + DIR);
  console.log('Nhấn Ctrl+C để tắt.');
});
