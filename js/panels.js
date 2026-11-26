/* Invite Studio — side panels (templates, elements, uploads, layers) and the property inspector */
(function(){
  const S = IS.state, $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- tiny DOM helper ---------- */
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for(const [k, v] of Object.entries(attrs || {})){
      if(k === 'class') e.className = v; else if(k === 'html') e.innerHTML = v;
      else if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if(v === true) e.setAttribute(k, ''); else if(v !== false && v != null) e.setAttribute(k, v);
    }
    kids.flat(9).forEach(c => c != null && c !== false && e.append(c.nodeType ? c : document.createTextNode(c)));
    return e;
  };
  const ico = (n, cls) => h('span', {class:'ico ' + (cls || ''), html:ICONS[n] || ''});
  IS.h = h; IS.ico = ico;

  /* ---------- presets for the Elements tab ---------- */
  const presets = () => {
    const p = S.doc.page, F = p.fonts;
    return [
      {group:'Text', items:[
        {label:'Heading', icon:'heading', type:'text', props:{text:'Your heading', font:F.display, size:40, weight:500, w:320, color:p.ink, lh:1.1}},
        {label:'Subheading', icon:'type', type:'text', props:{text:'A short subheading', font:F.display, size:22, italic:true, w:300, color:p.accent}},
        {label:'Body text', icon:'text', type:'text', props:{text:'Add the details of your event here. Keep it short and friendly.', font:F.body, size:13, lh:1.7, w:280, color:p.ink}},
        {label:'Script', icon:'sparkles', type:'text', props:{text:'Script title', font:F.script, size:48, w:300, color:p.ink, lh:1.15}},
        {label:'Label', icon:'upper', type:'text', props:{text:'SMALL LABEL', font:F.body, size:10, weight:500, ls:.3, upper:true, w:240, color:p.accent}},
      ]},
      {group:'Media & shapes', items:[
        {label:'Photo', icon:'image', type:'image', props:{w:220, h:220, mask:'rounded', rad:14}},
        {label:'Rectangle', icon:'square', type:'shape', props:{shape:'rect', w:140, h:90, fill:p.accent, stroke:p.ink, sw:0, rad:0}},
        {label:'Circle', icon:'circle', type:'shape', props:{shape:'circle', w:100, h:100, fill:p.accent, stroke:p.ink, sw:0}},
        {label:'Line', icon:'minus', type:'shape', props:{shape:'rect', w:160, h:1, fill:p.ink, stroke:p.ink, sw:0, rad:0}},
        {label:'Button', icon:'button', type:'button', props:{text:'RSVP', w:150, h:44, fill:p.ink, color:p.bg, font:F.body, size:12, weight:500, ls:.14, upper:true, rad:4}},
      ]},
      {group:'Decorations', items: Object.entries(IS.STICKERS).map(([k, s]) => ({label:s.label, sticker:k, type:'sticker', props:{kind:k, w:s.w, h:s.h, color:p.accent}}))},
    ];
  };
  IS.addPreset = (pr, at) => IS.addElement(pr.type, pr.props, at);
  IS.addImage = (a, at) => { const w = Math.min(260, a.w), hh = Math.round(w * a.h / a.w * 10) / 10; return IS.addElement('image', {asset:a.id, w, h:hh, fit:'cover', mask:'square'}, at); };

  /* ---------- uploads (shared) ---------- */
  const fileInput = $('#fileInput');
  let pickCb = null;
  IS.pickImage = (cb, o) => { pickCb = cb; fileInput.multiple = !(o && o.replace); fileInput.value = ''; fileInput.click(); };
  fileInput.addEventListener('change', async () => {
    const list = await IS.uploadFiles(fileInput.files); const cb = pickCb; pickCb = null;
    if(list.length && cb) cb(list[0]);
  });
  IS.uploadFiles = async (files) => {
    const out = []; const arr = [...files]; let failed = 0;
    if(!arr.length) return out;
    IS.toast(arr.length > 1 ? `Uploading ${arr.length} images…` : 'Uploading…', 'busy');
    for(const f of arr){ try{ out.push(await IS.assets.add(f)); }catch(e){ failed++; IS.toast(e.message || 'Upload failed', 'error'); } }
    if(out.length && !failed) IS.toast(out.length > 1 ? `${out.length} images added` : 'Image added');
    IS.emit('assets'); return out;
  };

  /* ---------- left panel ---------- */
  const side = $('#sidePanel');
  let tab = 'templates';
  IS.setTab = (t) => { tab = t; document.querySelectorAll('.rail button').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); renderSide(); };
  function renderSide(){
    side.replaceChildren(({templates:tplPanel, elements:elPanel, uploads:upPanel, layers:layerPanel})[tab]());
    side.scrollTop = 0;
  }
  const head = (title, sub) => h('div', {class:'ph-head'}, h('h2', {}, title), sub ? h('p', {}, sub) : null);

  function tplPanel(){
    const grid = h('div', {class:'tpl-grid'});
    IS.TEMPLATES.forEach(t => {
      const W = 112, k = W / IS.W, H = t.page.h;
      const thumb = h('div', {class:'tpl-thumb', style:`width:${W}px;height:${Math.round(H*k)}px;background:${t.page.bg}`});
      const a = h('div', {class:'art', style:`width:${IS.W}px;height:${H}px;transform:scale(${k});transform-origin:0 0;background:${t.page.bg}`});
      const d = IS.buildTemplate(t);
      d.elements.forEach(el => { const n = IS.createNode(el, 'edit'); IS.applyEl(n, el, {url:() => null, edit:true}); a.append(n); });
      thumb.append(a);
      const card = h('button', {class:'tpl' + (S.doc.template === t.id ? ' on' : ''), onclick:() => useTemplate(t)}, thumb, h('div', {class:'tpl-meta'}, h('strong', {}, t.name), h('span', {}, t.tag)));
      grid.append(card);
    });
    return h('div', {class:'ph'}, head('Templates', 'Start from a design. Everything on it is editable.'), grid);
  }
  async function useTemplate(t){
    if(S.doc.template === t.id && !IS.history.canUndo()) return;
    if(IS.history.canUndo() || S.doc.template !== t.id){
      const ok = await IS.confirm('Switch template?', 'Your current design will be replaced. Uploaded images stay in your library.', 'Switch');
      if(!ok) return;
    }
    IS.setDoc(IS.buildTemplate(t)); S.sel = null; $('#docName').value = S.doc.name; IS.save(); IS.fit(); IS.renderAll(); IS.emit('selection'); renderSide(); IS.toast(t.name + ' loaded');
  }

  function elPanel(){
    const root = h('div', {class:'ph'}, head('Add elements', 'Click to add, or drag onto the invitation.'));
    presets().forEach(g => {
      const grid = h('div', {class:'el-grid' + (g.group === 'Decorations' ? ' deco' : '')});
      g.items.forEach(it => {
        const b = h('button', {class:'el-item', draggable:true, title:it.label},
          it.sticker ? h('span', {class:'el-prev', style:`color:${S.doc.page.accent}`, html:IS.stickerSvg(it.sticker)}) : ico(it.icon),
          h('span', {}, it.label));
        b.addEventListener('click', () => IS.addPreset(it));
        b.addEventListener('dragstart', e => { e.dataTransfer.setData('application/x-is', JSON.stringify(it)); e.dataTransfer.effectAllowed = 'copy'; });
        grid.append(b);
      });
      root.append(h('div', {class:'group'}, h('h3', {}, g.group), grid));
    });
    return root;
  }

  function upPanel(){
    const root = h('div', {class:'ph'}, head('Uploads', 'Photos, logos and decorations. Stored in this browser.'));
    const dz = h('button', {class:'dropzone', onclick:() => IS.pickImage()}, ico('upload'), h('strong', {}, 'Upload images'), h('span', {}, 'JPG, PNG, WebP, GIF or SVG · or drop files on the invitation'));
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', async e => { e.preventDefault(); dz.classList.remove('over'); await IS.uploadFiles(e.dataTransfer.files); });
    root.append(dz);
    if(!IS.assets.persistent) root.append(h('p', {class:'warn'}, 'Browser storage is unavailable, so uploads will be lost when you close this tab.'));
    const list = IS.assets.list();
    if(!list.length) root.append(h('p', {class:'empty-note'}, 'No uploads yet.'));
    else {
      const grid = h('div', {class:'up-grid'});
      list.forEach(a => {
        const t = h('div', {class:'up', title:`${a.name} · ${a.w}×${a.h} · ${(a.size/1024).toFixed(0)} KB`},
          h('button', {class:'up-img', style:`background-image:url("${IS.assets.url(a.id)}")`, onclick:() => useAsset(a), 'aria-label':'Use ' + a.name}),
          h('button', {class:'up-del', title:'Delete from library', onclick:() => delAsset(a)}, ico('close')));
        grid.append(t);
      });
      root.append(h('p', {class:'hint'}, 'Click an image to use it. With a photo selected it replaces that photo.'), grid);
    }
    return root;
  }
  function useAsset(a){
    const el = S.sel && IS.el(S.sel);
    if(el && el.type === 'image') IS.update(el, {asset:a.id}, 'img');
    else IS.addImage(a);
    IS.refreshInspector();
  }
  async function delAsset(a){
    const used = S.doc.elements.filter(e => e.asset === a.id).length + (S.doc.page.bgAsset === a.id ? 1 : 0);
    const ok = await IS.confirm('Delete image?', used ? `This image is used ${used} time${used > 1 ? 's' : ''} in your design. Those spots will become empty.` : 'It will be removed from your library.', 'Delete', true);
    if(!ok) return;
    S.doc.elements.forEach(e => { if(e.asset === a.id) e.asset = null; }); if(S.doc.page.bgAsset === a.id) S.doc.page.bgAsset = null;
    await IS.assets.remove(a.id); IS.structure(); IS.emit('assets');
  }

  function layerName(e){
    if(e.type === 'text' || e.type === 'button') return (e.text || '').replace(/\s+/g, ' ').trim().slice(0, 26) || 'Empty text';
    if(e.type === 'image') return 'Photo'; if(e.type === 'shape') return e.shape === 'circle' ? 'Circle' : (e.h <= 3 ? 'Line' : 'Rectangle');
    return (IS.STICKERS[e.kind] || {}).label || 'Decoration';
  }
  const typeIcon = (e) => ({text:'type', button:'button', image:'image', shape:e.shape === 'circle' ? 'circle' : 'square', sticker:'sparkles'})[e.type];
  function layerPanel(){
    const root = h('div', {class:'ph'}, head('Layers', 'Top of the list is in front. Drag to reorder.'));
    const list = h('div', {class:'layers'});
    [...S.doc.elements].reverse().forEach(e => {
      const row = h('div', {class:'layer' + (S.sel === e.id ? ' on' : '') + (e.hide ? ' off' : ''), 'data-id':e.id},
        h('span', {class:'grip', html:'<i></i><i></i><i></i><i></i><i></i><i></i>'}),
        ico(typeIcon(e), 'ty'), h('span', {class:'nm'}, layerName(e)),
        h('button', {class:'mini' + (e.lock ? ' on' : ''), title:e.lock ? 'Unlock' : 'Lock', onclick:ev => { ev.stopPropagation(); IS.update(e, {lock:!e.lock}, 'lock'); renderSide(); IS.refreshInspector(); }}, ico(e.lock ? 'lock' : 'unlock')),
        h('button', {class:'mini' + (e.hide ? ' on' : ''), title:e.hide ? 'Show' : 'Hide', onclick:ev => { ev.stopPropagation(); IS.update(e, {hide:!e.hide}, 'hide'); renderSide(); }}, ico(e.hide ? 'eyeOff' : 'eye')));
      row.addEventListener('click', () => IS.select(e.id));
      list.append(row);
    });
    root.append(list);
    if(window.Sortable) Sortable.create(list, {animation:140, handle:'.grip', ghostClass:'ghost', onEnd:(ev) => {
      const n = S.doc.elements.length; if(ev.oldIndex === ev.newIndex) return;
      IS.reorderTo(n - 1 - ev.oldIndex, n - 1 - ev.newIndex); renderSide();
    }});
    return root;
  }
  IS.on('structure', () => { if(tab === 'layers' || tab === 'elements') renderSide(); IS.refreshInspector(); });
  IS.on('selection', () => { if(tab === 'layers'){ document.querySelectorAll('.layer').forEach(r => r.classList.toggle('on', r.dataset.id === S.sel)); } if(tab === 'uploads') {} IS.refreshInspector(); });
  IS.on('assets', () => { if(tab === 'uploads') renderSide(); });
  IS.on('doc', () => { IS.renderAll(); renderSide(); IS.refreshInspector(); });
  IS.on('el', (e) => { if(tab === 'layers' && e) { const row = document.querySelector(`.layer[data-id="${e.id}"] .nm`); if(row) row.textContent = layerName(e); } });
  IS.renderSide = renderSide;

  /* ====================================================================
     Inspector (right panel)
     ==================================================================== */
  const insp = $('#inspector');
  const fmt = (v) => (Math.round(v * 100) / 100).toString();
  const set = (el, props, key) => IS.update(el, props, key || Object.keys(props).join(','));
  IS.refreshInspector = () => {
    const el = S.sel && IS.el(S.sel);
    insp.replaceChildren(el ? elementInspector(el) : pageInspector());
  };
  const section = (title, ...kids) => h('section', {class:'sec'}, title ? h('h3', {}, title) : null, ...kids);
  const row = (label, ctrl, cls) => h('div', {class:'row ' + (cls || '')}, h('label', {}, label), h('div', {class:'ctl'}, ctrl));

  function num(el, k, o){
    o = o || {};
    const i = h('input', {type:'number', min:o.min, max:o.max, step:o.step || 1, value:fmt(el[k]), 'data-k':k, class:'num'});
    i.addEventListener('input', () => { let v = parseFloat(i.value); if(isNaN(v)) return; v = clamp(v, o.min ?? -9999, o.max ?? 9999); set(el, {[k]:v}, k); if(o.after) o.after(); });
    i.addEventListener('blur', () => { i.value = fmt(el[k]); });
    return o.unit ? h('div', {class:'unit'}, i, h('em', {}, o.unit)) : i;
  }
  function slider(el, k, o){
    const r = h('input', {type:'range', min:o.min, max:o.max, step:o.step, value:el[k] * (o.scale || 1), 'data-k':k});
    const n = h('input', {type:'number', min:o.min, max:o.max, step:o.step, value:fmt(el[k] * (o.scale || 1)), class:'num sm', 'data-k':k});
    const upd = (raw, from) => { let v = parseFloat(raw); if(isNaN(v)) return; v = clamp(v, o.min, o.max); if(from !== r) r.value = v; if(from !== n) n.value = fmt(v); set(el, {[k]:v / (o.scale || 1)}, k); };
    r.addEventListener('input', () => upd(r.value, r)); n.addEventListener('input', () => upd(n.value, n));
    return h('div', {class:'slider'}, r, n);
  }
  const hexOk = (s) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
  const toHex = (c) => { if(!hexOk(c)) return '#ffffff'; return c.length === 4 ? '#' + [...c.slice(1)].map(x => x + x).join('') : c.toLowerCase(); };
  function color(el, k, o){
    o = o || {};
    const cur = el[k], clear = cur === 'transparent';
    const sw = h('input', {type:'color', value:toHex(cur), class:'swatch' + (clear ? ' none' : '')});
    const tx = h('input', {type:'text', value:clear ? 'none' : cur, class:'hex', spellcheck:false, maxlength:9});
    const apply = (v, key) => { set(el, {[k]:v}, key || k); sw.value = toHex(v); tx.value = v === 'transparent' ? 'none' : v; sw.classList.toggle('none', v === 'transparent'); pal.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.c === v)); };
    sw.addEventListener('input', () => apply(sw.value));
    tx.addEventListener('change', () => { let v = tx.value.trim().toLowerCase(); if(v === 'none' && o.none) return apply('transparent'); if(!v.startsWith('#')) v = '#' + v; if(hexOk(v)) apply(v); else tx.value = el[k] === 'transparent' ? 'none' : el[k]; });
    const pal = h('div', {class:'pal'});
    S.doc.page.palette.forEach(c => pal.append(h('button', {class:'dot' + (c.toLowerCase() === String(cur).toLowerCase() ? ' on' : ''), style:`background:${c}`, 'data-c':c, title:c, onclick:() => apply(c)})));
    if(o.none) pal.append(h('button', {class:'dot nofill' + (clear ? ' on' : ''), 'data-c':'transparent', title:'No fill', onclick:() => apply('transparent')}));
    return h('div', {class:'color'}, h('div', {class:'cbox'}, sw, tx), pal);
  }
  function seg(opts, cur, pick){
    const w = h('div', {class:'seg'});
    opts.forEach(o => { const b = h('button', {class:cur === o.v ? 'on' : '', title:o.t || o.l, disabled:!!o.d, onclick:() => { w.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); pick(o.v); }}, o.i ? ico(o.i) : o.l); w.append(b); });
    return w;
  }
  function toggle(label, on, fn, icon){ const b = h('button', {class:'tg' + (on ? ' on' : ''), title:label, onclick:() => { on = !on; b.classList.toggle('on', on); fn(on); }}, icon ? ico(icon) : label); return b; }

  /* custom font picker with live previews */
  let pop = null;
  const closePop = () => { if(pop){ pop.remove(); pop = null; } };
  document.addEventListener('mousedown', e => { if(pop && !pop.contains(e.target) && !e.target.closest('.fontbtn')) closePop(); });
  function fontPicker(el, k, onPick){
    const b = h('button', {class:'fontbtn', style:`font-family:${IS.fontCss(el[k])}`}, el[k], ico('chevD'));
    b.addEventListener('click', () => {
      if(pop){ closePop(); return; }
      pop = h('div', {class:'fontpop'});
      ['Serif', 'Script', 'Hand', 'Sans'].forEach(kind => {
        pop.append(h('div', {class:'fp-k'}, kind));
        IS.FONTS.filter(f => f.kind === kind).forEach(f => pop.append(h('button', {class:'fp' + (f.name === el[k] ? ' on' : ''), style:`font-family:${IS.fontCss(f.name)}`, onclick:() => { closePop(); onPick(f.name); }}, f.name)));
      });
      document.body.append(pop);
      const r = b.getBoundingClientRect(); pop.style.left = Math.max(8, r.right - 232) + 'px';
      const below = innerHeight - r.bottom; pop.style.maxHeight = Math.min(360, Math.max(200, below - 16)) + 'px'; pop.style.top = r.bottom + 6 + 'px';
    });
    return b;
  }
  const nearest = (list, w) => list.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a);

  function textControls(el, isBtn){
    const f = IS.font(el.font), kids = [];
    kids.push(row('Font', fontPicker(el, 'font', (name) => { const nf = IS.font(name); set(el, {font:name, weight:nearest(nf.w, el.weight), italic:nf.ital ? el.italic : false}, 'font'); IS.refreshInspector(); })));
    kids.push(row('Weight', seg(f.w.map(w => ({v:w, l:({400:'Regular', 500:'Medium', 600:'Semi', 700:'Bold'})[w] || w})), f.w.includes(el.weight) ? el.weight : nearest(f.w, el.weight), v => set(el, {weight:v}, 'weight'))));
    if(f.ital || !isBtn) kids.push(row('Style', h('div', {class:'tgs'},
      f.ital ? toggle('Italic', el.italic, v => set(el, {italic:v}, 'italic'), 'italic') : null,
      toggle('Uppercase', el.upper, v => set(el, {upper:v}, 'upper'), 'upper'))));
    else kids.push(row('Style', toggle('Uppercase', el.upper, v => set(el, {upper:v}, 'upper'), 'upper')));
    kids.push(row('Size', slider(el, 'size', {min:8, max:140, step:1})));
    if(!isBtn){
      kids.push(row('Align', seg([{v:'left', i:'alignL', t:'Left'}, {v:'center', i:'alignC', t:'Center'}, {v:'right', i:'alignR', t:'Right'}], el.align, v => set(el, {align:v}, 'align'))));
      kids.push(row('Line height', slider(el, 'lh', {min:.8, max:2.4, step:.05})));
    }
    kids.push(row('Spacing', slider(el, 'ls', {min:0, max:.6, step:.01})));
    return kids;
  }

  function elementInspector(el){
    const root = h('div', {class:'insp'});
    const title = ({text:'Text', image:'Photo', shape:el.shape === 'circle' ? 'Circle' : 'Shape', button:'Button', sticker:'Decoration'})[el.type];
    root.append(h('header', {class:'insp-head'}, h('div', {}, h('small', {}, 'Selected'), h('strong', {}, title)),
      h('div', {class:'quick'},
        h('button', {title:'Duplicate (Ctrl+D)', onclick:() => IS.duplicate(el.id)}, ico('copy')),
        h('button', {title:el.lock ? 'Unlock' : 'Lock', class:el.lock ? 'on' : '', onclick:() => { IS.update(el, {lock:!el.lock}, 'lock'); IS.refreshInspector(); IS.renderSide && IS.renderSide(); }}, ico(el.lock ? 'lock' : 'unlock')),
        h('button', {title:'Delete (Del)', class:'danger', onclick:() => IS.removeEl(el.id)}, ico('trash')))));

    if(el.type === 'text'){
      const ta = h('textarea', {rows:3, spellcheck:false}, el.text);
      ta.addEventListener('input', () => set(el, {text:ta.value}, 'text'));
      root.append(section('Content', ta), section('Typography', ...textControls(el), row('Color', color(el, 'color'))));
    }
    if(el.type === 'button'){
      const t = h('input', {type:'text', value:el.text, class:'txt'}); t.addEventListener('input', () => set(el, {text:t.value}, 'text'));
      const l = h('input', {type:'url', value:el.link, class:'txt', placeholder:'https://wa.me/… or https://…'}); l.addEventListener('input', () => set(el, {link:l.value.trim()}, 'link'));
      root.append(section('Content', row('Label', t), row('Link', l)),
        section('Style', row('Fill', color(el, 'fill')), row('Text', color(el, 'color')), row('Corners', slider(el, 'rad', {min:0, max:60, step:1}))),
        section('Typography', ...textControls(el, true)));
    }
    if(el.type === 'image'){
      const a = IS.assets.get(el.asset);
      const prev = h('button', {class:'imgprev' + (a ? '' : ' empty'), style:a ? `background-image:url("${IS.assets.url(a.id)}")` : '', onclick:() => IS.pickImage(x => { set(el, {asset:x.id}, 'img'); IS.refreshInspector(); }, {replace:true})}, a ? null : [ico('imagePlus'), h('span', {}, 'Upload a photo')]);
      root.append(section('Image', prev,
        h('div', {class:'btnrow'},
          h('button', {class:'btn sm', onclick:() => IS.pickImage(x => { set(el, {asset:x.id}, 'img'); IS.refreshInspector(); }, {replace:true})}, ico('replace'), a ? 'Replace' : 'Upload'),
          h('button', {class:'btn sm', onclick:() => IS.setTab('uploads')}, ico('image'), 'Library'),
          a ? h('button', {class:'btn sm ghost', onclick:() => { set(el, {asset:null}, 'img'); IS.refreshInspector(); }}, 'Remove') : null)),
        section('Shape', row('Fit', seg([{v:'cover', l:'Fill'}, {v:'contain', l:'Fit'}], el.fit, v => set(el, {fit:v}, 'fit'))),
          row('Mask', seg([{v:'square', l:'Square'}, {v:'rounded', l:'Round'}, {v:'arch', l:'Arch'}, {v:'circle', l:'Circle'}], el.mask, v => { set(el, {mask:v}, 'mask'); IS.refreshInspector(); })),
          el.mask === 'rounded' ? row('Corners', slider(el, 'rad', {min:0, max:80, step:1})) : null));
    }
    if(el.type === 'shape'){
      root.append(section('Shape', row('Type', seg([{v:'rect', l:'Rectangle'}, {v:'circle', l:'Circle'}], el.shape, v => { set(el, {shape:v}, 'shape'); IS.refreshInspector(); })),
        el.shape === 'rect' ? row('Corners', slider(el, 'rad', {min:0, max:200, step:1})) : null),
        section('Colors', row('Fill', color(el, 'fill', {none:true})), row('Stroke', color(el, 'stroke')), row('Stroke size', slider(el, 'sw', {min:0, max:12, step:.5}))));
    }
    if(el.type === 'sticker'){
      const g = h('div', {class:'stk-grid'});
      Object.entries(IS.STICKERS).forEach(([k, s]) => g.append(h('button', {class:el.kind === k ? 'on' : '', title:s.label, html:IS.stickerSvg(k), onclick:() => { set(el, {kind:k}, 'kind'); g.querySelectorAll('button').forEach(b => b.classList.remove('on')); g.querySelector(`[title="${s.label}"]`).classList.add('on'); }})));
      root.append(section('Decoration', g, row('Color', color(el, 'color'))));
    }

    const arrange = section('Position & size',
      h('div', {class:'grid2'}, row('X', num(el, 'x', {unit:'px', step:1})), row('Y', num(el, 'y', {unit:'px', step:1})),
        row('W', num(el, 'w', {unit:'px', min:8, step:1})), el.type === 'text' ? null : row('H', num(el, 'h', {unit:'px', min:1, step:1})),
        row('Rotate', num(el, 'r', {unit:'°', min:-180, max:180, step:1}))),
      row('Opacity', slider(el, 'o', {min:0, max:100, step:1, scale:100})),
      row('Order', h('div', {class:'tgs ord'},
        h('button', {class:'tg', title:'Bring to front', onclick:() => IS.order(el.id, 'front')}, ico('front')),
        h('button', {class:'tg', title:'Forward', onclick:() => IS.order(el.id, 'up')}, ico('up')),
        h('button', {class:'tg', title:'Backward', onclick:() => IS.order(el.id, 'down')}, ico('down')),
        h('button', {class:'tg', title:'Send to back', onclick:() => IS.order(el.id, 'back')}, ico('back')))));
    root.append(arrange);
    return root;
  }

  function pageInspector(){
    const p = S.doc.page, root = h('div', {class:'insp'});
    root.append(h('header', {class:'insp-head'}, h('div', {}, h('small', {}, 'Nothing selected'), h('strong', {}, 'Page'))));
    const pageSet = (props, key) => { Object.assign(p, props); IS.renderAll(); IS.commit(key); };
    const colorRow = (() => {
      const sw = h('input', {type:'color', value:toHex(p.bg), class:'swatch'});
      const tx = h('input', {type:'text', value:p.bg, class:'hex', spellcheck:false, maxlength:9});
      const pal = h('div', {class:'pal'});
      const apply = (v) => { pageSet({bg:v}, 'pbg'); sw.value = toHex(v); tx.value = v; pal.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.c === v)); };
      sw.addEventListener('input', () => apply(sw.value));
      tx.addEventListener('change', () => { let v = tx.value.trim().toLowerCase(); if(!v.startsWith('#')) v = '#' + v; if(hexOk(v)) apply(v); else tx.value = p.bg; });
      p.palette.forEach(c => pal.append(h('button', {class:'dot' + (c.toLowerCase() === p.bg.toLowerCase() ? ' on' : ''), style:`background:${c}`, 'data-c':c, title:c, onclick:() => apply(c)})));
      return h('div', {class:'color'}, h('div', {class:'cbox'}, sw, tx), pal);
    })();
    const a = IS.assets.get(p.bgAsset);
    const h2 = h('input', {type:'number', class:'num', min:500, max:2400, step:10, value:p.h});
    h2.addEventListener('input', () => { const v = clamp(parseFloat(h2.value) || 780, 500, 2400); pageSet({h:v}, 'ph'); if(S.autoFit) IS.fit(); });
    root.append(
      section('Background', row('Color', colorRow),
        row('Image', h('div', {class:'btnrow'},
          h('button', {class:'btn sm', onclick:() => IS.pickImage(x => { pageSet({bgAsset:x.id}, 'pbgi'); IS.refreshInspector(); }, {replace:true})}, ico('imagePlus'), a ? 'Replace' : 'Upload'),
          a ? h('button', {class:'btn sm ghost', onclick:() => { pageSet({bgAsset:null}, 'pbgi'); IS.refreshInspector(); }}, 'Remove') : null))),
      section('Size', row('Height', h('div', {class:'unit'}, h2, h('em', {}, 'px'))), h('p', {class:'note'}, 'Width is fixed at 390 px and scales to every phone and screen when published.')),
      section('Name', (() => { const i = h('input', {type:'text', class:'txt', value:S.doc.name}); i.addEventListener('input', () => { S.doc.name = i.value; const t = $('#docName'); if(t) t.value = i.value; IS.commit('name'); }); return i; })()),
      h('div', {class:'tipbox'}, h('strong', {}, 'Shortcuts'), h('ul', {},
        h('li', {}, h('kbd', {}, 'Double-click'), ' edit text / replace photo'),
        h('li', {}, h('kbd', {}, 'Arrows'), ' nudge · ', h('kbd', {}, 'Shift'), ' ×10'),
        h('li', {}, h('kbd', {}, 'Ctrl D'), ' duplicate · ', h('kbd', {}, 'Del'), ' delete'),
        h('li', {}, h('kbd', {}, 'Ctrl Z'), ' / ', h('kbd', {}, 'Ctrl Y'), ' undo / redo'),
        h('li', {}, h('kbd', {}, 'Ctrl V'), ' paste an image'))));
    return root;
  }

  /* keep geometry inputs in sync after drag / resize / rotate / nudge */
  IS.on('geometry', (el) => {
    insp.querySelectorAll('input[data-k]').forEach(i => { if(document.activeElement === i) return; const k = i.dataset.k; if(['x','y','w','h','r'].includes(k) && i.type !== 'range') i.value = fmt(el[k]); });
  });
  IS.on('history', () => {});
  IS.initPanels = () => { IS.setTab('templates'); IS.refreshInspector(); };
})();
