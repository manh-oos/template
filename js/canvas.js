/* Invite Studio — artboard, selection, drag/resize/rotate (Moveable), inline text editing */
(function(){
  const S = IS.state, $ = (s) => document.querySelector(s);
  const stage = $('#stage'), art = $('#artboard'), scroller = $('#scroller');
  const nodes = IS.nodes = new Map();
  const ctx = IS.ctx = {url:(id) => IS.assets.url(id), edit:true};
  let mv = null, editing = null;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = (v) => Math.round(v * 10) / 10;

  /* ---------- rendering (keyed sync of DOM nodes with the document) ---------- */
  IS.renderAll = () => {
    const d = S.doc, p = d.page;
    art.style.height = p.h + 'px';
    art.style.backgroundColor = p.bg;
    const bg = IS.assets.url(p.bgAsset);
    art.style.backgroundImage = bg ? `url("${bg}")` : '';
    art.style.backgroundSize = 'cover'; art.style.backgroundPosition = 'center';
    const ids = new Set(d.elements.map(e => e.id));
    nodes.forEach((n, id) => { if(!ids.has(id)){ n.remove(); nodes.delete(id); } });
    d.elements.forEach((el, i) => {
      let n = nodes.get(el.id);
      if(!n){ n = IS.createNode(el, 'edit'); nodes.set(el.id, n); }
      IS.applyEl(n, el, ctx);
      n.classList.toggle('locked', !!el.lock);
      n.classList.toggle('is-sel', S.sel === el.id);
      if(art.children[i] !== n) art.insertBefore(n, art.children[i] || null);
    });
    applyZoom(); syncMoveable();
    IS.emit('rendered');
  };

  function applyZoom(){
    const k = S.zoom;
    stage.style.width = IS.W * k + 'px'; stage.style.height = S.doc.page.h * k + 'px';
    art.style.transform = `scale(${k})`;
    const z = document.getElementById('zoomVal'); if(z) z.textContent = Math.round(k * 100) + '%';
  }
  IS.setZoom = (z, manual) => { if(manual) S.autoFit = false; S.zoom = clamp(Math.round(z * 100) / 100, 0.3, 2.5); applyZoom(); mv && mv.updateRect(); };
  IS.fit = () => { S.autoFit = true; const w = scroller.clientWidth - 96, h = scroller.clientHeight - 96; IS.setZoom(Math.min(1.6, w / IS.W, h / S.doc.page.h)); };
  window.addEventListener('resize', () => { if(S.autoFit) IS.fit(); });

  /* ---------- selection ---------- */
  IS.select = (id) => {
    if(S.sel === id) return;
    if(editing) endEdit(true);
    S.sel = id;
    nodes.forEach((n, nid) => n.classList.toggle('is-sel', nid === id));
    syncMoveable(); IS.emit('selection');
  };

  function syncMoveable(){
    if(!mv) return;
    const el = S.sel && IS.el(S.sel), n = el && nodes.get(el.id);
    if(!el || !n || el.hide || el.lock || editing){ mv.target = null; return; }
    const txt = el.type === 'text';
    mv.renderDirections = txt ? ['w','e'] : ['nw','n','ne','w','e','sw','s','se'];
    mv.keepRatio = el.type === 'sticker';
    mv.elementGuidelines = S.doc.elements.filter(o => o.id !== el.id && !o.hide).map(o => nodes.get(o.id)).filter(Boolean);
    mv.horizontalGuidelines = [0, S.doc.page.h / 2, S.doc.page.h];
    mv.target = n;
    requestAnimationFrame(() => mv && mv.updateRect());
  }
  IS.syncMoveable = syncMoveable;
  IS.updateRect = () => { if(mv) requestAnimationFrame(() => mv.updateRect()); };

  /* ---------- element operations ---------- */
  IS.update = (el, props, key) => {
    Object.assign(el, props);
    const n = nodes.get(el.id); if(n) IS.applyEl(n, el, ctx);
    if(props.lock !== undefined || props.hide !== undefined){ n && n.classList.toggle('locked', !!el.lock); syncMoveable(); }
    else IS.updateRect();
    IS.commit(key); IS.emit('el', el);
  };
  IS.structure = (key) => { IS.commit(key); IS.renderAll(); IS.emit('structure'); };

  IS.visibleY = () => { const a = scroller.getBoundingClientRect().top, b = stage.getBoundingClientRect().top; return clamp((a - b) / S.zoom + 70, 24, Math.max(24, S.doc.page.h - 140)); };
  IS.addElement = (type, props, at) => {
    const el = IS.makeEl(type, props);
    if(el.type === 'text') el.h = 0;
    el.x = at ? at.x - el.w / 2 : (IS.W - el.w) / 2;
    el.y = at ? at.y - (el.h || 40) / 2 : IS.visibleY();
    el.x = r1(el.x); el.y = r1(el.y);
    S.doc.elements.push(el); S.sel = el.id;
    IS.structure(); IS.emit('selection'); return el;
  };
  IS.removeEl = (id) => { S.doc.elements = S.doc.elements.filter(e => e.id !== id); if(S.sel === id) S.sel = null; IS.structure(); IS.emit('selection'); };
  IS.duplicate = (id) => {
    const el = IS.el(id); if(!el) return;
    const c = JSON.parse(JSON.stringify(el)); c.id = IS.uid(); c.x = r1(el.x + 14); c.y = r1(el.y + 14); c.lock = false;
    S.doc.elements.splice(S.doc.elements.indexOf(el) + 1, 0, c); S.sel = c.id; IS.structure(); IS.emit('selection');
  };
  IS.order = (id, how) => {
    const a = S.doc.elements, i = a.findIndex(e => e.id === id); if(i < 0) return;
    const j = how === 'front' ? a.length - 1 : how === 'back' ? 0 : how === 'up' ? Math.min(a.length - 1, i + 1) : Math.max(0, i - 1);
    if(i === j) return; const [e] = a.splice(i, 1); a.splice(j, 0, e); IS.structure();
  };
  IS.reorderTo = (fromIdx, toIdx) => { const a = S.doc.elements; const [e] = a.splice(fromIdx, 1); a.splice(toIdx, 0, e); IS.structure(); };

  /* ---------- Moveable ---------- */
  function readBack(n){
    const el = IS.el(n.dataset.id); if(!el) return;
    el.x = r1(parseFloat(n.style.left)); el.y = r1(parseFloat(n.style.top)); el.w = r1(Math.max(8, parseFloat(n.style.width)));
    if(el.type !== 'text') el.h = r1(Math.max(1, parseFloat(n.style.height)));
    const m = /rotate\((-?[\d.]+)deg\)/.exec(n.style.transform || '');
    el.r = m ? r1(((parseFloat(m[1]) % 360) + 540) % 360 - 180) : 0;
    IS.applyEl(n, el, ctx); IS.commit(); IS.emit('geometry', el); mv.updateRect();
  }
  function initMoveable(){
    mv = new Moveable(stage, {
      target: null, container: stage, origin: false, edge: false,
      draggable: true, resizable: true, rotatable: true, snappable: true,
      throttleDrag: 0, throttleResize: 0, throttleRotate: 0, keepRatio: false,
      snapContainer: art, snapThreshold: 5, isDisplaySnapDigit: true, snapGap: false, maxSnapElementGuidelineDistance: 120,
      snapDirections: {left:true, top:true, right:true, bottom:true, center:true, middle:true},
      elementSnapDirections: {left:true, top:true, right:true, bottom:true, center:true, middle:true},
      verticalGuidelines: [0, IS.W / 2, IS.W], horizontalGuidelines: [0, 390, 780], elementGuidelines: [],
      rotationPosition: 'top', snapRotationThreshold: 4, snapRotationDegrees: [0, 45, 90, 135, 180, 225, 270, 315],
      renderDirections: ['nw','n','ne','w','e','sw','s','se'],
    });
    mv.on('drag', e => { e.target.style.left = e.left + 'px'; e.target.style.top = e.top + 'px'; })
      .on('dragEnd', e => { if(e.isDrag) readBack(e.target); })
      .on('resize', e => {
        const t = e.target; t.style.width = e.width + 'px';
        if(t.classList.contains('t') === false) t.style.height = e.height + 'px';
        t.style.left = e.drag.left + 'px'; t.style.top = e.drag.top + 'px';
        if(t.classList.contains('im') && /px 0px 0px$|0px 0px$/.test(t.style.borderRadius)) t.style.borderRadius = `${e.width/2}px ${e.width/2}px 0 0`;
      })
      .on('resizeEnd', e => { if(e.isDrag) readBack(e.target); })
      .on('rotate', e => { e.target.style.transform = e.transform; })
      .on('rotateEnd', e => { if(e.isDrag) readBack(e.target); });
  }

  /* ---------- pointer: select + immediate drag ---------- */
  art.addEventListener('mousedown', (e) => {
    if(e.button !== 0) return;
    const n = e.target.closest('.el');
    if(!n){ IS.select(null); return; }
    if(editing && editing.node === n) return;
    const el = IS.el(n.dataset.id); if(!el) return;
    IS.select(el.id);
    if(!el.lock && mv.target === n){ mv.waitToChangeTarget().then(() => mv.dragStart(e)); }
  });
  scroller.addEventListener('mousedown', (e) => { if(e.target === scroller || e.target === stage) IS.select(null); });

  /* double click: edit text / replace photo */
  stage.addEventListener('dblclick', (e) => {
    const el = S.sel && IS.el(S.sel); if(!el || el.lock) return;
    if(el.type === 'text' || el.type === 'button') startEdit(el);
    else if(el.type === 'image') IS.pickImage((a) => IS.update(el, {asset:a.id}, 'img'), {replace:true});
  });
  IS.startEdit = () => { const el = S.sel && IS.el(S.sel); if(el && (el.type === 'text' || el.type === 'button')) startEdit(el); };

  function startEdit(el){
    const n = nodes.get(el.id); if(!n || editing) return;
    editing = {node:n, id:el.id}; n._editing = true; mv.target = null;
    n.classList.add('editing');
    try{ n.contentEditable = 'plaintext-only'; }catch(_){}
    if(n.contentEditable !== 'plaintext-only') n.contentEditable = 'true';
    n.focus();
    const rg = document.createRange(); rg.selectNodeContents(n); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
    n.addEventListener('blur', onBlur); n.addEventListener('keydown', onKey);
  }
  function onKey(e){ if(e.key === 'Escape'){ e.preventDefault(); e.target.blur(); } else if(e.key === 'Enter' && editing && IS.el(editing.id).type === 'button'){ e.preventDefault(); e.target.blur(); } e.stopPropagation(); }
  function onBlur(){ endEdit(false); }
  function endEdit(){
    if(!editing) return; const {node, id} = editing; editing = null;
    node.removeEventListener('blur', onBlur); node.removeEventListener('keydown', onKey);
    node.contentEditable = 'false'; node.classList.remove('editing'); node._editing = false;
    const el = IS.el(id); if(el){ const t = node.innerText.replace(/\n$/, ''); if(t !== el.text){ el.text = t; IS.commit('text'); } IS.applyEl(node, el, ctx); }
    getSelection().removeAllRanges(); syncMoveable(); IS.emit('el', el);
  }
  IS.isEditing = () => !!editing;

  /* ---------- drop onto the artboard (palette items and image files) ---------- */
  const toArt = (e) => { const r = art.getBoundingClientRect(); return {x:(e.clientX - r.left) / S.zoom, y:(e.clientY - r.top) / S.zoom}; };
  art.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  art.addEventListener('drop', async (e) => {
    e.preventDefault(); const at = toArt(e);
    if(e.dataTransfer.files && e.dataTransfer.files.length){
      const list = await IS.uploadFiles(e.dataTransfer.files);
      list.forEach((a, i) => IS.addImage(a, {x:at.x + i * 16, y:at.y + i * 16}));
      return;
    }
    const raw = e.dataTransfer.getData('application/x-is'); if(!raw) return;
    try{ const p = JSON.parse(raw); IS.addPreset(p, at); }catch(_){}
  });
  // keep the browser from navigating away when a file is dropped elsewhere
  ['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => { if(e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); }));

  IS.initCanvas = () => { const st = document.createElement('style'); st.textContent = IS.BASE_CSS; document.head.append(st); initMoveable(); IS.renderAll(); IS.fit(); if(document.fonts) document.fonts.ready.then(() => IS.updateRect()); };
})();
