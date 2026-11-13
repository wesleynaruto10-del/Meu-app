'use strict';

/* ---------- Dados ---------- */
const KEY = 'minhas-compras-v1';
const vazio = () => ({ atual: [], compras: [], codigos: {}, lista: [], orcamento: null });
let db = carregar();

function carregar() {
  try {
    return Object.assign(vazio(), JSON.parse(localStorage.getItem(KEY)) || {});
  } catch {
    return vazio();
  }
}
function salvar() {
  localStorage.setItem(KEY, JSON.stringify(db));
}

/* ---------- Utilidades ---------- */
const $ = (id) => document.getElementById(id);
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (s) => parseFloat(String(s).trim().replace(/\./g, (m, i, t) => (t.includes(',') ? '' : m)).replace(',', '.'));
const fmtQtd = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtData = (iso) => { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fmtMes = (k) => { const [a, m] = k.split('-'); return `${MESES[+m - 1]}/${a}`; };
const fmtNum = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const arred = (n) => Math.round(n * 1000) / 1000;
const totalItens = (itens) => itens.reduce((s, i) => s + i.qtd * i.preco, 0);

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ---------- Abas ---------- */
document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
  if (b.dataset.tab === 'lista') renderLista();
  if (b.dataset.tab === 'historico') renderHistorico();
  if (b.dataset.tab === 'resumo') renderResumo();
  window.scrollTo(0, 0);
}));

/* ---------- Compra atual ---------- */
let editando = null;      // id do item em edição
let codigoPendente = null; // código de barras lido para o produto no formulário
let listaPendente = null;  // item da lista de compras que está no formulário

function renderAtual() {
  const ul = $('lista-itens');
  ul.innerHTML = db.atual.map((i) => `
    <li class="item" data-id="${i.id}">
      <div class="linha">
        <div class="nome">${esc(i.nome)}</div>
        <div class="valor">${brl(i.qtd * i.preco)}</div>
      </div>
      <div class="linha">
        <div class="passo">
          <button class="mini" data-acao="menos" aria-label="Diminuir quantidade de ${esc(i.nome)}"${i.qtd <= 1 ? ' disabled' : ''}>−</button>
          <b>${fmtQtd(i.qtd)}</b>
          <button class="mini" data-acao="mais" aria-label="Aumentar quantidade de ${esc(i.nome)}">+</button>
        </div>
        <span class="sub">× ${brl(i.preco)}</span>
        <span class="espaco"></span>
        <button class="mini" data-acao="editar" aria-label="Editar ${esc(i.nome)}"><svg class="ic" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="mini del" data-acao="remover" aria-label="Remover ${esc(i.nome)}"><svg class="ic" aria-hidden="true"><use href="#i-x"/></svg></button>
      </div>
    </li>`).join('');
  const n = db.atual.length;
  $('vazio').hidden = n > 0;
  $('total-qtd').textContent = n === 1 ? '1 item' : `${n} itens`;
  $('total-valor').textContent = brl(totalItens(db.atual));
  $('btn-finalizar').disabled = n === 0;
  renderOrcamento();
  renderFalta();
  renderNomes();
}

function renderNomes() {
  const nomes = new Map();
  db.compras.forEach((c) => c.itens.forEach((i) => nomes.set(norm(i.nome), i.nome)));
  $('lista-nomes').innerHTML = [...nomes.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((n) => `<option value="${esc(n)}">`).join('');
  const lojas = new Set(db.compras.map((c) => c.loja).filter(Boolean));
  $('lista-lojas').innerHTML = [...lojas].map((l) => `<option value="${esc(l)}">`).join('');
}

/* Últimas 3 compras do produto (por nome ou código de barras) */
function ultimosPrecos(nome, codigo) {
  const alvo = norm(nome);
  const achados = [];
  const compras = [...db.compras].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.criado - a.criado));
  for (const c of compras) {
    const it = c.itens.find((i) => norm(i.nome) === alvo || (codigo && i.codigo === codigo));
    if (it) achados.push({ preco: it.preco, data: c.data, loja: c.loja });
    if (achados.length === 3) break;
  }
  return achados;
}

function renderUltimos() {
  const nome = $('f-nome').value;
  const box = $('ultimos');
  const lista = nome.trim() ? ultimosPrecos(nome, codigoPendente) : [];
  box.hidden = !lista.length;
  if (lista.length) {
    box.innerHTML = `<b>Quanto paguei nas últimas ${lista.length === 1 ? 'compra' : lista.length + ' compras'}:</b><ul>` +
      lista.map((u) => `<li><span class="preco">${brl(u.preco)}</span><span>${fmtData(u.data)}${u.loja ? ' · ' + esc(u.loja) : ''}</span></li>`).join('') +
      '</ul>';
  }
  renderCompara(lista);
}

