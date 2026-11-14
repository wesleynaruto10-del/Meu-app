(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const cv = $('#tela'), ctx = cv.getContext('2d');
const T = 32, MW = 48, MH = 48, CX = MW / 2 * T, CY = MH / 2 * T, VILA = 5.5 * T;
const SALVO = 'meu-jogo-v1';
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const RAR = [
  { n: 'Comum', c: '#c8c8c8', m: 1, p: 60 }, { n: 'Raro', c: '#4aa3ff', m: 1.4, p: 25 },
  { n: 'Épico', c: '#b45cff', m: 1.9, p: 10 }, { n: 'Lendário', c: '#ffb02e', m: 2.6, p: 4 },
  { n: 'Mítico', c: '#ff4d6d', m: 3.5, p: 1 },
];
const SLOTS = { arma: 'Arma', armadura: 'Armadura', anel: 'Anel' };

// ---------- Desenhos em pixel art ----------
const MOLDES = {
  humano: ['...hhhh...', '..hhhhhh..', '..hsssss..', '..sesses..', '..ssssss..', '.rrrrrrrr.', 'srrddrrrrs', 'srrddrrrrs', '.rrrrrrrr.', '..rr..rr..', '..bb..bb..', '..bb..bb..'],
  slime: ['...aaaa...', '..aaaaaa..', '.aaaaaaaa.', '.aeaaaaea.', 'aaaaaaaaaa', 'aaaaaaaaaa', '.bbbbbbbb.'],
  morcego: ['a...a.a...a', 'aa.aaaaa.aa', 'aaaaeaeaaaa', 'aaaaaaaaaaa', '.aa.aaa.aa.', '....a.a....'],
};
function sprite(linhas, cores) {
  const c = document.createElement('canvas');
  c.width = Math.max(...linhas.map((l) => l.length)); c.height = linhas.length;
  const g = c.getContext('2d');
  linhas.forEach((l, y) => [...l].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    g.fillStyle = cores[ch] || (ch === 'e' ? '#151515' : '#f0f');
    g.fillRect(x, y, 1, 1);
  }));
  return c;
}
const spriteHeroi = (h) => sprite(h.desenho || MOLDES.humano, h.cores);

const TIPOS = {
  slime: { molde: 'slime', cores: { a: '#5fd35f', b: '#3b9a3b' }, vida: 30, atk: 8, vel: 45, xp: 10, r: 11 },
  morcego: { molde: 'morcego', cores: { a: '#6b4a8a', e: '#ff5' }, vida: 18, atk: 6, vel: 88, xp: 9, r: 9, voa: true },
  areia: { molde: 'slime', cores: { a: '#e0b050', b: '#b08030' }, vida: 40, atk: 10, vel: 55, xp: 13, r: 11 },
  mumia: { molde: 'humano', cores: { h: '#d8d0b0', s: '#d8d0b0', r: '#c0b890', d: '#a09870', b: '#908860', e: '#d22' }, vida: 70, atk: 14, vel: 38, xp: 20, r: 11 },
  esqueleto: { molde: 'humano', cores: { h: '#eee', s: '#eee', r: '#bbb', d: '#888', b: '#777' }, vida: 34, atk: 9, vel: 42, xp: 16, r: 11, tiro: '#e8e8e8' },
  geleia: { molde: 'slime', cores: { a: '#9fe0ff', b: '#5aa8d8' }, vida: 46, atk: 11, vel: 50, xp: 14, r: 11 },
  morcegoGelo: { molde: 'morcego', cores: { a: '#cfefff', e: '#06c' }, vida: 24, atk: 8, vel: 95, xp: 12, r: 9, voa: true },
  xama: { molde: 'humano', cores: { h: '#2a5a8a', s: '#9fd0e8', r: '#284a7a', d: '#7fe0ff', b: '#1a2a4a', e: '#fff' }, vida: 40, atk: 11, vel: 40, xp: 18, r: 11, tiro: '#7fe0ff' },
};
const REINOS = [
  { nome: 'Bosque Verde', chao: ['#3f7d3a', '#468840'], obst: 'arvore', inimigos: ['slime', 'slime', 'morcego'], chefe: { nome: 'Rei Gosma', tipo: 'slime' } },
  { nome: 'Dunas Rubras', chao: ['#c9a25a', '#d1ac66'], obst: 'pedra', inimigos: ['areia', 'mumia', 'esqueleto'], chefe: { nome: 'Guardião das Dunas', tipo: 'mumia' } },
  { nome: 'Geleira Azul', chao: ['#cfe6f2', '#dceef7'], obst: 'cristal', inimigos: ['geleia', 'morcegoGelo', 'xama'], chefe: { nome: 'Titã de Gelo', tipo: 'xama' } },
];
const SPR = {};
for (const k in TIPOS) SPR[k] = sprite(MOLDES[TIPOS[k].molde], TIPOS[k].cores);

// ---------- Estado ----------
let heroi = null, P = null, mapa = null, reino = null, mult = 1;
let inimigos = [], tiros = [], drops = [], efeitos = [], textos = [];
let fase = 0, abates = 0, onda = 0, chefe = null, portal = null;
let pausado = true, tempoSpawn = 0, zoom = 2, cam = { x: 0, y: 0 }, relogio = 0;
const ctl = { mx: 0, my: 0, atq: false, hab: false, esq: false, pocao: false, joy: null, mouse: null, teclas: {} };

