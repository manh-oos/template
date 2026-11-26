/* Invite Studio — state, history (undo/redo), persistence, asset library (IndexedDB) */
(function(){
  const LS_KEY = 'inviteStudio.doc.v2';
  const S = IS.state = { doc:null, sel:null, zoom:1, autoFit:true, saved:true };

  /* ---------- Asset library: blobs in IndexedDB, referenced by id from the document ---------- */
  const A = IS.assets = {
    map:new Map(), urls:new Map(), db:null, persistent:true,
    open(){ return new Promise((res) => {
      try{
        const r = indexedDB.open('invite-studio', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('assets', {keyPath:'id'});
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      }catch(e){ res(null); }
    });},
    async init(){
      this.db = await this.open();
      if(!this.db){ this.persistent = false; return; }
      const all = await new Promise(res => { const q = this.db.transaction('assets').objectStore('assets').getAll(); q.onsuccess = () => res(q.result||[]); q.onerror = () => res([]); });
      all.sort((a,b)=>b.created-a.created).forEach(a => this.map.set(a.id, a));
    },
    put(a){ if(!this.db) return Promise.resolve(); return new Promise(res => { const tx = this.db.transaction('assets','readwrite'); tx.objectStore('assets').put(a); tx.oncomplete = res; tx.onerror = res; }); },
    del(id){ if(!this.db) return Promise.resolve(); return new Promise(res => { const tx = this.db.transaction('assets','readwrite'); tx.objectStore('assets').delete(id); tx.oncomplete = res; tx.onerror = res; }); },
    get(id){ return this.map.get(id) || null; },
    url(id){ if(!id) return null; const a = this.map.get(id); if(!a) return null;
      if(!this.urls.has(id)) this.urls.set(id, URL.createObjectURL(a.blob)); return this.urls.get(id); },
    list(){ return [...this.map.values()].sort((a,b)=>b.created-a.created); },
    async remove(id){ await this.del(id); const u = this.urls.get(id); if(u) URL.revokeObjectURL(u); this.urls.delete(id); this.map.delete(id); },

    /* Validate + normalise an uploaded File. Photos are downscaled (max 1800px) and re-encoded so
       the design stays light; SVG/GIF are kept as-is. Throws Error with a user-friendly message. */
    async add(file){
      const MAX_IN = 25 * 1024 * 1024, MAX_PX = 1800;
      if(!file.type.startsWith('image/')) throw new Error(`"${file.name}" is not an image.`);
      if(file.size > MAX_IN) throw new Error(`"${file.name}" is larger than 25 MB.`);
      let blob = file, w = 0, h = 0;
      if(file.type === 'image/svg+xml'){
        if(file.size > 1.5*1024*1024) throw new Error('SVG is too large (max 1.5 MB).');
        const img = await decode(file).catch(()=>null);
        if(!img) throw new Error(`Could not read "${file.name}".`);
        w = img.naturalWidth || 200; h = img.naturalHeight || 200;
      } else if(file.type === 'image/gif'){
        if(file.size > 6*1024*1024) throw new Error('GIF is too large (max 6 MB).');
        const img = await decode(file).catch(()=>null);
        if(!img) throw new Error(`Could not read "${file.name}".`);
        w = img.naturalWidth; h = img.naturalHeight;
      } else {
        let bmp;
        try{ bmp = await createImageBitmap(file); }
        catch(e){ throw new Error(`Could not read "${file.name}". Use JPG, PNG, WebP, GIF or SVG (HEIC is not supported by browsers).`); }
        const k = Math.min(1, MAX_PX / Math.max(bmp.width, bmp.height));
        w = Math.max(1, Math.round(bmp.width * k)); h = Math.max(1, Math.round(bmp.height * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
        if(!keepAlpha){ ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h); }
        ctx.drawImage(bmp, 0, 0, w, h); bmp.close && bmp.close();
        const outType = keepAlpha ? 'image/png' : 'image/jpeg';
        blob = await new Promise(res => c.toBlob(res, outType, 0.88));
        if(!blob) throw new Error('Could not process this image.');
      }
      const a = {id:'a'+Math.random().toString(36).slice(2,9), name:file.name.replace(/\.[^.]+$/,'').slice(0,40)||'image', type:blob.type, blob, w, h, size:blob.size, created:Date.now()};
      this.map.set(a.id, a); await this.put(a); return a;
    },
  };
  function decode(file){ return new Promise((res, rej) => { const u = URL.createObjectURL(file); const i = new Image(); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => { URL.revokeObjectURL(u); rej(); }; i.src = u; }); }

  /* ---------- Document + history ---------- */
  const past = [], future = [];
  let prev = '', lastKey = null, lastT = 0, saveTimer = null;
  IS.history = { canUndo:()=>past.length>0, canRedo:()=>future.length>0 };

  IS.setDoc = (doc, {reset=true} = {}) => { S.doc = doc; if(reset){ past.length = 0; future.length = 0; lastKey = null; } prev = JSON.stringify(doc); };
  IS.el = (id) => S.doc.elements.find(e => e.id === id) || null;

  /* Call AFTER mutating S.doc. `key` merges rapid edits (typing, slider drags) into one undo step. */
  IS.commit = (key) => {
    const now = Date.now();
    if(!(key && key === lastKey && now - lastT < 800)){ past.push(prev); if(past.length > 120) past.shift(); }
    future.length = 0; prev = JSON.stringify(S.doc); lastKey = key || null; lastT = now;
    IS.scheduleSave(); IS.emit('history');
  };
  IS.undo = () => { if(!past.length) return; future.push(JSON.stringify(S.doc)); S.doc = JSON.parse(past.pop()); prev = JSON.stringify(S.doc); lastKey = null; afterJump(); };
  IS.redo = () => { if(!future.length) return; past.push(JSON.stringify(S.doc)); S.doc = JSON.parse(future.pop()); prev = JSON.stringify(S.doc); lastKey = null; afterJump(); };
  function afterJump(){ if(S.sel && !IS.el(S.sel)) S.sel = null; IS.scheduleSave(); IS.emit('doc'); }

  IS.scheduleSave = () => { S.saved = false; IS.emit('saving'); clearTimeout(saveTimer); saveTimer = setTimeout(IS.save, 350); };
  IS.save = () => { try{ localStorage.setItem(LS_KEY, JSON.stringify(S.doc)); S.saved = true; }catch(e){ S.saved = false; } IS.emit('saved'); };
  IS.loadSaved = () => { try{ const d = JSON.parse(localStorage.getItem(LS_KEY)); if(d && d.v === 2 && Array.isArray(d.elements) && d.page) return d; }catch(e){} return null; };

  /* tiny event bus */
  const L = {};
  IS.on = (n, f) => (L[n] = L[n] || []).push(f);
  IS.emit = (n, a) => (L[n] || []).forEach(f => f(a));
})();