/* Aviso: preço digitado × preço da última compra */
function renderCompara(lista) {
  const box = $('compara');
  const preco = num($('f-preco').value);
  if (!lista) lista = $('f-nome').value.trim() ? ultimosPrecos($('f-nome').value, codigoPendente) : [];
  if (!lista.length || !(preco > 0)) { box.hidden = true; return; }
  const dif = Math.round((preco - lista[0].preco) * 100) / 100;
  box.hidden = false;
  box.className = 'compara ' + (dif > 0 ? 'caro' : dif < 0 ? 'barato' : 'igual');
  box.textContent = dif > 0 ? `↑ ${brl(dif)} mais caro que da última vez`
    : dif < 0 ? `↓ ${brl(-dif)} mais barato que da última vez`
    : '= Mesmo preço da última vez';
}

$('f-nome').addEventListener('input', () => { renderUltimos(); });

/* Preço: digita só os números e a vírgula entra sozinha (2490 → 24,90) */
function mascaraPreco(e) {
  const el = e.target;
  const digitos = el.value.replace(/\D/g, '').slice(0, 9);
  const centavos = parseInt(digitos || '0', 10);
  const apagando = (e.inputType || '').startsWith('delete');
  if (!digitos || (centavos === 0 && apagando)) { el.value = ''; return; }
  el.value = fmtNum(centavos / 100);
  el.setSelectionRange(el.value.length, el.value.length);
}
$('f-preco').addEventListener('input', (e) => { mascaraPreco(e); renderCompara(); });

function limparForm() {
  editando = null;
  codigoPendente = null;
  listaPendente = null;
  $('form-item').reset();
  $('f-qtd').value = '1';
  $('btn-add').textContent = 'Adicionar';
  $('btn-cancel-edit').hidden = true;
  renderUltimos();
}

$('form-item').addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = $('f-nome').value.trim().replace(/\s+/g, ' ');
  const qtd = num($('f-qtd').value);
  const preco = num($('f-preco').value);
  if (!nome) return;
  if (!(qtd > 0)) { toast('Quantidade inválida'); $('f-qtd').focus(); return; }
  if (!(preco >= 0)) { toast('Valor inválido'); $('f-preco').focus(); return; }

  if (editando) {
    const it = db.atual.find((i) => i.id === editando);
    if (it) Object.assign(it, { nome, qtd, preco, codigo: codigoPendente || it.codigo });
  } else {
    // se o produto está na lista de compras, marca como pego
    const daLista = db.lista.find((l) => l.id === listaPendente) || db.lista.find((l) => !l.feito && norm(l.nome) === norm(nome));
    if (daLista) daLista.feito = true;
    db.atual.push({ id: uid(), nome, qtd, preco, codigo: codigoPendente || undefined, listaId: daLista ? daLista.id : undefined });
  }
  if (codigoPendente) db.codigos[codigoPendente] = nome; // lembra o nome para a próxima leitura
  salvar();
  limparForm();
  renderAtual();
  $('f-nome').focus();
});

$('btn-cancel-edit').addEventListener('click', limparForm);

