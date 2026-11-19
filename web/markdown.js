// 极简 Markdown 渲染：先整体转义 HTML，再识别常用语法。不依赖任何外部库，断网可用。

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function inline(raw) {
  let s = esc(raw);
  const codes = [];
  s = s.replace(/`([^`\n]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s\n][^*\n]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/~~([^~\n]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
}

const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const listRe = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

export function renderMarkdown(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let para = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // 代码块（流式输出时可能还没闭合，也照样按代码显示）
    const fence = line.match(/^\s*(```|~~~)\s*([\w+#.-]*)/);
    if (fence) {
      flushPara();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) buf.push(lines[i++]);
      i++;
      const lang = fence[2] || 'text';
      out.push(
        `<div class="code"><div class="code-head"><span>${esc(lang)}</span><button data-copy-code>复制</button></div><pre><code>${esc(buf.join('\n'))}</code></pre></div>`
      );
      continue;
    }

    if (!line.trim()) { flushPara(); i++; continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      const lv = Math.min(h[1].length, 4);
      out.push(`<h${lv}>${inline(h[2].replace(/\s*#+\s*$/, ''))}</h${lv}>`);
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flushPara(); out.push('<hr>'); i++; continue; }

    if (/^\s*>/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara();
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`
      );
      continue;
    }

    if (listRe.test(line)) {
      flushPara();
      out.push(renderList(lines, i, (next) => (i = next)));
      continue;
    }

    para.push(line);
    i++;
  }
  flushPara();
  return out.join('');
}

// 列表：按缩进处理嵌套
function renderList(lines, start, setNext) {
  const base = lines[start].match(listRe)[1].length;
  const ordered = /\d/.test(lines[start].match(listRe)[2]);
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(listRe);
    if (m && m[1].length === base) {
      items.push({ text: [m[3]], sub: [] });
      i++;
      continue;
    }
    if (m && m[1].length > base && items.length) {
      const html = renderList(lines, i, (n) => (i = n));
      items[items.length - 1].sub.push(html);
      continue;
    }
    if (!m && lines[i].trim() && /^\s+/.test(lines[i]) && items.length) {
      items[items.length - 1].text.push(lines[i].trim());
      i++;
      continue;
    }
    break;
  }
  setNext(i);
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag}>${items.map((it) => `<li>${it.text.map(inline).join('<br>')}${it.sub.join('')}</li>`).join('')}</${tag}>`;
}
