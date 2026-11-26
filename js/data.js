/* Invite Studio — static data: fonts, stickers, templates */
window.IS = window.IS || {};
IS.W = 390; // artboard width (px). Published page scales this to the viewport.

/* ---------- Fonts (files live in /fonts, loaded by css/fonts.css) ---------- */
IS.FONTS = [
  {name:'Cormorant Garamond', kind:'Serif',  fb:'serif',      w:[400,500,600], ital:true,  g:{w:[400,500,600], i:[400,500]}},
  {name:'Playfair Display',   kind:'Serif',  fb:'serif',      w:[400,600,700], ital:true,  g:{w:[400,600,700], i:[400]}},
  {name:'DM Serif Display',   kind:'Serif',  fb:'serif',      w:[400],         ital:true,  g:{w:[400], i:[400]}},
  {name:'Instrument Serif',   kind:'Serif',  fb:'serif',      w:[400],         ital:true,  g:{w:[400], i:[400]}},
  {name:'Pinyon Script',      kind:'Script', fb:'cursive',    w:[400],         ital:false, g:{w:[400], i:[]}},
  {name:'Great Vibes',        kind:'Script', fb:'cursive',    w:[400],         ital:false, g:{w:[400], i:[]}},
  {name:'Caveat',             kind:'Hand',   fb:'cursive',    w:[500,700],     ital:false, g:{w:[500,700], i:[]}},
  {name:'Jost',               kind:'Sans',   fb:'sans-serif', w:[400,500,600], ital:true,  g:{w:[400,500,600], i:[400]}},
  {name:'Montserrat',         kind:'Sans',   fb:'sans-serif', w:[400,500,600,700], ital:false, g:{w:[400,500,600,700], i:[]}},
  {name:'Space Grotesk',      kind:'Sans',   fb:'sans-serif', w:[400,500,700], ital:false, g:{w:[400,500,700], i:[]}},
  {name:'Bricolage Grotesque',kind:'Sans',   fb:'sans-serif', w:[400,500,700], ital:false, g:{w:[400,500,700], i:[]}},
  {name:'Instrument Sans',    kind:'Sans',   fb:'sans-serif', w:[400,500,600], ital:false, g:{w:[400,500,600], i:[]}},
];
IS.font = (n) => IS.FONTS.find(f => f.name === n) || IS.FONTS[0];
IS.fontCss = (n) => { const f = IS.font(n); return `'${f.name}',${f.fb}`; };