$('lista-itens').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-acao]');
  if (!btn) return;
  const id = btn.closest('li').dataset.id;
  const it = db.atual.find((i) => i.id === id);
  if (!it) return;
  const acao = btn.dataset.acao;
  if (acao === 'mais' || acao === 'menos') {
    const nova = arred(it.qtd + (acao === 'mais' ? 1 : -1));
    if (nova <= 0) return;
    it.qtd = nova;
    if (editando === id) $('f-qtd').value = fmtQtd(nova).replace(/\./g, '');
    salvar();
    renderAtual();
  } else if (acao === 'remover') {
    db.atual = db.atual.filter((i) => i.id !== id);
    const daLista = db.lista.find((l) => l.id === it.listaId);
    if (daLista) daLista.feito = false; // volta para "falta pegar"
    if (editando === id) limparForm();
    salvar();
    renderAtual();
  } else {
    editando = id;
    codigoPendente = it.codigo || null;
    $('f-nome').value = it.nome;
    $('f-qtd').value = fmtQtd(it.qtd).replace(/\./g, '');
    $('f-preco').value = fmtNum(it.preco);
    $('btn-add').textContent = 'Salvar alteração';
    $('btn-cancel-edit').hidden = false;
    renderUltimos();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

/* ---------- Orçamento da compra ---------- */
function renderOrcamento() {
  const o = db.orcamento;
  const total = totalItens(db.atual);
  const barra = $('orc-barra');
  $('btn-orc').textContent = o ? 'Alterar' : 'Definir';
  barra.hidden = !o;
  if (!o) { $('orc-txt').innerHTML = '<span class="sub">Sem orçamento para esta compra</span>'; return; }
  const resto = Math.round((o - total) * 100) / 100;
  const pct = total / o;
  barra.className = 'orc-barra' + (resto < 0 ? ' estourou' : pct >= 0.85 ? ' perto' : '');
  $('orc-fill').style.width = Math.min(100, pct * 100) + '%';
  $('orc-txt').innerHTML = `<span class="sub">Orçamento ${brl(o)}</span><br>` +
    (resto < 0 ? `<b class="estourou">Passou ${brl(-resto)}</b>` : `<b>Restam ${brl(resto)}</b>`);
}
$('btn-orc').addEventListener('click', () => {
  $('orc-valor').value = db.orcamento ? fmtNum(db.orcamento) : '';
  $('orc-remover').hidden = !db.orcamento;
  $('dlg-orc').showModal();
});
$('orc-valor').addEventListener('input', mascaraPreco);
$('orc-cancelar').addEventListener('click', () => $('dlg-orc').close());
$('orc-remover').addEventListener('click', () => { db.orcamento = null; salvar(); renderOrcamento(); $('dlg-orc').close(); });
$('form-orc').addEventListener('submit', () => {
  const v = num($('orc-valor').value);
  db.orcamento = v > 0 ? v : null;
  salvar();
  renderOrcamento();
});

/* ---------- Lista de compras ---------- */
function renderLista() {
  const ordenada = [...db.lista].sort((a, b) => a.feito - b.feito);
  $('lista-planejada').innerHTML = ordenada.map((l) => `
    <li class="item-lista${l.feito ? ' feito' : ''}" data-id="${l.id}">
      <button class="check" data-acao="marcar" aria-label="${l.feito ? 'Desmarcar' : 'Marcar'} ${esc(l.nome)}">${l.feito ? '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>' : ''}</button>
      <span class="nome grow">${esc(l.nome)}</span>
      <span class="sub">${fmtQtd(l.qtd)}</span>
      <button class="mini del" data-acao="remover" aria-label="Remover ${esc(l.nome)}"><svg class="ic" aria-hidden="true"><use href="#i-x"/></svg></button>
    </li>`).join('');
  $('lista-vazia').hidden = db.lista.length > 0;
  $('btn-limpar-lista').hidden = db.lista.length === 0;
}

function renderFalta() {
  const falta = db.lista.filter((l) => !l.feito);
  $('falta').hidden = falta.length === 0;
  $('falta-tit').textContent = `Falta pegar (${falta.length})`;
  $('falta-chips').innerHTML = falta.map((l) =>
    `<button type="button" class="chip" data-id="${l.id}">${esc(l.nome)}${l.qtd !== 1 ? ' · ' + fmtQtd(l.qtd) : ''}</button>`).join('');
}

$('form-lista').addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = $('l-nome').value.trim().replace(/\s+/g, ' ');
  const qtd = num($('l-qtd').value);
  if (!nome) return;
  if (!(qtd > 0)) { toast('Quantidade inválida'); return; }
  const igual = db.lista.find((l) => !l.feito && norm(l.nome) === norm(nome));
  if (igual) igual.qtd = arred(igual.qtd + qtd);
  else db.lista.push({ id: uid(), nome, qtd, feito: false });
  salvar();
  $('form-lista').reset();
  $('l-qtd').value = '1';
  renderLista();
  renderFalta();
  $('l-nome').focus();
});

$('lista-planejada').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-acao]');
  if (!btn) return;
  const id = btn.closest('li').dataset.id;
  const l = db.lista.find((x) => x.id === id);
  if (!l) return;
  if (btn.dataset.acao === 'marcar') l.feito = !l.feito;
  else db.lista = db.lista.filter((x) => x.id !== id);
  salvar();
  renderLista();
  renderFalta();
});

$('btn-limpar-lista').addEventListener('click', () => {
  if (!confirm('Apagar todos os itens da lista de compras?')) return;
  db.lista = [];
  salvar();
  renderLista();
  renderFalta();
});

/* Toque em um item de "Falta pegar": leva para o formulário, só falta o preço */
$('falta-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const l = db.lista.find((x) => x.id === chip.dataset.id);
  if (!l) return;
  limparForm();
  listaPendente = l.id;
  $('f-nome').value = l.nome;
  $('f-qtd').value = fmtQtd(l.qtd).replace(/\./g, '');
  renderUltimos();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('f-preco').focus();
});

