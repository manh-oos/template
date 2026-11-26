/* Invite Studio — app shell: topbar, dialogs, keyboard, preview, export, boot */
(function(){
  const S = IS.state, $ = (s) => document.querySelector(s);
  const h = IS.h, ico = IS.ico;

  /* ---------- toast ---------- */
  let tt; const toastEl = $('#toast');
  IS.toast = (msg, kind) => { toastEl.textContent = msg; toastEl.className = 'toast show ' + (kind || ''); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('show'), kind === 'error' ? 4200 : 2000); };

  /* ---------- confirm dialog ---------- */
  const dlg = $('#dlg');
  IS.confirm = (title, msg, ok, danger) => new Promise(res => {
    dlg.replaceChildren(h('h3', {}, title), h('p', {}, msg), h('div', {class:'dlg-actions'},
      h('button', {class:'btn', onclick:() => { dlg.close(); res(false); }}, 'Cancel'),
      h('button', {class:'btn ' + (danger ? 'danger-solid' : 'primary'), onclick:() => { dlg.close(); res(true); }}, ok || 'OK')));
    dlg.onclose = () => res(false); dlg.showModal();
  });

  /* ---------- topbar ---------- */
  function refreshTop(){
    $('#undo').disabled = !IS.history.canUndo(); $('#redo').disabled = !IS.history.canRedo();
  }
  IS.on('history', refreshTop); IS.on('doc', refreshTop); IS.on('structure', refreshTop);
  IS.on('saving', () => { $('#saveState').textContent = 'Saving…'; });
  IS.on('saved', () => { $('#saveState').textContent = 'Saved in this browser'; });
  $('#undo').onclick = () => IS.undo(); $('#redo').onclick = () => IS.redo();
  $('#zoomIn').onclick = () => IS.setZoom(S.zoom + .1, true); $('#zoomOut').onclick = () => IS.setZoom(S.zoom - .1, true); $('#zoomFit').onclick = () => IS.fit();
  $('#docName').addEventListener('input', e => { S.doc.name = e.target.value; IS.commit('name'); });
  document.querySelectorAll('.rail button').forEach(b => b.onclick = () => IS.setTab(b.dataset.tab));
  scrollerWheel();
  function scrollerWheel(){ $('#scroller').addEventListener('wheel', e => { if(e.ctrlKey || e.metaKey){ e.preventDefault(); IS.setZoom(S.zoom * (e.deltaY < 0 ? 1.08 : 0.92), true); } }, {passive:false}); }

  /* ---------- export + preview ---------- */
  const slug = (s) => (s || 'invitation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'invitation';
  $('#exportBtn').onclick = async () => {
    const b = $('#exportBtn'); b.disabled = true;
    try{ const html = await IS.buildExport(S.doc); const url = URL.createObjectURL(new Blob([html], {type:'text/html'}));
      const a = document.createElement('a'); a.href = url; a.download = slug(S.doc.name) + '.html'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      IS.toast('Exported ' + slug(S.doc.name) + '.html'); }
    catch(e){ IS.toast('Export failed', 'error'); console.error(e); }
    b.disabled = false;
  };
  const pv = $('#preview'), frame = $('#pvFrame');
  async function openPreview(){
    if(IS.isEditing()) document.activeElement.blur();
    pv.classList.add('open'); document.body.classList.add('pv-open');
    frame.srcdoc = await IS.buildExport(S.doc); setDevice(pv.dataset.dev || 'phone');
  }
  function closePreview(){ pv.classList.remove('open'); document.body.classList.remove('pv-open'); frame.srcdoc = ''; }
  function setDevice(d){ pv.dataset.dev = d; pv.querySelectorAll('.devs button').forEach(b => b.classList.toggle('on', b.dataset.dev === d)); }
  $('#previewBtn').onclick = openPreview; $('#pvClose').onclick = closePreview;
  pv.querySelectorAll('.devs button').forEach(b => b.onclick = () => setDevice(b.dataset.dev));

  /* ---------- keyboard ---------- */
  const typing = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.tagName === 'SELECT');
  document.addEventListener('keydown', (e) => {
    if(pv.classList.contains('open')){ if(e.key === 'Escape') closePreview(); return; }
    if(dlg.open) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if(typing(e.target)){ if(e.key === 'Escape' && e.target.blur) e.target.blur(); return; }
    if(mod && k === 'z'){ e.preventDefault(); e.shiftKey ? IS.redo() : IS.undo(); return; }
    if(mod && k === 'y'){ e.preventDefault(); IS.redo(); return; }
    const el = S.sel && IS.el(S.sel);
    if(mod && k === 'd'){ e.preventDefault(); el && IS.duplicate(el.id); return; }
    if(mod && (k === '=' || k === '+')){ e.preventDefault(); IS.setZoom(S.zoom + .1, true); return; }
    if(mod && k === '-'){ e.preventDefault(); IS.setZoom(S.zoom - .1, true); return; }
    if(mod && k === '0'){ e.preventDefault(); IS.fit(); return; }
    if(!el) return;
    if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); IS.removeEl(el.id); }
    else if(e.key === 'Escape'){ IS.select(null); }
    else if(e.key === 'Enter' && (el.type === 'text' || el.type === 'button')){ e.preventDefault(); IS.startEdit(); }
    else if(e.key.startsWith('Arrow') && !el.lock){
      e.preventDefault(); const d = e.shiftKey ? 10 : 1;
      const n = IS.nodes.get(el.id); const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
      el.x = Math.round((el.x + dx) * 10) / 10; el.y = Math.round((el.y + dy) * 10) / 10; IS.applyEl(n, el, IS.ctx); IS.updateRect(); IS.commit('nudge'); IS.emit('geometry', el);
    }
  });

  /* paste an image from the clipboard */
  document.addEventListener('paste', async (e) => {
    if(typing(e.target)) return;
    const files = [...(e.clipboardData ? e.clipboardData.files : [])].filter(f => f.type.startsWith('image/'));
    if(!files.length) return; e.preventDefault();
    (await IS.uploadFiles(files)).forEach((a, i) => IS.addImage(a, i ? {x:IS.W/2 + i*16, y:IS.visibleY() + 110 + i*16} : undefined));
  });

  /* ---------- boot ---------- */
  (async function boot(){
    await IS.assets.init();
    const saved = IS.loadSaved();
    const doc = saved || IS.buildTemplate(IS.TEMPLATES[0]);
    // drop references to images that no longer exist in the library
    doc.elements.forEach(e => { if(e.asset && !IS.assets.get(e.asset)) e.asset = null; });
    if(doc.page.bgAsset && !IS.assets.get(doc.page.bgAsset)) doc.page.bgAsset = null;
    IS.setDoc(doc);
    $('#docName').value = doc.name;
    IS.initCanvas(); IS.initPanels(); refreshTop();
    $('#saveState').textContent = saved ? 'Draft restored' : 'Ready';
    document.body.classList.add('ready');
  })();
})();
IS.on('doc', () => { const n = document.querySelector('#docName'); if(n) n.value = IS.state.doc.name; });