function lerSalvos() { try { return JSON.parse(localStorage.getItem(SALVO)) || {}; } catch { return {}; } }
function salvar() {
  if (!P) return;
  try {
    const s = lerSalvos();
    s[heroi.id] = { nivel: P.nivel, xp: P.xp, ouro: P.ouro, pocoes: P.pocoes, eq: P.eq, inv: P.inv, reino: P.reino };
    localStorage.setItem(SALVO, JSON.stringify(s));
  } catch { /* sem armazenamento: joga sem salvar */ }
}

// ---------- Atributos e itens ----------
function atributos() {
  const n = P.nivel - 1; let atk = heroi.ataque + n * 2.2, def = heroi.defesa + n * 0.6, vida = heroi.vida + n * 14;
  for (const s in P.eq) { const it = P.eq[s]; if (it) { atk += it.atk; def += it.def; vida += it.hp; } }
  return { atk: Math.round(atk), def: Math.round(def), vida: Math.round(vida) };
}
const xpProx = () => Math.round(40 * Math.pow(P.nivel, 1.5));
const valorItem = (it) => 5 * it.nivel * (it.rar + 1) ** 2;
function criarItem(nivel, bonus = 0) {
  let r = Math.random() * 100 * (1 - bonus), rar = 0, soma = 0;
  for (let i = RAR.length - 1; i >= 0; i--) { soma += RAR[i].p; if (r < soma) { rar = i; break; } }
  const slot = Object.keys(SLOTS)[Math.floor(Math.random() * 3)];
  const base = (4 + nivel * 2) * RAR[rar].m * rnd(0.85, 1.15);
  const it = { slot, rar, nivel, atk: 0, def: 0, hp: 0 };
  if (slot === 'arma') it.atk = Math.round(base);
  else if (slot === 'armadura') { it.def = Math.round(base * 0.5); it.hp = Math.round(base * 3); }
  else { it.atk = Math.round(base * 0.4); it.hp = Math.round(base * 2); }
  const g = slot === 'anel' ? 'o' : 'a';
  it.nome = `${SLOTS[slot]} ${['simples', 'refinad' + g, 'encantad' + g, 'ancestral', 'divin' + g][rar]}`;
  return it;
}
const statsTxt = (it) => [it.atk && `+${it.atk} ATQ`, it.def && `+${it.def} DEF`, it.hp && `+${it.hp} VIDA`].filter(Boolean).join(' · ');
const poder = (it) => (it ? it.atk * 3 + it.def * 4 + it.hp : 0);

// ---------- Mapa ----------
function semente(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gerarMapa() {
  const r = semente(P.reino * 7919 + 13); mapa = new Uint8Array(MW * MH);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const d = Math.hypot((x + .5) * T - CX, (y + .5) * T - CY);
    let v = 0;
    if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) v = 1;
    else if (d < VILA) v = 2;
    else if (d > VILA + T && r() < 0.075) v = 1;
    mapa[y * MW + x] = v;
  }
  const c = MW / 2;
  for (const [hx, hy] of [[-4, -3], [3, -3], [-4, 2], [3, 2]]) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) mapa[(c + hy + j) * MW + c + hx + i] = 3;
}
const bloco = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx < 0 || ty < 0 || tx >= MW || ty >= MH ? 1 : mapa[ty * MW + tx]; };
const solido = (x, y) => { const b = bloco(x, y); return b === 1 || b === 3; };
const livre = (x, y, r) => !solido(x - r, y - r) && !solido(x + r, y - r) && !solido(x - r, y + r) && !solido(x + r, y + r);
const naVila = (o, folga = 0) => Math.hypot(o.x - CX, o.y - CY) < VILA + folga;
function mover(o, dx, dy, voa) {
  if (voa) { o.x = clamp(o.x + dx, T * 1.5, (MW - 1.5) * T); o.y = clamp(o.y + dy, T * 1.5, (MH - 1.5) * T); return; }
  if (livre(o.x + dx, o.y, o.r * 0.7)) o.x += dx;
  if (livre(o.x, o.y + dy, o.r * 0.7)) o.y += dy;
}

// ---------- Início / reinos ----------
function iniciar(h) {
  heroi = h; const s = lerSalvos()[h.id];
  P = Object.assign({ nivel: 1, xp: 0, ouro: 0, pocoes: 3, eq: { arma: null, armadura: null, anel: null }, inv: [], reino: 0 }, s || {});
  Object.assign(P, { x: CX, y: CY, r: 10, dir: 0, lado: 1, cdAtq: 0, cdHab: 0, cdEsq: 0, cdPocao: 0, esquiva: 0, inv_t: 0, anda: 0, spr: spriteHeroi(h) });
  P.vida = atributos().vida;
  $('#titulo').hidden = true; $('#hud').hidden = false; pausado = false;
  entrarReino();
}
function entrarReino() {
  reino = REINOS[P.reino % REINOS.length]; mult = Math.pow(1.3, P.reino);
  gerarMapa(); P.x = CX; P.y = CY;
  inimigos = []; tiros = []; drops = []; efeitos = []; textos = [];
  fase = 0; abates = 0; onda = 0; chefe = null; portal = null; tempoSpawn = 1;
  aviso(`${reino.nome}\nNível do reino ${P.reino + 1}`); salvar(); hud();
}
function meta() { return 8 + Math.min(P.reino, 6) * 2; }

