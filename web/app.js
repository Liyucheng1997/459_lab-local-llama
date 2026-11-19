import { renderMarkdown, esc } from './markdown.js';

// ---------------- 图标（lucide，描边 1.75） ----------------
const P = {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  redo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  sliders: '<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><path d="M14 2v4"/><path d="M8 10v4"/><path d="M16 18v4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  panel: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
};
const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24">${P[n]}</svg>`;

// ---------------- 小工具 ----------------
const $ = (id) => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function toast(text, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type ? 'toast-' + type : ''}`;
  el.textContent = text;
  $('toastHost').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 1800);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  toast('已复制', 'success');
}

// ---------------- 对话存储（IndexedDB，图片也放得下） ----------------
const db = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('gemma-local-chat', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('convs', { keyPath: 'id' });
      r.onsuccess = () => res((this._db = r.result));
      r.onerror = () => rej(r.error);
    });
  },
  async all() {
    const d = await this.open();
    return new Promise((res, rej) => {
      const q = d.transaction('convs').objectStore('convs').getAll();
      q.onsuccess = () => res(q.result || []);
      q.onerror = () => rej(q.error);
    });
  },
  async put(c) {
    const d = await this.open();
    return new Promise((res, rej) => {
      const t = d.transaction('convs', 'readwrite');
      t.objectStore('convs').put(c);
      t.oncomplete = res; t.onerror = () => rej(t.error);
    });
  },
  async del(id) {
    const d = await this.open();
    return new Promise((res, rej) => {
      const t = d.transaction('convs', 'readwrite');
      t.objectStore('convs').delete(id);
      t.oncomplete = res; t.onerror = () => rej(t.error);
    });
  },
};
const save = (c) => db.put(c).catch(() => toast('保存对话失败', 'error'));

// ---------------- 设置 ----------------
const DEFAULTS = { system: '', temperature: 1.0, top_p: 0.95, top_k: 64, max_tokens: 4096, thinking: true };
const state = {
  settings: { ...DEFAULTS, ...store.get('settings', {}) },
  convs: [],
  cur: null, // 当前对话对象
  pendingImages: [],
  generating: false,
  controller: null,
  nCtx: null,
  vision: false,
};
const saveSettings = () => store.set('settings', state.settings);

// ---------------- 侧栏 ----------------
function groupOf(ts) {
  const d = new Date(ts), now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (day(now) - day(d)) / 86400000;
  if (diff < 1) return '今天';
  if (diff < 2) return '昨天';
  if (diff < 7) return '最近 7 天';
  return '更早';
}

function renderSidebar() {
  const list = $('convList');
  const convs = [...state.convs].sort((a, b) => b.updatedAt - a.updatedAt);
  if (!convs.length) { list.innerHTML = '<div class="conv-empty">还没有对话</div>'; return; }
  let html = '', last = '';
  for (const c of convs) {
    const g = groupOf(c.updatedAt);
    if (g !== last) { html += `<div class="conv-group">${g}</div>`; last = g; }
    html += `<div class="conv ${state.cur && state.cur.id === c.id ? 'active' : ''}" data-id="${c.id}">
      <span class="conv-title">${esc(c.title || '新对话')}</span>
      <span class="conv-actions">
        <button class="icon-btn" data-act="rename" title="重命名">${icon('pencil')}</button>
        <button class="icon-btn" data-act="delete" title="删除">${icon('trash')}</button>
      </span></div>`;
  }
  list.innerHTML = html;
}

$('convList').addEventListener('click', async (e) => {
  const row = e.target.closest('.conv');
  if (!row) return;
  const c = state.convs.find((x) => x.id === row.dataset.id);
  if (!c) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'delete') {
    const ok = await confirmDialog({ title: '删除这个对话？', msg: `“${c.title || '新对话'}”会被永久删除，无法恢复。`, ok: '删除', danger: true, ico: 'trash' });
    if (!ok) return;
    if (state.generating && state.cur === c) stopGenerating();
    state.convs = state.convs.filter((x) => x !== c);
    await db.del(c.id).catch(() => {});
    if (state.cur === c) newChat(); else renderSidebar();
    return;
  }
  if (act === 'rename') {
    const name = await confirmDialog({ title: '重命名对话', ok: '保存', input: c.title || '', ico: 'pencil' });
    if (name == null) return;
    c.title = name.trim() || c.title;
    await save(c);
    renderSidebar(); renderTitle();
    return;
  }
  if (state.cur !== c) { openConv(c); closeSidebar(); }
});

function openConv(c) {
  if (state.generating) stopGenerating();
  state.cur = c;
  renderSidebar(); renderTitle(); renderThread();
  scrollToBottom(true);
  $('input').focus();
}

function newChat() {
  if (state.generating) stopGenerating();
  state.cur = null;
  renderSidebar(); renderTitle(); renderThread();
  closeSidebar();
  $('input').focus();
}

const renderTitle = () => { $('convTitle').textContent = state.cur?.title || '新对话'; };
const closeSidebar = () => $('sidebar').classList.remove('open');

// ---------------- 消息区 ----------------
const SUGGESTS = [
  ['写个故事开头', '一个雨夜，侦探收到一封没有署名的信。帮我写个悬疑故事的开头，三百字左右。'],
  ['讲清一个概念', '用通俗的例子给我讲讲什么是“量子纠缠”，别用公式。'],
  ['改写一段文字', '把下面这段话改得更口语、更自然：\n\n'],
  ['看图说话', '__image__'],
];

function renderThread() {
  const t = $('thread');
  const msgs = state.cur?.messages || [];
  if (!msgs.length) {
    t.innerHTML = `<div class="welcome">
      <div class="welcome-hi">你好 👋</div>
      <div class="welcome-title">今天想聊点<em>什么</em>？</div>
      <div class="welcome-sub">模型完全跑在你的电脑上，断网也能用，对话不会离开这台机器。</div>
      <div class="suggests">${SUGGESTS.map(([a, b], i) =>
        `<button class="suggest" data-i="${i}"><b>${a}</b><span>${b === '__image__' ? '上传一张图片，让它描述或分析' : esc(b.split('\n')[0])}</span></button>`).join('')}
      </div></div>`;
    return;
  }
  t.innerHTML = '';
  msgs.forEach((m, i) => t.appendChild(m.role === 'user' ? userEl(m, i) : assistantEl(m, i)));
}

$('thread').addEventListener('click', (e) => {
  const sg = e.target.closest('.suggest');
  if (sg) {
    const text = SUGGESTS[+sg.dataset.i][1];
    if (text === '__image__') { $('fileInput').click(); return; }
    setInput(text);
    return;
  }
  const codeBtn = e.target.closest('[data-copy-code]');
  if (codeBtn) { copyText(codeBtn.closest('.code').querySelector('code').textContent); return; }
  const img = e.target.closest('.msg-images img');
  if (img) { openLightbox(img.src); return; }
  const btn = e.target.closest('[data-act]');
  if (!btn || !state.cur) return;
  const idx = +btn.closest('.msg').dataset.i;
  const m = state.cur.messages[idx];
  const act = btn.dataset.act;
  if (act === 'copy') copyText(m.content || '');
  else if (act === 'regen') regenerate(idx);
  else if (act === 'edit') editFrom(idx);
  else if (act === 'think') btn.closest('.think').classList.toggle('open');
});

function userEl(m, i) {
  const el = document.createElement('div');
  el.className = 'msg user';
  el.dataset.i = i;
  el.innerHTML = `
    ${m.images?.length ? `<div class="msg-images">${m.images.map((s) => `<img src="${s}" alt="">`).join('')}</div>` : ''}
    ${m.content ? `<div class="bubble">${esc(m.content)}</div>` : ''}
    <div class="msg-actions">
      <button class="icon-btn" data-act="copy" title="复制">${icon('copy')}</button>
      <button class="icon-btn" data-act="edit" title="编辑并重新发送">${icon('pencil')}</button>
    </div>`;
  return el;
}

function assistantEl(m, i) {
  const el = document.createElement('div');
  el.className = 'msg assistant';
  el.dataset.i = i;
  el.innerHTML = `<div class="avatar">G</div>
    <div class="a-body">
      <div class="think" hidden><button class="think-head" data-act="think">${icon('chev', 'chev')}<span class="think-label"></span></button><div class="think-body"></div></div>
      <div class="md"></div>
      <div class="a-foot">
        <div class="msg-actions">
          <button class="icon-btn" data-act="copy" title="复制">${icon('copy')}</button>
          <button class="icon-btn" data-act="regen" title="重新生成">${icon('redo')}</button>
        </div>
        <span class="stats"></span>
      </div>
    </div>`;
  updateAssistant(el, m);
  return el;
}

function fmtSec(ms) { return ms < 1000 ? '不到 1 秒' : `${(ms / 1000).toFixed(1)} 秒`; }

function updateAssistant(el, m) {
  const think = el.querySelector('.think');
  if (m.reasoning) {
    think.hidden = false;
    const label = think.querySelector('.think-label');
    const live = m.phase === 'thinking';
    label.innerHTML = live ? '正在思考<span class="live-dot"></span>' : `思考了 ${fmtSec(m.thinkMs || 0)}`;
    const body = think.querySelector('.think-body');
    const stick = body.scrollHeight - body.scrollTop - body.clientHeight < 30;
    body.textContent = m.reasoning;
    if (stick) body.scrollTop = body.scrollHeight;
    if (!think.dataset.touched) think.classList.toggle('open', live);
  } else think.hidden = true;

  const md = el.querySelector('.md');
  if (m.content) md.innerHTML = renderMarkdown(m.content);
  else if (m.phase === 'waiting') md.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
  else md.innerHTML = '';
  if (m.error) md.insertAdjacentHTML('beforeend', `<div class="err">${esc(m.error)}</div>`);

  el.querySelector('.a-foot').style.visibility = m.phase ? 'hidden' : '';
  const s = m.stats;
  el.querySelector('.stats').textContent = s ? `${s.tokens} tokens · ${s.speed.toFixed(1)} tok/s${m.stopped ? ' · 已停止' : ''}` : (m.stopped ? '已停止' : '');
}

// 用户手动展开 / 收起后，不再自动改动
$('thread').addEventListener('click', (e) => {
  const h = e.target.closest('.think-head');
  if (h) h.closest('.think').dataset.touched = '1';
}, true);

function nearBottom() { const s = $('scroll'); return s.scrollHeight - s.scrollTop - s.clientHeight < 80; }
function scrollToBottom(force) { const s = $('scroll'); if (force || nearBottom()) s.scrollTop = s.scrollHeight; }

// ---------------- 发送与流式接收 ----------------
function toApiMessages(msgs) {
  const out = [];
  if (state.settings.system.trim()) out.push({ role: 'system', content: state.settings.system.trim() });
  for (const m of msgs) {
    if (m.role === 'assistant') {
      if (m.content) out.push({ role: 'assistant', content: m.content });
      continue;
    }
    if (m.images?.length) {
      const parts = m.images.map((url) => ({ type: 'image_url', image_url: { url } }));
      if (m.content) parts.push({ type: 'text', text: m.content });
      out.push({ role: 'user', content: parts });
    } else out.push({ role: 'user', content: m.content });
  }
  return out;
}

async function send() {
  if (state.generating) { stopGenerating(); return; }
  const text = $('input').value.trim();
  const images = state.pendingImages.slice();
  if (!text && !images.length) return;

  if (!state.cur) {
    state.cur = { id: uid(), title: '', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
    state.convs.push(state.cur);
  }
  const c = state.cur;
  if (!c.title) c.title = (text || '图片对话').replace(/\s+/g, ' ').slice(0, 28);
  c.messages.push({ role: 'user', content: text, images });
  setInput('');
  state.pendingImages = [];
  renderAttachments();
  renderTitle();
  await generate(c);
}

async function generate(c) {
  const msg = { role: 'assistant', content: '', reasoning: '', phase: 'waiting' };
  c.messages.push(msg);
  c.updatedAt = Date.now();
  renderSidebar();
  renderThread();
  scrollToBottom(true);
  const el = $('thread').lastElementChild;

  state.generating = true;
  state.controller = new AbortController();
  setBusy(true);

  const s = state.settings;
  const body = {
    messages: toApiMessages(c.messages.slice(0, -1)),
    stream: true,
    temperature: +s.temperature,
    top_p: +s.top_p,
    top_k: +s.top_k,
    max_tokens: +s.max_tokens,
    chat_template_kwargs: { enable_thinking: !!s.thinking },
  };

  let frame = 0, thinkStart = 0, timings = null;
  const paint = () => {
    frame = 0;
    if (state.cur === c && el.isConnected) { updateAssistant(el, msg); scrollToBottom(); }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };

  try {
    const res = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: state.controller.signal,
    });
    if (!res.ok) throw new Error(readError(await res.text(), res.status));
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let j;
        try { j = JSON.parse(data); } catch { continue; }
        if (j.error) throw new Error(readError(JSON.stringify(j)));
        const d = j.choices?.[0]?.delta || {};
        if (d.reasoning_content) {
          if (!thinkStart) thinkStart = performance.now();
          msg.reasoning += d.reasoning_content;
          msg.phase = 'thinking';
          msg.thinkMs = performance.now() - thinkStart;
        }
        if (d.content) {
          if (msg.phase === 'thinking') msg.thinkMs = performance.now() - thinkStart;
          msg.content += d.content;
          msg.phase = 'answering';
        }
        if (j.timings) timings = j.timings;
        schedule();
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') msg.stopped = true;
    else msg.error = err.message || '生成失败';
  } finally {
    if (frame) cancelAnimationFrame(frame);
    if (timings) msg.stats = { tokens: timings.predicted_n, speed: timings.predicted_per_second || 0 };
    delete msg.phase;
    if (!msg.content && !msg.error && !msg.stopped) msg.error = '模型没有返回内容';
    // 回答开始后自动收起思考过程（用户没手动点过的话）
    const think = el.querySelector('.think');
    if (think && !think.dataset.touched) think.classList.remove('open');
    if (el.isConnected) updateAssistant(el, msg);
    c.updatedAt = Date.now();
    state.generating = false;
    state.controller = null;
    setBusy(false);
    if (state.convs.includes(c)) await save(c); // 生成途中被删除的对话不再写回
    renderSidebar();
  }
}

function readError(text, status) {
  try {
    const j = JSON.parse(text);
    const m = j.error?.message || j.message || text;
    if (/context|exceed|too long/i.test(m)) return '对话太长，超出了上下文长度。请新开一个对话，或在 start-chat.bat 里把 CTX 调大。';
    return m;
  } catch {
    return status ? `请求失败（${status}）` : text || '请求失败';
  }
}

function stopGenerating() { state.controller?.abort(); }

async function regenerate(idx) {
  if (state.generating) return;
  const c = state.cur;
  // 找到这条回答之前的最后一条用户消息，截断之后重新生成
  c.messages = c.messages.slice(0, idx);
  while (c.messages.length && c.messages[c.messages.length - 1].role !== 'user') c.messages.pop();
  if (!c.messages.length) return;
  await generate(c);
}

function editFrom(idx) {
  if (state.generating) return;
  const c = state.cur;
  const m = c.messages[idx];
  c.messages = c.messages.slice(0, idx);
  setInput(m.content || '');
  state.pendingImages = (m.images || []).slice();
  renderAttachments();
  renderThread();
  save(c);
}

function setBusy(b) {
  const btn = $('sendBtn');
  btn.classList.toggle('stop', b);
  btn.innerHTML = icon(b ? 'stop' : 'up');
  btn.title = b ? '停止生成' : '发送';
  updateSendState();
  setStatus(b ? 'busy' : (state.online ? 'ok' : 'bad'));
}

// ---------------- 输入区 ----------------
const input = $('input');
function autosize() {
  input.style.height = '';
  if (input.value) input.style.height = Math.min(input.scrollHeight, 240) + 'px';
}
window.addEventListener('resize', autosize);
function setInput(v) { input.value = v; autosize(); updateSendState(); input.focus(); input.setSelectionRange(v.length, v.length); }
function updateSendState() {
  $('sendBtn').disabled = !state.generating && !input.value.trim() && !state.pendingImages.length;
  const n = input.value.length;
  $('hint').textContent = n > 200 ? `${n} 字` : '';
}
input.addEventListener('input', () => { autosize(); updateSendState(); });
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
    e.preventDefault();
    if (!state.generating) send();
  }
});
$('sendBtn').addEventListener('click', send);

// 图片：选择、粘贴、拖放
async function addFiles(files) {
  const imgs = [...files].filter((f) => f.type.startsWith('image/'));
  if (!imgs.length) return;
  if (!state.vision) toast('当前服务没有加载视觉模块，图片可能无法识别', 'error');
  for (const f of imgs) {
    try { state.pendingImages.push(await shrinkImage(f)); } catch { toast(`无法读取 ${f.name}`, 'error'); }
  }
  renderAttachments();
  input.focus();
}

function shrinkImage(file, max = 1536) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * k), h = Math.round(img.height * k);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(cv.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}

function renderAttachments() {
  $('attachments').innerHTML = state.pendingImages
    .map((s, i) => `<div class="att"><img src="${s}" alt=""><button data-i="${i}" title="移除">${icon('x')}</button></div>`)
    .join('');
  updateSendState();
}
$('attachments').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-i]');
  if (b) { state.pendingImages.splice(+b.dataset.i, 1); renderAttachments(); return; }
  const img = e.target.closest('img');
  if (img) openLightbox(img.src);
});
$('attachBtn').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
input.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])];
  if (files.some((f) => f.type.startsWith('image/'))) { e.preventDefault(); addFiles(files); }
});
const composer = $('composer');
['dragenter', 'dragover'].forEach((t) => composer.addEventListener(t, (e) => { e.preventDefault(); composer.classList.add('drag'); }));
['dragleave', 'drop'].forEach((t) => composer.addEventListener(t, () => composer.classList.remove('drag')));
composer.addEventListener('drop', (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });

function openLightbox(src) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `<img src="${src}" alt="">`;
  lb.addEventListener('click', () => lb.remove());
  document.body.appendChild(lb);
}

// ---------------- 弹窗 ----------------
function confirmDialog({ title, msg = '', ok = '确定', danger = false, input: initial = null, ico = 'check' }) {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal confirm ${danger ? 'danger' : ''}">
      <div class="c-ico">${icon(ico)}</div>
      <div class="c-title">${esc(title)}</div>
      ${msg ? `<div class="c-msg">${esc(msg)}</div>` : ''}
      ${initial != null ? `<div class="c-input"><input class="input" value="${esc(initial)}"></div>` : ''}
      <div class="modal-footer">
        <button class="btn" data-r="0">取消</button>
        <button class="btn ${danger ? 'btn-danger-fill' : 'btn-primary'}" data-r="1">${esc(ok)}</button>
      </div></div>`;
    const field = ov.querySelector('input');
    const done = (r) => {
      ov.remove();
      document.removeEventListener('keydown', onKey);
      resolve(r ? (field ? field.value : true) : (field ? null : false));
    };
    const onKey = (e) => {
      if (e.key === 'Escape') done(false);
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); done(true); }
    };
    ov.addEventListener('click', (e) => {
      if (e.target === ov) done(false);
      const b = e.target.closest('[data-r]');
      if (b) done(b.dataset.r === '1');
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
    (field || ov.querySelector('[data-r="1"]')).focus();
    field?.select();
  });
}

