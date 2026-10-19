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
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };

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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/skin') return api(req, res, url);
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || path.basename(file) === 'server.js') { res.writeHead(403); return res.end(); }
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