/* ---------- Decorative stickers (monochrome SVG, tinted with currentColor) ---------- */
(function(){
  const sprig = (() => {
    let s = '<path d="M30 136C29 96 31 52 30 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
    [112, 90, 68, 46, 28].forEach(y => {
      const L = `M30 ${y}C21 ${y-2} 12 ${y-10} 9 ${y-24}C20 ${y-21} 28 ${y-12} 30 ${y}Z`;
      const R = `M30 ${y}C39 ${y-2} 48 ${y-10} 51 ${y-24}C40 ${y-21} 32 ${y-12} 30 ${y}Z`;
      s += `<path d="${L}"/><path d="${R}"/>`;
    });
    s += '<path d="M30 12C25 6 26 -1 30 -4C34 -1 35 6 30 12Z" transform="translate(0 6)"/>';
    return s;
  })();
  const petals = [0,1,2,3,4,5].map(i => `<ellipse cx="24" cy="12.5" rx="5.4" ry="9.6" transform="rotate(${i*60} 24 24)"/>`).join('');
  IS.STICKERS = {
    sparkle:{label:'Sparkle', vb:'0 0 24 24', w:70, h:70, body:'<path d="M12 1.5c.9 5.9 4.6 9.6 10.5 10.5-5.9.9-9.6 4.6-10.5 10.5C11.1 16.6 7.4 12.9 1.5 12 7.4 11.1 11.1 7.4 12 1.5z"/>'},
    heart:  {label:'Heart',   vb:'0 0 24 24', w:64, h:64, body:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'},
    flower: {label:'Flower',  vb:'0 0 48 48', w:80, h:80, body:`<g opacity=".5">${petals}</g><circle cx="24" cy="24" r="4.4"/>`},
    sprig:  {label:'Sprig',   vb:'0 0 60 140', w:44, h:100, body:sprig},
    ring:   {label:'Rings',   vb:'0 0 48 32', w:84, h:56, body:'<g fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="18" cy="16" r="11"/><circle cx="30" cy="16" r="11"/></g>'},
    diamond:{label:'Divider', vb:'0 0 120 20', w:130, h:22, body:'<path d="M0 10H46M74 10H120" stroke="currentColor" stroke-width="1" fill="none"/><path d="M60 3.5 66.5 10 60 16.5 53.5 10Z"/>'},
    wave:   {label:'Wave',    vb:'0 0 120 16', w:110, h:15, body:'<path d="M2 8q9-12 18 0t18 0 18 0 18 0 18 0 18 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'},
  };
  IS.stickerSvg = (k) => { const s = IS.STICKERS[k] || IS.STICKERS.sparkle;
    return `<svg viewBox="${s.vb}" width="100%" height="100%" fill="currentColor" aria-hidden="true">${s.body}</svg>`; };
})();

/* ---------- Element defaults ---------- */
IS.uid = () => 'e' + Math.random().toString(36).slice(2, 9);
IS.DEFAULTS = {
  text:   {x:0,y:0,w:280,h:0, r:0,o:1,lock:false,hide:false, text:'Your text', font:'Jost', size:14, weight:400, italic:false, color:'#222222', align:'center', ls:0, lh:1.3, upper:false},
  image:  {x:0,y:0,w:200,h:200, r:0,o:1,lock:false,hide:false, asset:null, fit:'cover', mask:'square', rad:14},
  shape:  {x:0,y:0,w:120,h:80, r:0,o:1,lock:false,hide:false, shape:'rect', fill:'#cccccc', stroke:'#000000', sw:0, rad:0},
  button: {x:0,y:0,w:150,h:44, r:0,o:1,lock:false,hide:false, text:'RSVP', link:'', fill:'#222222', color:'#ffffff', font:'Jost', size:12, weight:500, ls:0.14, upper:true, rad:4},
  sticker:{x:0,y:0,w:70,h:70, r:0,o:1,lock:false,hide:false, kind:'sparkle', color:'#222222'},
};
IS.makeEl = (type, props) => Object.assign({id: IS.uid(), type}, IS.DEFAULTS[type], props || {});

/* ---------- Templates (artboard is 390 wide; coordinates in px) ---------- */
(function(){
  const t = (text, x, y, w, o) => ({type:'text', text, x, y, w, ...o});
  const sh = (x, y, w, h, o) => ({type:'shape', x, y, w, h, ...o});
  const st = (kind, x, y, w, h, color, o) => ({type:'sticker', kind, x, y, w, h, color, ...o});
  const img = (x, y, w, h, o) => ({type:'image', x, y, w, h, ...o});
  const btn = (text, x, y, w, h, o) => ({type:'button', text, x, y, w, h, ...o});

  const ivory = {
    id:'ivory', name:'Ivory Garden', tag:'Wedding · Classic',
    page:{bg:'#f4ede1', bgAsset:null, h:780, ink:'#33322b', accent:'#8a7355',
      fonts:{display:'Cormorant Garamond', body:'Jost', script:'Pinyon Script'},
      palette:['#33322b','#8a7355','#6b7350','#c9b79a','#f4ede1']},
    els:[
      sh(14,14,362,752,{fill:'transparent', stroke:'#b9a584', sw:1}),
      sh(20,20,350,740,{fill:'transparent', stroke:'#b9a584', sw:.5}),
      st('sprig',28,636,40,96,'#6b7350',{r:14}),
      st('sprig',322,636,40,96,'#6b7350',{r:-14}),
      t('TOGETHER WITH THEIR FAMILIES',45,66,300,{font:'Jost',size:10,weight:500,ls:.3,upper:true,color:'#8a7355'}),
      t('Amira',25,92,340,{font:'Pinyon Script',size:68,color:'#33322b',lh:1.1}),
      t('&',25,166,340,{font:'Cormorant Garamond',size:28,italic:true,color:'#8a7355'}),
      t('Daniyal',25,196,340,{font:'Pinyon Script',size:68,color:'#33322b',lh:1.1}),
      st('diamond',130,282,130,22,'#8a7355'),
      t('INVITE YOU TO CELEBRATE THEIR WEDDING',75,314,240,{font:'Jost',size:10,weight:500,ls:.3,upper:true,lh:1.9,color:'#33322b'}),
      img(100,362,190,226,{mask:'arch'}),
      t('20 · 06 · 2027',45,604,300,{font:'Cormorant Garamond',size:32,weight:500,color:'#33322b'}),
      t('The Garden Estate',45,650,300,{font:'Cormorant Garamond',size:22,italic:true,color:'#8a7355'}),
      t('MULTAN, PAKISTAN',45,682,300,{font:'Jost',size:10,weight:500,ls:.3,upper:true,color:'#33322b'}),
      btn('RSVP',135,712,120,38,{fill:'#33322b',color:'#f4ede1',font:'Jost',size:11,weight:500,ls:.24,rad:0,link:''}),
    ]};

  const party = {
    id:'party', name:'Rooftop Party', tag:'Birthday · Playful',
    page:{bg:'#f6e7d3', bgAsset:null, h:780, ink:'#1f1b16', accent:'#e8472b',
      fonts:{display:'DM Serif Display', body:'Bricolage Grotesque', script:'Caveat'},
      palette:['#1f1b16','#e8472b','#f2b134','#8fb996','#f6e7d3']},
    els:[
      sh(-70,-70,270,270,{shape:'circle',fill:'#f2b134'}),
      sh(300,252,62,62,{shape:'circle',fill:'#e8472b'}),
      st('sparkle',312,62,38,38,'#e8472b'),
      st('sparkle',262,116,20,20,'#1f1b16'),
      t("YOU'RE INVITED TO",32,66,220,{font:'Bricolage Grotesque',size:12,weight:700,ls:.16,upper:true,align:'left',color:'#1f1b16'}),
      t('Mira\nturns 30',32,92,330,{font:'DM Serif Display',size:72,lh:.92,align:'left',color:'#1f1b16'}),
      st('wave',32,262,92,13,'#e8472b'),
      sh(72,296,246,246,{shape:'circle',fill:'transparent',stroke:'#1f1b16',sw:1.5}),
      img(85,309,220,220,{mask:'circle'}),
      st('flower',282,478,60,60,'#e8472b',{r:14}),
      st('heart',44,492,38,38,'#f2b134',{r:-12}),
      t('Saturday, 14 August',32,556,330,{font:'Bricolage Grotesque',size:24,weight:700,align:'left',color:'#1f1b16'}),
      t('7:00 PM onwards',32,590,330,{font:'Bricolage Grotesque',size:15,weight:500,align:'left',color:'#e8472b'}),
      t('Cake, loud music and way too many snacks. Come celebrate another trip around the sun.',32,620,300,{font:'Bricolage Grotesque',size:13,lh:1.55,align:'left',color:'#1f1b16',o:.8}),
      btn('Save your spot',32,702,172,46,{fill:'#e8472b',color:'#ffffff',font:'Bricolage Grotesque',size:13,weight:700,ls:.02,upper:false,rad:23}),
      t('bring your dancing shoes',216,704,150,{font:'Caveat',size:22,weight:500,lh:1,align:'left',color:'#1f1b16',r:-4}),
    ]};

  const studio = {
    id:'studio', name:'Studio Night', tag:'Event · Modern dark',
    page:{bg:'#0e1311', bgAsset:null, h:780, ink:'#ece9df', accent:'#c8f169',
      fonts:{display:'Instrument Serif', body:'Space Grotesk', script:'Instrument Serif'},
      palette:['#ece9df','#c8f169','#8b948d','#1d2420','#0e1311']},
    els:[
      t('VOL. 04',28,34,150,{font:'Space Grotesk',size:11,weight:500,ls:.2,upper:true,align:'left',color:'#8b948d'}),
      t('MULTAN · 2027',212,34,150,{font:'Space Grotesk',size:11,weight:500,ls:.2,upper:true,align:'right',color:'#8b948d'}),
      sh(28,58,334,1,{fill:'#2a332e'}),
      st('sparkle',306,190,34,34,'#c8f169'),
      t('The Creative',28,92,334,{font:'Instrument Serif',size:72,lh:.95,align:'left',color:'#ece9df'}),
      t('Meetup',28,158,334,{font:'Instrument Serif',size:72,lh:.95,italic:true,align:'left',color:'#c8f169'}),
      sh(28,250,200,30,{fill:'transparent',stroke:'#c8f169',sw:1,rad:15}),
      t('FREE ENTRY · LIMITED SEATS',28,258,200,{font:'Space Grotesk',size:10,weight:500,ls:.12,upper:true,color:'#c8f169'}),
      img(28,306,334,210,{mask:'rounded',rad:14}),
      sh(28,544,334,1,{fill:'#2a332e'}),
      t('DATE',28,558,150,{font:'Space Grotesk',size:10,weight:500,ls:.2,upper:true,align:'left',color:'#8b948d'}),
      t('08 Oct 2027',28,576,170,{font:'Instrument Serif',size:26,align:'left',color:'#ece9df'}),
      t('TIME',212,558,150,{font:'Space Grotesk',size:10,weight:500,ls:.2,upper:true,align:'left',color:'#8b948d'}),
      t('6:30 PM',212,576,150,{font:'Instrument Serif',size:26,align:'left',color:'#ece9df'}),
      t('VENUE',28,626,150,{font:'Space Grotesk',size:10,weight:500,ls:.2,upper:true,align:'left',color:'#8b948d'}),
      t('The Studio Hall, Multan',28,644,334,{font:'Instrument Serif',size:26,align:'left',color:'#ece9df'}),
      btn('Get your ticket  →',28,704,334,50,{fill:'#c8f169',color:'#0e1311',font:'Space Grotesk',size:13,weight:700,ls:.08,upper:true,rad:25}),
    ]};

  IS.TEMPLATES = [ivory, party, studio];
  IS.buildTemplate = (tpl) => ({
    v:2, name: tpl.name, template: tpl.id,
    page: JSON.parse(JSON.stringify(tpl.page)),
    elements: tpl.els.map(e => IS.makeEl(e.type, JSON.parse(JSON.stringify(e)))),
  });
})();