function openSettings() {
  const s = state.settings;
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  const range = (key, label, min, max, step, help) => `
    <div><div class="field-label"><span>${label}</span><span class="val" data-val="${key}">${s[key]}</span></div>
    <input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${s[key]}">
    <div class="field-help">${help}</div></div>`;
  ov.innerHTML = `<div class="modal settings">
    <div class="modal-header"><span>设置</span><button class="modal-x" data-close>${icon('x')}</button></div>
    <div class="modal-body">
      <div>
        <div class="field-label"><span>系统提示词</span></div>
        <textarea class="input" data-k="system" placeholder="给模型设定身份、语气或规则，比如：你是一位说话简洁的中文写作助手。">${esc(s.system)}</textarea>
        <div class="field-help">对所有对话生效，留空就用模型的默认行为。</div>
      </div>
      ${range('temperature', '温度', 0, 2, 0.05, '越高越有创意、越随机；越低越稳定。官方推荐 1.0。')}
      ${range('top_p', 'Top P', 0.05, 1, 0.01, '只从累计概率前 P 的候选词里选。官方推荐 0.95。')}
      ${range('top_k', 'Top K', 1, 200, 1, '只从概率最高的 K 个候选词里选。官方推荐 64。')}
      ${range('max_tokens', '单次最多输出', 256, 16384, 256, '包括思考过程在内的 token 上限。')}
      <div class="info">上下文长度 ${state.nCtx ? state.nCtx.toLocaleString() + ' tokens' : '未知'}，在 start-chat.bat 里改 CTX 可以调整。</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" data-reset>恢复默认</button>
      <button class="btn btn-primary" data-close>完成</button>
    </div></div>`;
  const sync = () => {
    ov.querySelectorAll('[data-k]').forEach((f) => {
      const k = f.dataset.k;
      f.value = s[k];
      const v = ov.querySelector(`[data-val="${k}"]`);
      if (v) v.textContent = s[k];
    });
  };
  ov.addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    s[k] = k === 'system' ? e.target.value : +e.target.value;
    const v = ov.querySelector(`[data-val="${k}"]`);
    if (v) v.textContent = s[k];
    saveSettings();
  });
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  ov.addEventListener('click', (e) => {
    if (e.target === ov || e.target.closest('[data-close]')) close();
    if (e.target.closest('[data-reset]')) {
      Object.assign(s, { ...DEFAULTS, thinking: s.thinking });
      saveSettings(); sync(); toast('已恢复默认');
    }
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(ov);
}

// ---------------- 顶栏 ----------------
function renderThinkSeg() {
  $('thinkSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('active', (b.dataset.v === 'on') === state.settings.thinking));
}
$('thinkSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.settings.thinking = b.dataset.v === 'on';
  saveSettings(); renderThinkSeg();
});

function renderThemeBtn() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('themeBtn').innerHTML = icon(dark ? 'sun' : 'moon');
}
$('themeBtn').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
  renderThemeBtn();
});