function criarInimigo(tipo, x, y, ehChefe) {
  const t = TIPOS[tipo], e = { tipo, x, y, r: t.r, vidaMax: Math.round(t.vida * mult), atk: t.atk * Math.pow(1.24, P.reino), vel: t.vel, xp: Math.round(t.xp * mult), voa: t.voa, tiro: t.tiro, cd: rnd(1, 2.5), bate: 0, lado: 1, esc: 1, pisca: 0 };
  if (ehChefe) Object.assign(e, { chefe: true, nome: reino.chefe.nome, esc: 2.4, r: t.r * 2.2, vidaMax: e.vidaMax * 14, atk: e.atk * 1.7, xp: e.xp * 15, vel: t.vel * 0.9, voa: true });
  e.vida = e.vidaMax; inimigos.push(e); return e;
}
function pontoSpawn(min, max) {
  for (let i = 0; i < 30; i++) {
    const a = rnd(0, 6.283), d = rnd(min, max), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
    if (livre(x, y, 12) && !naVila({ x, y }, T * 2)) return { x, y };
  }
  return null;
}
function spawn(qtd, daOnda) {
  for (let i = 0; i < qtd; i++) {
    const p = pontoSpawn(230, 420); if (!p) continue;
    const e = criarInimigo(reino.inimigos[Math.floor(Math.random() * reino.inimigos.length)], p.x, p.y);
    e.onda = daOnda;
  }
}

// ---------- Combate ----------
function texto(x, y, t, cor) { textos.push({ x: x + rnd(-6, 6), y, t, cor, v: 0.8 }); }
function ferir(e, dano) {
  const crit = Math.random() < 0.12; dano = Math.max(1, Math.round(dano * rnd(0.85, 1.15) * (crit ? 2 : 1)));
  e.vida -= dano; e.pisca = 0.12; texto(e.x, e.y - e.r * 2, dano + (crit ? '!' : ''), crit ? '#ffd23f' : '#fff');
  if (e.vida <= 0 && !e.morto) matar(e);
}
function matar(e) {
  e.morto = true; ganharXp(e.xp);
  drops.push({ x: e.x, y: e.y, ouro: Math.round(rnd(2, 6) * mult * (e.chefe ? 12 : 1)), v: 0 });
  if (e.chefe || Math.random() < 0.2) drops.push({ x: e.x + rnd(-14, 14), y: e.y + rnd(-14, 14), item: criarItem(P.reino + 1, e.chefe ? 0.7 : 0), v: 0 });
  if (e.chefe || Math.random() < 0.08) drops.push({ x: e.x + rnd(-14, 14), y: e.y + rnd(-14, 14), pocao: true, v: 0 });
  efeitos.push({ tipo: 'circulo', x: e.x, y: e.y, r: e.r * 1.8, v: 0.25, t: 0.25, cor: '#fff' });
  if (e.chefe) { chefe = null; fase = 3; portal = { x: e.x, y: e.y }; aviso('Chefe derrotado!\nEntre no portal'); }
  else if (fase === 0) { abates++; if (abates >= meta()) { fase = 1; onda = 0; proximaOnda(); } }
  hud();
}
function proximaOnda() {
  onda++;
  if (onda > 3) {
    fase = 2; const p = pontoSpawn(200, 300) || { x: P.x + 200, y: P.y };
    chefe = criarInimigo(reino.chefe.tipo, p.x, p.y, true); aviso(`${reino.chefe.nome}\napareceu!`);
  } else { spawn(4 + onda * 2, onda); aviso(`Onda ${onda} / 3`); }
  hud();
}
function ganharXp(q) {
  P.xp += q;
  while (P.xp >= xpProx()) { P.xp -= xpProx(); P.nivel++; P.vida = atributos().vida; aviso(`Nível ${P.nivel}!`); efeitos.push({ tipo: 'circulo', x: P.x, y: P.y, r: 60, v: 0.5, t: 0.5, cor: '#f0c64a' }); }
}
function alvoProximo(max = 280) { let m = null, md = max; for (const e of inimigos) { const d = dist(e, P); if (d < md) { md = d; m = e; } } return m; }
function mirar() {
  if (ctl.mouse) { P.dir = Math.atan2(ctl.mouse.y / zoom + cam.y - P.y, ctl.mouse.x / zoom + cam.x - P.x); return; }
  const a = alvoProximo(); if (a) P.dir = Math.atan2(a.y - P.y, a.x - P.x);
}
function atirar(ang, dano, g) {
  tiros.push({ x: P.x, y: P.y - 4, vx: Math.cos(ang) * g.velocidade, vy: Math.sin(ang) * g.velocidade, dano, v: 1.1, r: g.tamanho || 3, cor: g.cor, meu: true, perfura: g.perfura || 0, ja: new Set() });
}
function atacar() {
  const g = heroi.golpe, A = atributos(); P.cdAtq = g.recarga; mirar();
  if (g.tipo === 'corte') {
    efeitos.push({ tipo: 'corte', x: P.x, y: P.y, dir: P.dir, r: g.alcance, arco: g.arco, v: 0.14, t: 0.14, cor: g.cor });
    for (const e of inimigos) {
      const d = dist(e, P); if (d > g.alcance + e.r) continue;
      let da = Math.atan2(e.y - P.y, e.x - P.x) - P.dir; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < g.arco / 2 || d < e.r + 8) ferir(e, A.atk);
    }
  } else atirar(P.dir, A.atk, g);
}
function habilidade() {
  const h = heroi.habilidade, A = atributos(); P.cdHab = h.recarga; mirar();
  if (h.tipo === 'giro') {
    efeitos.push({ tipo: 'circulo', x: P.x, y: P.y, r: h.raio, v: 0.3, t: 0.3, cor: '#ffe9a8' });
    for (const e of inimigos) if (dist(e, P) < h.raio + e.r) ferir(e, A.atk * h.forca);
  } else if (h.tipo === 'rajada') {
    const g = Object.assign({ velocidade: 330, cor: '#fff' }, heroi.golpe.tipo === 'projetil' ? heroi.golpe : {});
    for (let i = 0; i < h.flechas; i++) atirar(P.dir + (i - (h.flechas - 1) / 2) * 0.13, A.atk * h.forca, g);
  } else {
    const a = ctl.mouse ? null : alvoProximo();
    const x = a ? a.x : ctl.mouse ? ctl.mouse.x / zoom + cam.x : P.x + Math.cos(P.dir) * 110;
    const y = a ? a.y : ctl.mouse ? ctl.mouse.y / zoom + cam.y : P.y + Math.sin(P.dir) * 110;
    efeitos.push({ tipo: 'circulo', x, y, r: h.raio, v: 0.4, t: 0.4, cor: heroi.golpe.cor || '#7fe0ff', cheio: true });
    for (const e of inimigos) if (Math.hypot(e.x - x, e.y - y) < h.raio + e.r) ferir(e, A.atk * h.forca);
  }
}
function danoNoHeroi(q) {
  if (P.esquiva > 0 || P.inv_t > 0) return;
  const d = Math.max(1, Math.round(q - atributos().def * 0.6)); P.vida -= d; P.inv_t = 0.35;
  texto(P.x, P.y - 26, '-' + d, '#ff6b7a');
  if (P.vida <= 0) morrer();
}
function morrer() {
  const perda = Math.round(P.ouro * 0.1); P.ouro -= perda;
  inimigos = []; tiros = []; chefe = null; if (fase < 3) { fase = 0; abates = 0; onda = 0; }
  P.x = CX; P.y = CY; P.vida = atributos().vida;
  aviso(`Você caiu!\n-${perda} de ouro · de volta à vila`); salvar(); hud();
}
function usarPocao() {
  const A = atributos(); if (P.pocoes < 1 || P.cdPocao > 0 || P.vida >= A.vida) return;
  P.pocoes--; P.cdPocao = 1; const c = Math.round(A.vida * 0.45); P.vida = Math.min(A.vida, P.vida + c); texto(P.x, P.y - 26, '+' + c, '#6fe08a'); hud();
}

