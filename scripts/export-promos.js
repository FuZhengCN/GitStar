// Export selected GitStar promo images as PNG
// Usage: node scripts/export-promos.js

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Register Chinese font (available on Windows)
GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc', 'Microsoft YaHei');

// Unified font stack: system UI for Latin, Microsoft YaHei for CJK
const FONT_LATIN = '"Inter", "Segoe UI", "Microsoft YaHei", sans-serif';
const FONT_MONO  = '"JetBrains Mono", "Consolas", monospace';

// ============================================================
// Star polygon from icon.svg (10 points in 128x128 viewBox)
// ============================================================
const STAR_PTS_128 = [
  101,13, 106.5,25.5, 120,27.5, 109.5,37.5, 112,51,
  101,45, 90,51, 92.5,37.5, 82,27.5, 95.5,25.5
];

function drawRealIcon(ctx, x, y, size) {
  const s = size / 128;
  const r = 28 * s;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + size - r, y);
  ctx.arcTo(x + size, y, x + size, y + r, r);
  ctx.lineTo(x + size, y + size - r);
  ctx.arcTo(x + size, y + size, x + size - r, y + size, r);
  ctx.lineTo(x + r, y + size);
  ctx.arcTo(x, y + size, x, y + size - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fillStyle = '#3b82f6';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${88 * s}px Arial, Helvetica, sans-serif`;
  ctx.fillText('G', x + 54 * s, y + 104 * s);

  ctx.beginPath();
  ctx.moveTo(x + STAR_PTS_128[0] * s, y + STAR_PTS_128[1] * s);
  for (let i = 1; i < 10; i++) {
    ctx.lineTo(x + STAR_PTS_128[i * 2] * s, y + STAR_PTS_128[i * 2 + 1] * s);
  }
  ctx.closePath();
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawStarPoly(ctx, cx, cy, size, color) {
  const sc = size * 2 / 128;
  ctx.beginPath();
  ctx.moveTo(cx + STAR_PTS_128[0] * sc, cy + STAR_PTS_128[1] * sc);
  for (let j = 1; j < 10; j++) {
    ctx.lineTo(cx + STAR_PTS_128[j * 2] * sc, cy + STAR_PTS_128[j * 2 + 1] * sc);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ============================================================
// tileD1 — 星空透镜 (440×280)
// ============================================================
function drawTileD1() {
  const W = 440, H = 280;
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');

  const bg = ctx.createRadialGradient(W * 0.25, H * 0.5, 20, W * 0.5, H * 0.5, 450);
  bg.addColorStop(0, '#1e3a5f');
  bg.addColorStop(0.6, '#0f172a');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 160; i++) {
    const sx = (i * 137 + 41) % W, sy = (i * 89 + 23) % H;
    const b = 0.2 + ((i * 73) % 100) / 100 * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${b})`;
    ctx.beginPath(); ctx.arc(sx, sy, 0.3 + (i % 3) * 0.4, 0, Math.PI * 2); ctx.fill();
  }

  const pts = [[40,50],[100,30],[160,70],[200,120],[140,170],[80,200]];
  ctx.strokeStyle = 'rgba(59,130,246,0.12)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();

  const lx = 115, ly = 140, lr = 82;
  const lg = ctx.createRadialGradient(lx, ly, lr * 0.2, lx, ly, lr);
  lg.addColorStop(0, 'rgba(59,130,246,0.1)');
  lg.addColorStop(0.8, 'rgba(59,130,246,0.03)');
  lg.addColorStop(1, 'rgba(59,130,246,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(59,130,246,0.25)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(59,130,246,0.1)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(lx, ly, lr * 0.45, 0, Math.PI * 2); ctx.stroke();

  drawRealIcon(ctx, lx - 34, ly - 34, 68);

  [[40,50],[160,70]].forEach(([hx, hy]) => {
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 18);
    g.addColorStop(0, 'rgba(245,158,11,0.35)');
    g.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 18, 0, Math.PI * 2); ctx.fill();
    drawStarPoly(ctx, hx, hy, 10, '#f59e0b');
  });

  ctx.fillStyle = '#f1f5f9';
  ctx.font = '700 34px "Inter", "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GitStar', 220, 130);

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(220, 143, 44, 2.5);

  ctx.font = '400 14px "Inter", "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('你的 GitHub 星探', 220, 170);

  ctx.font = '400 11px "Inter", "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('发现下一个值得关注的开源项目', 220, 194);

  return c;
}