$('exportBtn').addEventListener('click', () => {
  const c = state.cur;
  if (!c?.messages.length) { toast('当前对话是空的'); return; }
  const md = [`# ${c.title || '对话'}`, ''];
  for (const m of c.messages) {
    md.push(m.role === 'user' ? '## 我' : '## Gemma', '');
    if (m.images?.length) md.push(`（附 ${m.images.length} 张图片）`, '');
    if (m.reasoning) md.push('<details><summary>思考过程</summary>', '', m.reasoning, '', '</details>', '');
    md.push(m.content || '', '');
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md.join('\n')], { type: 'text/markdown;charset=utf-8' }));
  a.download = `${(c.title || '对话').replace(/[\\/:*?"<>|]/g, '_')}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('newChat').innerHTML = `${icon('plus')}<span>新对话</span>`;
$('newChat').addEventListener('click', newChat);
$('openSettings').innerHTML = icon('sliders');
$('openSettings').addEventListener('click', openSettings);
$('attachBtn').innerHTML = icon('image');
$('exportBtn').innerHTML = icon('download');
$('toggleSide').innerHTML = icon('panel');
$('toggleSide').addEventListener('click', () => $('sidebar').classList.add('open'));
$('scrim').addEventListener('click', closeSidebar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.generating && !document.querySelector('.modal-overlay')) stopGenerating();
});

// ---------------- 连接状态 ----------------
function setStatus(kind, text) {
  const el = $('status');
  el.className = `status ${kind}`;
  el.querySelector('.status-text').textContent =
    text || { ok: '模型已就绪', bad: '未连接到模型', busy: '正在生成…' }[kind] || '';
}

async function checkHealth() {
  try {
    const r = await fetch('/health', { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.status === 'ok') {
      state.online = true;
      if (!state.generating) setStatus('ok');
      if (state.nCtx == null) {
        const p = await fetch('/props').then((x) => x.json()).catch(() => null);
        if (p) {
          state.nCtx = p.default_generation_settings?.n_ctx || null;
          state.vision = !!p.modalities?.vision;
        }
      }
    } else {
      state.online = false;
      setStatus('bad', r.status === 503 ? '模型加载中…' : '未连接到模型');
    }
  } catch {
    state.online = false;
    if (!state.generating) setStatus('bad');
  }
}

// ---------------- 启动 ----------------
(async function init() {
  renderThemeBtn();
  renderThinkSeg();
  setBusy(false);
  try { state.convs = await db.all(); } catch { toast('无法读取历史对话', 'error'); }
  renderSidebar();
  renderThread();
  autosize();
  input.focus();
  checkHealth();
  setInterval(checkHealth, 5000);
})();