// ---------- Atualização ----------
function atualizar(dt) {
  relogio += dt;
  for (const k of ['cdAtq', 'cdHab', 'cdEsq', 'cdPocao', 'esquiva', 'inv_t']) P[k] = Math.max(0, P[k] - dt);
  const A = atributos(), segura = naVila(P);
  // movimento
  const k = ctl.teclas; let mx = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), my = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
  if (ctl.joy) { mx = ctl.joy.dx; my = ctl.joy.dy; }
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  if (m > 0.1) { if (!ctl.mouse && !alvoProximo()) P.dir = Math.atan2(my, mx); P.lado = mx < -0.1 ? -1 : mx > 0.1 ? 1 : P.lado; P.anda += dt * 10; }
  if ((ctl.esq || k.shift) && P.cdEsq <= 0 && m > 0.1) { P.esquiva = 0.18; P.cdEsq = 1.4; }
  ctl.esq = false;
  const vel = heroi.velocidade * (P.esquiva > 0 ? 3.6 : 1);
  mover(P, mx * vel * dt, my * vel * dt);
  // ações
  if (segura) P.vida = Math.min(A.vida, P.vida + A.vida * 0.12 * dt);
  else {
    if ((ctl.atq || k.j || ctl.mouseAtq) && P.cdAtq <= 0) atacar();
    if ((ctl.hab || k[' '] || k.k) && P.cdHab <= 0) habilidade();
  }
  ctl.hab = false;
  if (ctl.pocao || k.q) usarPocao(); ctl.pocao = false;
  if (ctl.mouse || alvoProximo()) { const c = Math.cos(P.dir); if (Math.abs(c) > 0.2 && (ctl.atq || ctl.mouseAtq)) P.lado = c < 0 ? -1 : 1; }

  // geração de inimigos
  if (fase === 0) { tempoSpawn -= dt; if (tempoSpawn <= 0 && inimigos.length < 7 + Math.min(P.reino, 5)) { spawn(1); tempoSpawn = 1.1; } }
  else if (fase === 1 && !inimigos.some((e) => e.onda === onda)) proximaOnda();

  // inimigos
  for (const e of inimigos) {
    e.pisca = Math.max(0, e.pisca - dt); e.bate = Math.max(0, e.bate - dt); e.cd -= dt;
    const d = dist(e, P), ang = Math.atan2(P.y - e.y, P.x - e.x); let v = e.vel, dir = ang;
    if (segura) { dir = Math.atan2(e.y - CY, e.x - CX); v = Math.hypot(e.x - CX, e.y - CY) < VILA + T * 3 ? e.vel * 0.6 : 0; }
    else if (e.tiro && !e.chefe) { if (d < 120) dir = ang + Math.PI; else if (d < 170) v = 0; }
    if (e.onda && d > 520 && !segura) v = e.vel * 2.2;
    const nx = e.x + Math.cos(dir) * v * dt, ny = e.y + Math.sin(dir) * v * dt;
    if (!naVila({ x: nx, y: ny }, e.r)) mover(e, nx - e.x, ny - e.y, e.voa);
    if (v > 0) e.lado = Math.cos(dir) < 0 ? -1 : 1;
    if (segura) continue;
    if (d < e.r + P.r && e.bate <= 0) { e.bate = 0.8; danoNoHeroi(e.atk); }
    if (e.cd <= 0 && d < 330) {
      if (e.chefe) { e.cd = 2.6; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + relogio; tiros.push({ x: e.x, y: e.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, dano: e.atk * 0.7, v: 3, r: 4, cor: '#ff7a5a' }); } }
      else if (e.tiro) { e.cd = 2.2; tiros.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 130, vy: Math.sin(ang) * 130, dano: e.atk, v: 3, r: 3, cor: e.tiro }); }
    }
  }
  inimigos = inimigos.filter((e) => !e.morto);

  // projéteis
  for (const t of tiros) {
    t.x += t.vx * dt; t.y += t.vy * dt; t.v -= dt;
    if (solido(t.x, t.y)) t.v = 0;
    if (t.meu) {
      for (const e of inimigos) if (!t.ja.has(e) && Math.hypot(e.x - t.x, e.y - t.y) < e.r + t.r) { t.ja.add(e); ferir(e, t.dano); if (t.perfura-- <= 0) { t.v = 0; break; } }
    } else if (Math.hypot(P.x - t.x, P.y - t.y) < P.r + t.r) { t.v = 0; danoNoHeroi(t.dano); }
    if (!t.meu && naVila(t)) t.v = 0;
  }
  tiros = tiros.filter((t) => t.v > 0);

  // itens no chão
  for (const d of drops) {
    d.v += dt; const q = dist(d, P);
    if (q < 70 && d.v > 0.3) { d.x += (P.x - d.x) * dt * 6; d.y += (P.y - d.y) * dt * 6; }
    if (q < 16 && d.v > 0.3) {
      d.pego = true;
      if (d.ouro) { P.ouro += d.ouro; texto(P.x, P.y - 26, `+${d.ouro} ouro`, '#f0c64a'); }
      else if (d.pocao) { P.pocoes++; texto(P.x, P.y - 26, '+1 poção', '#6fe08a'); }
      else if (P.inv.length >= 30) { P.ouro += valorItem(d.item); texto(P.x, P.y - 26, 'Mochila cheia: vendido', '#f0c64a'); }
      else { P.inv.push(d.item); texto(P.x, P.y - 30, d.item.nome, RAR[d.item.rar].c); if (poder(d.item) > poder(P.eq[d.item.slot])) texto(P.x, P.y - 42, 'Melhor que o seu! 🎒', '#6fe08a'); }
      hud();
    }
  }
  drops = drops.filter((d) => !d.pego && d.v < 60);
  if (portal && Math.hypot(P.x - portal.x, P.y - portal.y) < 22) { P.reino++; entrarReino(); }
  for (const e of efeitos) e.v -= dt; efeitos = efeitos.filter((e) => e.v > 0);
  for (const t of textos) { t.v -= dt; t.y -= 26 * dt; } textos = textos.filter((t) => t.v > 0);
  hudRapido(A);
}

