/* Invite Studio — the ONE renderer. The editor canvas, template thumbnails, the preview
   and the exported page all build elements through applyEl(), so they always look identical. */
(function(){
  IS.BASE_CSS =
`.art .el{position:absolute;box-sizing:border-box;margin:0;transform-origin:50% 50%}
.art .t{white-space:pre-wrap;overflow-wrap:break-word;word-break:normal}
.art .bx{display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;white-space:nowrap}
.art .im{background-repeat:no-repeat;background-position:center}
.art .sk svg{display:block}`;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  IS.esc = esc;
  const px = (n) => (Math.round(n * 100) / 100) + 'px';

  IS.createNode = (el, mode) => {
    const isLink = mode === 'export' && el.type === 'button';
    const n = document.createElement(isLink ? 'a' : 'div');
    n.dataset.id = el.id;
    return n;
  };

  /* ctx: {url(assetId)->string|null, edit:boolean} */
  IS.applyEl = (n, el, ctx) => {
    const s = n.style;
    n.className = 'el ' + ({text:'t', button:'bx', image:'im', shape:'sp', sticker:'sk'})[el.type] + (el.type==='text' ? '' : '');
    s.left = px(el.x); s.top = px(el.y); s.width = px(el.w);
    s.transform = el.r ? `rotate(${el.r}deg)` : '';
    s.opacity = el.o < 1 ? el.o : '';
    s.display = (el.hide && ctx.edit) ? 'none' : '';
    if(el.type === 'text'){
      s.height = 'auto';
      s.fontFamily = IS.fontCss(el.font); s.fontSize = px(el.size); s.fontWeight = el.weight;
      s.fontStyle = (el.italic && IS.font(el.font).ital) ? 'italic' : 'normal'; s.color = el.color; s.textAlign = el.align;
      s.letterSpacing = el.ls ? el.ls + 'em' : ''; s.lineHeight = el.lh; s.textTransform = el.upper ? 'uppercase' : '';
      if(!n._editing && n.textContent !== el.text) n.textContent = el.text;
      return;
    }
    s.height = px(el.h);
    if(el.type === 'button'){
      s.background = el.fill; s.color = el.color; s.borderRadius = px(el.rad);
      s.fontFamily = IS.fontCss(el.font); s.fontSize = px(el.size); s.fontWeight = el.weight;
      s.letterSpacing = el.ls ? el.ls + 'em' : ''; s.textTransform = el.upper ? 'uppercase' : '';
      if(n.tagName === 'A'){ if(el.link){ n.href = el.link; n.target = '_blank'; n.rel = 'noopener'; } else n.removeAttribute('href'); }
      if(!n._editing && n.textContent !== el.text) n.textContent = el.text;
    } else if(el.type === 'image'){
      const u = ctx.url(el.asset);
      s.backgroundImage = u ? `url("${u}")` : '';
      s.backgroundSize = el.fit === 'contain' ? 'contain' : 'cover';
      s.borderRadius = el.mask === 'circle' ? '50%' : el.mask === 'arch' ? `${px(el.w/2)} ${px(el.w/2)} 0 0` : el.mask === 'rounded' ? px(el.rad) : '0';
      if(ctx.edit){
        n.classList.toggle('empty', !u);
        n.innerHTML = u ? '' : `<div class="ph">${ICONS.imagePlus}<span>Add photo</span></div>`;
      } else if(!u){ s.display = 'none'; }
    } else if(el.type === 'shape'){
      s.background = el.fill; s.border = el.sw ? `${el.sw}px solid ${el.stroke}` : '0';
      s.borderRadius = el.shape === 'circle' ? '50%' : px(el.rad);
    } else if(el.type === 'sticker'){
      s.color = el.color;
      const key = 'k:' + el.kind; if(n._k !== key){ n.innerHTML = IS.stickerSvg(el.kind); n._k = key; }
    }
  };

  /* ---- Export: one self-contained HTML file (images embedded as data: URLs) ---- */
  const blobToDataUrl = (blob) => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });

  /* Fonts are embedded as base64 @font-face so the exported page works offline and never reflows. */
  const nearest = (list, w) => list.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a);
  IS.loadFontData = () => new Promise((res) => {
    if(window.FONTDATA) return res(true);
    const s = document.createElement('script'); s.src = 'js/fontdata.js'; s.onload = () => res(true); s.onerror = () => res(false); document.head.append(s);
  });
  IS.fontFaces = async (fonts) => {
    const ok = await IS.loadFontData(); if(!ok) return '';
    let css = '';
    for(const [name, uses] of Object.entries(fonts)){
      const f = IS.font(name), slug = name.toLowerCase().replace(/ /g, '-'), seen = new Set();
      uses.forEach(u => {
        const italic = u.i && f.ital && f.g.i.length;
        const w = nearest(italic ? f.g.i : f.g.w, u.w), key = w + (italic ? 'i' : 'n');
        if(seen.has(key)) return; seen.add(key);
        const file = `${slug}-latin-${w}-${italic ? 'italic' : 'normal'}.woff2`, b64 = window.FONTDATA[file];
        if(b64) css += `@font-face{font-family:'${name}';font-style:${italic ? 'italic' : 'normal'};font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2')}\n`;
      });
    }
    return css;
  };

  IS.buildExport = async (doc) => {
    const used = new Set(); doc.elements.forEach(e => e.asset && used.add(e.asset)); doc.page.bgAsset && used.add(doc.page.bgAsset);
    const urls = {};
    for(const id of used){ const a = IS.assets.get(id); if(a) urls[id] = await blobToDataUrl(a.blob); }
    const ctx = {url:(id) => urls[id] || null, edit:false};
    const holder = document.createElement('div');
    doc.elements.forEach(el => { if(el.hide) return; const n = IS.createNode(el, 'export'); IS.applyEl(n, el, ctx); holder.appendChild(n); });

    const fonts = {}; doc.elements.forEach(e => { if(e.font) (fonts[e.font] = fonts[e.font] || []).push({w:e.weight, i:!!e.italic}); });
    const faces = await IS.fontFaces(fonts);
    const p = doc.page, H = Math.round(p.h);
    const bgImg = p.bgAsset && urls[p.bgAsset] ? `background-image:url("${urls[p.bgAsset]}");background-size:cover;background-position:center;` : '';
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(doc.name)}</title>
<style>
*{box-sizing:border-box}html,body{margin:0}
body{background:color-mix(in srgb,${esc(p.bg)} 88%,#000);min-height:100vh;-webkit-text-size-adjust:100%}
.stage{margin:0 auto;position:relative;overflow:hidden;width:${IS.W}px;height:${H}px}
.art{position:absolute;left:0;top:0;width:${IS.W}px;height:${H}px;transform-origin:0 0;overflow:hidden;background-color:${esc(p.bg)};${bgImg}}
${faces}
${IS.BASE_CSS}
</style></head>
<body><div class="stage" id="stage"><main class="art" id="art">${holder.innerHTML}</main></div>
<script>
(function(){var s=document.getElementById('stage'),a=document.getElementById('art'),W=${IS.W},H=${H};
function fit(){var k=Math.min(innerWidth/W,1.45);a.style.transform='scale('+k+')';s.style.width=W*k+'px';s.style.height=H*k+'px';}
fit();addEventListener('resize',fit);})();
</script></body></html>`;
  };
})();