/* ---------- Finalizar ---------- */
$('btn-finalizar').addEventListener('click', () => {
  $('fim-total').textContent = brl(totalItens(db.atual));
  $('fim-data').value = hojeISO();
  $('fim-loja').value = '';
  $('dlg-fim').showModal();
});
$('fim-cancelar').addEventListener('click', () => $('dlg-fim').close());
$('form-fim').addEventListener('submit', () => {
  if (!db.atual.length) return;
  db.compras.push({
    id: uid(),
    criado: Date.now(),
    data: $('fim-data').value || hojeISO(),
    loja: $('fim-loja').value.trim(),
    itens: db.atual.map(({ nome, qtd, preco, codigo }) => ({ nome, qtd, preco, codigo })),
    total: totalItens(db.atual),
  });
  db.atual = [];
  db.lista = db.lista.filter((l) => !l.feito); // o que não foi pego fica para a próxima
  salvar();
  limparForm();
  renderAtual();
  toast('Compra salva no histórico ✔');
});

/* ---------- Histórico ---------- */
function comprasOrdenadas() {
  return [...db.compras].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.criado - a.criado));
}

function renderHistorico() {
  const lista = comprasOrdenadas();
  $('hist-vazio').hidden = lista.length > 0;
  $('lista-compras').innerHTML = lista.map((c) => `
    <li><details data-id="${c.id}">
      <summary>
        <span><b>${fmtData(c.data)}</b>${c.loja ? ' · ' + esc(c.loja) : ''}<br>
          <span class="sub">${c.itens.length} ${c.itens.length === 1 ? 'item' : 'itens'}</span></span>
        <b>${brl(c.total)}</b>
      </summary>
      <table>${c.itens.map((i) => `<tr><td>${esc(i.nome)}<br><span class="sub">${fmtQtd(i.qtd)} × ${brl(i.preco)}</span></td><td>${brl(i.qtd * i.preco)}</td></tr>`).join('')}</table>
      <div class="acoes"><button class="link-del" data-del="${c.id}">Excluir compra</button></div>
    </details></li>`).join('');
}

$('lista-compras').addEventListener('click', (e) => {
  const id = e.target.dataset && e.target.dataset.del;
  if (!id) return;
  const c = db.compras.find((x) => x.id === id);
  if (c && confirm(`Excluir a compra de ${fmtData(c.data)} (${brl(c.total)})?`)) {
    db.compras = db.compras.filter((x) => x.id !== id);
    salvar();
    renderHistorico();
    renderNomes();
  }
});

/* Backup */
$('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `minhas-compras-${hojeISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('btn-import').addEventListener('click', () => $('file-import').click());
$('file-import').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const novo = JSON.parse(await f.text());
    if (!Array.isArray(novo.compras)) throw new Error('formato');
    if (!confirm(`Substituir os dados deste aparelho pelo backup (${novo.compras.length} compras)?`)) return;
    db = Object.assign(vazio(), novo);
    salvar();
    renderAtual();
    renderLista();
    renderHistorico();
    toast('Backup importado ✔');
  } catch {
    toast('Arquivo de backup inválido');
  }
});

/* ---------- Resumo ---------- */
function renderResumo() {
  const porMes = {};
  db.compras.forEach((c) => {
    const k = c.data.slice(0, 7);
    (porMes[k] = porMes[k] || []).push(c);
  });
  const atual = hojeISO().slice(0, 7);
  if (!porMes[atual]) porMes[atual] = [];
  const chaves = Object.keys(porMes).sort().reverse();

  const sel = $('sel-mes');
  const escolhido = chaves.includes(sel.value) ? sel.value : atual;
  sel.innerHTML = chaves.map((k) => `<option value="${k}">${fmtMes(k)}</option>`).join('');
  sel.value = escolhido;

  const compras = porMes[escolhido];
  const total = compras.reduce((s, c) => s + c.total, 0);
  $('res-total').textContent = brl(total);
  $('res-compras').textContent = compras.length;
  $('res-media').textContent = brl(compras.length ? total / compras.length : 0);
  $('res-itens').textContent = compras.reduce((s, c) => s + c.itens.length, 0);

  // últimos 6 meses com registro
  const ult = chaves.slice(0, 6);
  const totais = ult.map((k) => porMes[k].reduce((s, c) => s + c.total, 0));
  const max = Math.max(...totais, 1);
  $('res-meses').innerHTML = ult.map((k, i) => `
    <div class="barra"><span>${fmtMes(k)}</span><i style="width:${(totais[i] / max) * 100}%"></i><span>${brl(totais[i])}</span></div>`).join('');

  // produtos em que mais gastou no mês
  const prod = new Map();
  compras.forEach((c) => c.itens.forEach((i) => {
    const k = norm(i.nome);
    const p = prod.get(k) || { nome: i.nome, valor: 0 };
    p.valor += i.qtd * i.preco;
    prod.set(k, p);
  }));
  const top = [...prod.values()].sort((a, b) => b.valor - a.valor).slice(0, 5);
  $('res-top').innerHTML = top.length
    ? top.map((p) => `<li><div><span>${esc(p.nome)}</span><b>${brl(p.valor)}</b></div></li>`).join('')
    : '<p class="muted">Sem compras neste mês.</p>';
}
$('sel-mes').addEventListener('change', renderResumo);