// ---------- Desenho ----------
function px(img, x, y, esc, lado, alfa) {
  const w = img.width * esc, h = img.height * esc;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (lado < 0) ctx.scale(-1, 1); if (alfa != null) ctx.globalAlpha = alfa;
  ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
}
function sombra(x, y, r) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, 6.283); ctx.fill(); }
function obstaculo(x, y, b) {
  if (b === 3) {
    const topo = mapa[(y / T - 1) * MW + x / T] !== 3;
    ctx.fillStyle = '#d9c9a0'; ctx.fillRect(x, y - 6, T, T + 6);
    if (topo) { ctx.fillStyle = '#7a4a8f'; ctx.fillRect(x - 2, y - 22, T + 4, 20); ctx.fillStyle = '#5d3670'; ctx.fillRect(x - 2, y - 4, T + 4, 3); ctx.fillStyle = '#8fd0ff'; ctx.fillRect(x + 11, y + 8, 10, 10); }
    else { ctx.fillStyle = '#5a4630'; ctx.fillRect(x + 11, y + 10, 10, 16); }
    return;
  }
  sombra(x + 16, y + 28, 13);
  if (reino.obst === 'arvore') { ctx.fillStyle = '#6b4423'; ctx.fillRect(x + 13, y + 12, 6, 16); ctx.fillStyle = '#2c6a2c'; ctx.fillRect(x + 3, y - 10, 26, 20); ctx.fillStyle = '#3c8a3a'; ctx.fillRect(x + 7, y - 16, 18, 16); ctx.fillStyle = '#58a84e'; ctx.fillRect(x + 10, y - 13, 7, 5); }
  else if (reino.obst === 'pedra') { ctx.fillStyle = '#8a6a48'; ctx.fillRect(x + 3, y + 8, 26, 20); ctx.fillStyle = '#a8845c'; ctx.fillRect(x + 7, y + 1, 18, 14); ctx.fillStyle = '#c2a074'; ctx.fillRect(x + 10, y + 4, 7, 4); }
  else { ctx.fillStyle = '#6ab8e0'; ctx.fillRect(x + 11, y - 12, 10, 40); ctx.fillStyle = '#9fe0ff'; ctx.fillRect(x + 4, y + 6, 8, 22); ctx.fillRect(x + 20, y + 2, 8, 26); ctx.fillStyle = '#e6f8ff'; ctx.fillRect(x + 13, y - 9, 3, 16); }
}
function desenhar() {
  const W = cv.width / zoom, H = cv.height / zoom;
  cam.x = clamp(P.x - W / 2, 0, Math.max(0, MW * T - W)); cam.y = clamp(P.y - H / 2, 0, Math.max(0, MH * T - H));
  ctx.setTransform(zoom, 0, 0, zoom, -Math.round(cam.x * zoom), -Math.round(cam.y * zoom));
  ctx.imageSmoothingEnabled = false;
  const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T)), x1 = Math.min(MW - 1, Math.ceil((cam.x + W) / T)), y1 = Math.min(MH - 1, Math.ceil((cam.y + H) / T) + 1);
  const lista = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const b = mapa[y * MW + x], par = (x * 7 + y * 13) % 3 === 0;
    ctx.fillStyle = b === 2 || b === 3 ? (par ? '#8d8aa0' : '#9a97ad') : reino.chao[par ? 1 : 0];
    ctx.fillRect(x * T, y * T, T + 1, T + 1);
    if (b === 1 || b === 3) lista.push({ y: y * T + T, f: () => obstaculo(x * T, y * T, b) });
  }
  ctx.strokeStyle = 'rgba(240,198,74,.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(CX, CY, VILA, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
  if (portal) { const p = 1 + Math.sin(relogio * 5) * 0.12; ctx.fillStyle = '#b45cff'; ctx.beginPath(); ctx.ellipse(portal.x, portal.y, 18 * p, 24 * p, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#f0d8ff'; ctx.beginPath(); ctx.ellipse(portal.x, portal.y, 9 * p, 14 * p, 0, 0, 6.283); ctx.fill(); }
  for (const d of drops) {
    const cor = d.ouro ? '#f0c64a' : d.pocao ? '#ff5d7a' : RAR[d.item.rar].c, q = Math.sin(relogio * 6 + d.x) * 2;
    sombra(d.x, d.y + 4, 5); ctx.fillStyle = cor; ctx.save(); ctx.translate(d.x, d.y - 4 + q); ctx.rotate(0.785); ctx.fillRect(-4, -4, 8, 8); ctx.restore();
    if (d.item && d.item.rar >= 2) { ctx.fillStyle = cor; ctx.globalAlpha = 0.3; ctx.fillRect(d.x - 1, d.y - 40, 2, 36); ctx.globalAlpha = 1; }
  }
  for (const e of inimigos) lista.push({ y: e.y, f: () => {
    sombra(e.x, e.y, e.r); const alt = e.voa && !e.chefe ? 8 + Math.sin(relogio * 8 + e.x) * 2 : 0;
    px(SPR[e.tipo], e.x, e.y - alt + (e.voa ? 0 : Math.abs(Math.sin(relogio * 6 + e.x)) * -2), 2 * e.esc, e.lado, e.pisca > 0 ? 0.45 : null);
    if (e.vida < e.vidaMax && !e.chefe) { const w = 22, y = e.y - SPR[e.tipo].height * 2 - alt - 6; ctx.fillStyle = '#300'; ctx.fillRect(e.x - w / 2, y, w, 3); ctx.fillStyle = '#ff5d6c'; ctx.fillRect(e.x - w / 2, y, w * e.vida / e.vidaMax, 3); }
  } });
  lista.push({ y: P.y, f: () => {
    sombra(P.x, P.y, 9); const pisca = P.inv_t > 0 && Math.floor(relogio * 30) % 2;
    px(P.spr, P.x, P.y - Math.abs(Math.sin(P.anda)) * 1.5, 2.4, P.lado, P.esquiva > 0 || pisca ? 0.5 : null);
  } });
  lista.sort((a, b) => a.y - b.y).forEach((o) => o.f());
  for (const t of tiros) { ctx.fillStyle = t.cor; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 6.283); ctx.fill(); }
  for (const e of efeitos) {
    const k = e.v / e.t; ctx.globalAlpha = k; ctx.strokeStyle = ctx.fillStyle = e.cor; ctx.lineWidth = 4;
    ctx.beginPath();
    if (e.tipo === 'corte') ctx.arc(e.x, e.y - 8, e.r, e.dir - e.arco / 2, e.dir + e.arco / 2); else ctx.arc(e.x, e.y, e.r * (1 - k * 0.5), 0, 6.283);
    if (e.cheio) { ctx.globalAlpha = k * 0.4; ctx.fill(); ctx.globalAlpha = k; }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const t of textos) { ctx.globalAlpha = Math.min(1, t.v * 3); ctx.fillStyle = '#000'; ctx.fillText(t.t, t.x + 1, t.y + 1); ctx.fillStyle = t.cor; ctx.fillText(t.t, t.x, t.y); }
  ctx.globalAlpha = 1;
  // camada fixa na tela
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const dpr = window.devicePixelRatio || 1;
  if (chefe) {
    const w = Math.min(cv.width * 0.5, 420 * dpr), x = (cv.width - w) / 2, y = 64 * dpr, h = 12 * dpr;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6); ctx.fillStyle = '#b45cff'; ctx.fillRect(x, y, w * Math.max(0, chefe.vida / chefe.vidaMax), h);
    ctx.fillStyle = '#fff'; ctx.font = `bold ${13 * dpr}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(chefe.nome, cv.width / 2, y - 8 * dpr);
  }
  const alvo = portal || chefe;
  if (alvo && Math.hypot(alvo.x - P.x, alvo.y - P.y) > 150) {
    const a = Math.atan2(alvo.y - P.y, alvo.x - P.x), r = Math.min(cv.width, cv.height) * 0.3;
    ctx.save(); ctx.translate(cv.width / 2 + Math.cos(a) * r, cv.height / 2 + Math.sin(a) * r); ctx.rotate(a); ctx.fillStyle = '#b45cff'; ctx.beginPath(); ctx.moveTo(14 * dpr, 0); ctx.lineTo(-8 * dpr, -9 * dpr); ctx.lineTo(-8 * dpr, 9 * dpr); ctx.fill(); ctx.restore();
  }
  if (ctl.joy) {
    const j = ctl.joy; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3 * dpr; ctx.beginPath(); ctx.arc(j.ox * dpr, j.oy * dpr, 46 * dpr, 0, 6.283); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc((j.ox + j.dx * 46) * dpr, (j.oy + j.dy * 46) * dpr, 20 * dpr, 0, 6.283); ctx.fill();
  }
}

// ---------- Interface ----------
let avisoT = 0;
function aviso(t) { const a = $('#aviso'); a.textContent = t; a.classList.add('on'); clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.remove('on'), 2200); }
function hud() {
  $('#h-nome').textContent = `${heroi.nome} · Nv ${P.nivel}`; $('#h-ouro').textContent = `🪙 ${P.ouro}`; $('#h-pocoes').textContent = P.pocoes;
  $('#h-reino').textContent = `${reino.nome} ${P.reino + 1}`;
  $('#h-meta').textContent = fase === 0 ? `Derrote inimigos ${abates}/${meta()}` : fase === 1 ? `Onda ${onda}/3 · restam ${inimigos.filter((e) => e.onda === onda).length}` : fase === 2 ? `Derrote ${reino.chefe.nome}` : 'Entre no portal';
}
function cd(botao, resta, total) {
  let c = botao.querySelector('.cd'); if (!c) { c = document.createElement('div'); c.className = 'cd'; botao.appendChild(c); }
  c.style.height = `${clamp(resta / total, 0, 1) * 100}%`;
}
function hudRapido(A) {
  $('#h-vida').style.width = `${clamp(P.vida / A.vida, 0, 1) * 100}%`; $('#h-vida-t').textContent = `${Math.ceil(P.vida)} / ${A.vida}`;
  $('#h-xp').style.width = `${P.xp / xpProx() * 100}%`;
  cd($('#b-hab'), P.cdHab, heroi.habilidade.recarga); cd($('#b-esquiva'), P.cdEsq, 1.4);
  $('#hud').classList.toggle('segura', naVila(P));
}
function linhaItem(it, acoes, comparar) {
  const dif = comparar ? poder(it) - poder(P.eq[it.slot]) : 0;
  return `<div class="item" style="border-color:${RAR[it.rar].c}"><div class="info"><b style="color:${RAR[it.rar].c}">${it.nome} <small>Nv ${it.nivel}</small></b><span>${RAR[it.rar].n} · ${statsTxt(it)}${comparar ? ` <span class="${dif > 0 ? 'melhor' : 'pior'}">${dif > 0 ? '▲ melhor' : dif < 0 ? '▼ pior' : ''}</span>` : ''}</span></div><div class="acoes">${acoes}</div></div>`;
}
function mochila() {
  const A = atributos();
  $('#m-atrib').textContent = `Ataque ${A.atk} · Defesa ${A.def} · Vida ${A.vida} · 🪙 ${P.ouro}`;
  $('#m-equip').innerHTML = Object.keys(SLOTS).map((s) => (P.eq[s] ? linhaItem(P.eq[s], `<button data-tirar="${s}">Tirar</button>`) : `<div class="vazio">${SLOTS[s]}: vazio</div>`)).join('');
  $('#m-qtd').textContent = `(${P.inv.length}/30)`;
  $('#m-itens').innerHTML = P.inv.length ? P.inv.map((it, i) => linhaItem(it, `<button data-equipar="${i}">Equipar</button><button data-vender="${i}">🪙 ${valorItem(it)}</button>`, true)).join('') : '<div class="vazio">Nenhum item ainda. Derrote inimigos para encontrar equipamentos.</div>';
}
function abrirMochila(abre) { $('#mochila').hidden = !abre; pausado = abre; if (abre) mochila(); else { salvar(); hud(); } }
$('#mochila').addEventListener('click', (ev) => {
  const d = ev.target.dataset; if (!d) return;
  const vidaMax = atributos().vida;
  if (d.equipar != null) { const it = P.inv[d.equipar], velho = P.eq[it.slot]; P.eq[it.slot] = it; if (velho) P.inv[d.equipar] = velho; else P.inv.splice(d.equipar, 1); }
  else if (d.vender != null) { P.ouro += valorItem(P.inv[d.vender]); P.inv.splice(d.vender, 1); }
  else if (d.tirar) { if (P.inv.length >= 30) return; P.inv.push(P.eq[d.tirar]); P.eq[d.tirar] = null; }
  else return;
  P.vida = clamp(P.vida / vidaMax, 0.01, 1) * atributos().vida; mochila();
});
$('#m-vender').onclick = () => { P.inv = P.inv.filter((it) => { if (it.rar > 0) return true; P.ouro += valorItem(it); return false; }); mochila(); };
$('#m-fechar').onclick = () => abrirMochila(false);
$('#b-mochila').onclick = () => abrirMochila(true);
$('#b-sair').onclick = () => { salvar(); pausado = true; P = null; $('#hud').hidden = true; telaTitulo(); };

function telaTitulo() {
  const s = lerSalvos(), cx = $('#herois'); cx.innerHTML = ''; $('#titulo').hidden = false;
  for (const h of window.HEROIS) {
    const b = document.createElement('button'); b.className = 'heroi';
    const img = spriteHeroi(h), c = document.createElement('canvas'); c.width = 80; c.height = 96;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const e = Math.min(80 / img.width, 96 / img.height); g.drawImage(img, (80 - img.width * e) / 2, 96 - img.height * e, img.width * e, img.height * e);
    b.append(c); b.insertAdjacentHTML('beforeend', `<b>${h.nome}</b><span>${h.desc}</span><em>${s[h.id] ? `Continuar · Nv ${s[h.id].nivel} · Reino ${s[h.id].reino + 1}` : 'Novo herói'}</em>`);
    b.onclick = () => iniciar(h); cx.append(b);
  }
}

// ---------- Controles ----------
function segurar(id, liga, desliga) {
  const b = $(id);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); liga(); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { b.classList.remove('on'); if (desliga) desliga(); });
}
segurar('#b-atq', () => { ctl.atq = true; ctl.mouse = null; }, () => { ctl.atq = false; });
segurar('#b-hab', () => { ctl.hab = true; });
segurar('#b-esquiva', () => { ctl.esq = true; });
segurar('#b-pocao', () => { ctl.pocao = true; });
cv.addEventListener('pointerdown', (e) => {
  if (pausado) return;
  if (e.pointerType === 'mouse') { ctl.mouse = { x: e.clientX * dprAtual(), y: e.clientY * dprAtual() }; ctl.mouseAtq = true; }
  else if (!ctl.joy) { ctl.mouse = null; ctl.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 }; }
});
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') { ctl.mouse = { x: e.clientX * dprAtual(), y: e.clientY * dprAtual() }; return; }
  const j = ctl.joy; if (!j || j.id !== e.pointerId) return;
  let dx = (e.clientX - j.ox) / 46, dy = (e.clientY - j.oy) / 46; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  j.dx = dx; j.dy = dy;
});
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, (e) => { if (e.pointerType === 'mouse') ctl.mouseAtq = false; else if (ctl.joy && ctl.joy.id === e.pointerId) ctl.joy = null; });
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); ctl.teclas[k] = true;
  if (!P) return;
  if (k === 'i' || k === 'b') abrirMochila($('#mochila').hidden); else if (k === 'escape') abrirMochila(false);
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { ctl.teclas[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { ctl.teclas = {}; ctl.joy = null; ctl.atq = ctl.mouseAtq = false; });
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden) salvar(); });
setInterval(salvar, 15000);

const dprAtual = () => window.devicePixelRatio || 1;
function ajustar() {
  const d = dprAtual(); cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d);
  zoom = Math.max(1.4, Math.min(innerWidth, innerHeight) / 300) * d;
}
window.addEventListener('resize', ajustar); ajustar();

let ultimo = 0;
function quadro(t) {
  const dt = Math.min(0.05, (t - ultimo) / 1000 || 0); ultimo = t;
  if (P) { if (!pausado) atualizar(dt); desenhar(); }
  requestAnimationFrame(quadro);
}
telaTitulo(); requestAnimationFrame(quadro);
// Acesso para testes automatizados.
window.__jogo = { get P() { return P; }, get inimigos() { return inimigos; }, get fase() { return fase; }, atributos };
})();