// ============================================================
// tileD3 — 暗夜聚焦 (440×280)
// ============================================================
function drawTileD3() {
  const W = 440, H = 280;
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');

  const bg = ctx.createRadialGradient(W * 0.55, H * 0.42, 30, W * 0.5, H * 0.5, 400);
  bg.addColorStop(0, '#1a365d');
  bg.addColorStop(0.7, '#0f172a');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 120; i++) {
    const sx = (i * 151 + 53) % W, sy = (i * 97 + 17) % H;
    const b = 0.15 + ((i * 47) % 100) / 100 * 0.6;
    ctx.fillStyle = `rgba(255,255,255,${b})`;
    ctx.beginPath(); ctx.arc(sx, sy, 0.3 + (i % 3) * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  for (let r = 50; r <= 170; r += 40) {
    ctx.strokeStyle = `rgba(59,130,246,${0.04 + (170 - r) / 300})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(240, 115, r, 0, Math.PI * 2); ctx.stroke();
  }

  const cx = 240, cy = 115;
  const glow1 = ctx.createRadialGradient(cx, cy, 5, cx, cy, 100);
  glow1.addColorStop(0, 'rgba(245,158,11,0.2)');
  glow1.addColorStop(0.5, 'rgba(245,158,11,0.06)');
  glow1.addColorStop(1, 'rgba(245,158,11,0)');
  ctx.fillStyle = glow1; ctx.fillRect(cx - 120, cy - 120, 240, 240);

  const glow2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
  glow2.addColorStop(0, 'rgba(245,158,11,0.45)');
  glow2.addColorStop(1, 'rgba(245,158,11,0)');
  ctx.fillStyle = glow2; ctx.fillRect(cx - 35, cy - 35, 70, 70);

  drawStarPoly(ctx, cx, cy, 32, '#f59e0b');

  // Brand block (same layout system as banner-D)
  const t3IconX = 28, t3IconY = 26, t3IconSz = 52;
  const t3FontSize = 30, t3SubFontSize = 12;
  drawRealIcon(ctx, t3IconX, t3IconY, t3IconSz);

  const t3TextX  = t3IconX + t3IconSz + t3IconSz * 0.20;
  const t3IconMid = t3IconY + t3IconSz / 2;
  const t3TextY   = t3IconMid + t3FontSize * 0.30;
  const t3SubY    = t3TextY   + t3FontSize * 0.805;
  const t3SubTop  = t3SubY    - t3SubFontSize * 0.85;
  const t3LineY   = (t3TextY + t3SubTop) / 2;

  ctx.fillStyle = '#f1f5f9';
  ctx.font = `700 ${t3FontSize}px "Inter", "Segoe UI", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('GitStar', t3TextX, t3TextY);

  const t3GitW = ctx.measureText('Git').width;
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(t3TextX, t3LineY, t3GitW, 2);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `400 ${t3SubFontSize}px "Inter", "Segoe UI", "Microsoft YaHei", sans-serif`;
  ctx.fillText('你的 GitHub 星探', t3TextX, t3SubY);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 16px "Inter", "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('发现下一个值得关注的开源项目', W / 2, 220);

  ctx.fillStyle = '#64748b';
  ctx.font = '400 11px "Inter", "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('热门 · 新星 · 活跃   |   Chrome 浏览器扩展   |   免费安装', W / 2, 245);

  return c;
}

// ============================================================
// bannerD — 星探望远镜 (1400×560)
// ============================================================
function drawBannerD() {
  const W = 1400, H = 560;
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');

  const bgGrad = ctx.createRadialGradient(W * 0.38, H * 0.42, 30, W * 0.5, H * 0.5, 900);
  bgGrad.addColorStop(0, '#1e3a5f');
  bgGrad.addColorStop(0.6, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 350; i++) {
    const sx = (i * 137.508 + 50) % W, sy = (i * 271.828 + 30) % H;
    const b = 0.25 + ((i * 73) % 100) / 100 * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${b})`;
    ctx.beginPath(); ctx.arc(sx, sy, 0.4 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  const conn = [[180,130],[270,80],[370,160],[440,110],[510,190],[590,140],[690,210],[770,160],[840,240]];
  ctx.strokeStyle = 'rgba(59,130,246,0.1)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(conn[0][0], conn[0][1]);
  for (let i = 1; i < conn.length; i++) ctx.lineTo(conn[i][0], conn[i][1]);
  ctx.stroke();

  const hStars = [[270,80],[510,190],[770,160]];
  hStars.forEach(([hx, hy]) => {
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 50);
    g.addColorStop(0, 'rgba(245,158,11,0.35)');
    g.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 50, 0, Math.PI * 2); ctx.fill();
    drawStarPoly(ctx, hx, hy, 24, '#f59e0b');
  });

  const lx = 340, ly = 280, lr = 190;
  const lg = ctx.createRadialGradient(lx, ly, lr * 0.25, lx, ly, lr);
  lg.addColorStop(0, 'rgba(59,130,246,0.12)');
  lg.addColorStop(0.7, 'rgba(59,130,246,0.04)');
  lg.addColorStop(1, 'rgba(59,130,246,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(59,130,246,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(59,130,246,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(lx, ly, lr * 0.48, 0, Math.PI * 2); ctx.stroke();

  // Brand block (same layout system as tile-D3)
  const bdIconX = 70, bdIconY = 340, bdIconSz = 110;
  const bdFontSize = 54, bdSubFontSize = 20;
  drawRealIcon(ctx, bdIconX, bdIconY, bdIconSz);

  const bdTextX   = bdIconX + bdIconSz + bdIconSz * 0.20;
  const bdIconMid  = bdIconY + bdIconSz / 2;
  const bdTextY    = bdIconMid + bdFontSize * 0.30;
  const bdSubY     = bdTextY   + bdFontSize * 0.805;
  const bdSubTop   = bdSubY    - bdSubFontSize * 0.85;
  const bdLineY    = (bdTextY + bdSubTop) / 2;

  ctx.fillStyle = '#f1f5f9';
  ctx.font = `700 ${bdFontSize}px "Inter", "Segoe UI", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('GitStar', bdTextX, bdTextY);

  const bdGitW = ctx.measureText('Git').width;
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(bdTextX, bdLineY, bdGitW, 3);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `400 ${bdSubFontSize}px "Inter", "Segoe UI", "Microsoft YaHei", sans-serif`;
  ctx.fillText('你的 GitHub 星探 — 发现下一个值得关注的开源项目', bdTextX, bdSubY);

  // Floating repo cards
  const repos = [
    { n:'facebook / react', s:'198k', x:920, y:80, sc:1.1 },
    { n:'tensorflow / tensorflow', s:'175k', x:1100, y:160, sc:1.0 },
    { n:'microsoft / vscode', s:'152k', x:980, y:270, sc:0.95 },
    { n:'twbs / bootstrap', s:'165k', x:1120, y:360, sc:0.9 },
    { n:'ohmyzsh / ohmyzsh', s:'163k', x:1000, y:440, sc:0.85 },
  ];
  repos.forEach(r => {
    const rw = 230 * r.sc, rh = 48 * r.sc;
    const g = ctx.createRadialGradient(r.x + rw / 2, r.y + rh / 2, 0, r.x + rw / 2, r.y + rh / 2, rw * 0.5);
    g.addColorStop(0, 'rgba(59,130,246,0.08)');
    g.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r.x + rw / 2, r.y + rh / 2, rw * 0.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(15,23,42,0.88)';
    rrect(ctx, r.x, r.y, rw, rh, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(59,130,246,0.25)'; ctx.lineWidth = 0.8;
    rrect(ctx, r.x, r.y, rw, rh, 8); ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `600 ${12 * r.sc}px "Inter", "Microsoft YaHei", sans-serif`;
    ctx.fillText(r.n, r.x + 12, r.y + rh / 2 + 4);
    ctx.fillStyle = '#f59e0b';
    ctx.font = `${11 * r.sc}px "Inter", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('★ ' + r.s, r.x + rw - 12, r.y + rh / 2 + 4);
    ctx.textAlign = 'left';
  });

  return c;
}

// ============================================================
// Export as PNG (24-bit, no alpha — Chrome Web Store compliant)
// ============================================================
const outDir = path.join(__dirname, '..', 'docs', 'store-listing');

async function saveCanvas(canvas, filename) {
  // Flatten to white background + strip alpha for Chrome Web Store compliance
  const flat = createCanvas(canvas.width, canvas.height);
  const fctx = flat.getContext('2d');
  fctx.fillStyle = '#ffffff';
  fctx.fillRect(0, 0, canvas.width, canvas.height);
  fctx.drawImage(canvas, 0, 0);

  const rgbaBuf = flat.toBuffer('image/png');
  // Convert RGBA → RGB (no alpha) via sharp
  const rgbBuf = await sharp(rgbaBuf).removeAlpha().png({ compressionLevel: 6 }).toBuffer();

  const filepath = path.join(outDir, filename);
  fs.writeFileSync(filepath, rgbBuf);
  console.log(`  ${filename}  (${canvas.width}×${canvas.height}, ${(rgbBuf.length / 1024).toFixed(1)} KB)`);
}

(async () => {
  console.log('Exporting GitStar promo images...\n');

  await saveCanvas(drawTileD1(), 'promo-small-d1.png');
  await saveCanvas(drawTileD3(), 'promo-small-d3.png');
  await saveCanvas(drawBannerD(), 'promo-marquee-d.png');

  console.log('\nDone. Files saved to docs/store-listing/');
})();