/* ---------- Leitor de código de barras ---------- */
const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
let stream = null;
let zxingReader = null;
let scanAtivo = false;

function carregarScript(src) {
  return new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = erro;
    document.head.appendChild(s);
  });
}

async function abrirScanner() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('Câmera indisponível. Abra o app por https.');
    return;
  }
  const dlg = $('dlg-scan');
  const video = $('video');
  $('scan-msg').textContent = 'Aponte a câmera para o código de barras';
  dlg.showModal();
  scanAtivo = true;
  const cfg = { video: { facingMode: { ideal: 'environment' } }, audio: false };

  try {
    let nativo = false;
    if ('BarcodeDetector' in window) {
      const sup = await window.BarcodeDetector.getSupportedFormats().catch(() => []);
      nativo = FORMATOS.some((f) => sup.includes(f));
    }
    if (nativo) {
      stream = await navigator.mediaDevices.getUserMedia(cfg);
      if (!scanAtivo) return pararScanner();
      video.srcObject = stream;
      await video.play();
      const det = new window.BarcodeDetector({ formats: FORMATOS });
      const loop = async () => {
        if (!scanAtivo) return;
        try {
          const r = await det.detect(video);
          if (r.length) return codigoLido(r[0].rawValue);
        } catch { /* quadro ainda não pronto */ }
        setTimeout(loop, 200);
      };
      loop();
    } else {
      if (!window.ZXing) await carregarScript('vendor/zxing.min.js');
      if (!scanAtivo) return;
      const Z = window.ZXing;
      const hints = new Map([[Z.DecodeHintType.POSSIBLE_FORMATS,
        [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]]]);
      zxingReader = new Z.BrowserMultiFormatReader(hints);
      await zxingReader.decodeFromConstraints(cfg, video, (res) => {
        if (res && scanAtivo) codigoLido(res.getText());
      });
    }
  } catch (err) {
    pararScanner();
    toast(err && err.name === 'NotAllowedError' ? 'Permita o acesso à câmera para ler o código.' : 'Não foi possível abrir a câmera.');
  }
}

function pararScanner() {
  scanAtivo = false;
  if (zxingReader) { try { zxingReader.reset(); } catch { /* já parado */ } zxingReader = null; }
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  $('video').srcObject = null;
  if ($('dlg-scan').open) $('dlg-scan').close();
}

async function buscarNome(codigo) {
  if (db.codigos[codigo]) return db.codigos[codigo];
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=product_name,product_name_pt,brands,quantity`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    const p = (await r.json()).product;
    if (!p) return null;
    const base = (p.product_name_pt || p.product_name || '').trim();
    if (!base) return null;
    const marca = (p.brands || '').split(',')[0].trim();
    const partes = [base];
    if (marca && !norm(base).includes(norm(marca))) partes.push(marca);
    if (p.quantity && !norm(base).includes(norm(p.quantity))) partes.push(p.quantity.trim());
    return partes.join(' ');
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function codigoLido(codigo) {
  if (!scanAtivo) return;
  scanAtivo = false;
  if (navigator.vibrate) navigator.vibrate(60);
  $('scan-msg').textContent = `Código ${codigo} — buscando produto…`;
  const nome = await buscarNome(codigo);
  pararScanner();
  codigoPendente = codigo;
  if (nome) {
    $('f-nome').value = nome;
    toast('Produto reconhecido ✔');
    $('f-preco').focus();
  } else {
    $('f-nome').value = '';
    toast('Produto não encontrado. Digite o nome — na próxima leitura eu lembro.');
    $('f-nome').focus();
  }
  renderUltimos();
}

$('btn-scan').addEventListener('click', abrirScanner);
$('btn-scan-fechar').addEventListener('click', pararScanner);
$('dlg-scan').addEventListener('close', pararScanner);

/* ---------- Início ---------- */
renderAtual();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
