/* EVA-4322 widget V0.3: standard, user-resizable, fullscreen, copy and clickable follow-ups. */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script || !script.dataset.tenant || !document.body) return;
  const tenant = script.dataset.tenant;
  const endpoint = new URL('/api/eva-4322?tenant=' + encodeURIComponent(tenant), script.src).href;
  const storageKey = 'eva4322:size:' + tenant + ':' + location.hostname;
  const host = document.createElement('div');
  const root = host.attachShadow({mode: 'closed'});
  const style = document.createElement('style');
  style.textContent = [
    ':host{all:initial}*{box-sizing:border-box}',
    '.launch{position:fixed;right:20px;bottom:20px;z-index:2147483000;background:#154a73;color:#fff;border:0;border-radius:28px;padding:13px 18px;cursor:pointer;font:600 14px system-ui}',
    '.panel{position:fixed;right:20px;bottom:75px;width:min(380px,calc(100vw - 24px));height:min(540px,calc(100dvh - 100px));min-width:320px;min-height:350px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 90px);resize:both;overflow:hidden;z-index:2147483000;background:#fff;color:#172739;border:1px solid #ccd5de;border-radius:14px;box-shadow:0 10px 35px #0003;font:14px system-ui;display:none;flex-direction:column}',
    '.panel.open{display:flex}.panel.fullscreen{inset:0!important;width:100vw!important;height:100dvh!important;min-width:0;min-height:0;max-width:none;max-height:none;resize:none;border:0;border-radius:0}',
    '.head{padding:10px 12px;background:#154a73;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0}',
    '.head strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.actions{display:flex;gap:4px}',
    'button{font:inherit;cursor:pointer}.actions button{background:transparent;border:1px solid #ffffff55;border-radius:7px;color:#fff;min-width:32px;min-height:32px}',
    '.messages{overflow:auto;flex:1;min-height:0;padding:12px;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.message{max-width:95%;margin:0 0 12px}.bubble{background:#f0f4f8;border-radius:11px;padding:10px;line-height:1.55}.message.user{margin-left:auto}.user .bubble{background:#dcebf8}',
    '.msg-tools{display:flex;justify-content:flex-end;margin-top:4px}.msg-tools button,.suggestions button{border:1px solid #cbd5df;background:#fff;color:#154a73;border-radius:8px;padding:5px 9px}',
    '.suggestions{padding:0 12px 8px;display:flex;gap:7px;flex-wrap:wrap;max-height:140px;overflow-y:auto}.suggestions button{text-align:left;font-size:12px}',
    '.form{padding:10px;display:flex;align-items:end;gap:7px;flex-shrink:0;border-top:1px solid #eee}',
    '.form textarea{flex:1;min-width:0;max-height:140px;min-height:42px;resize:vertical;padding:9px;border:1px solid #b8c4d0;border-radius:8px;font:14px system-ui}',
    '.form button{background:#154a73;color:white;border:0;border-radius:8px;padding:11px;min-height:42px}',
    '.hint{font-size:11px;color:#5b6470;padding:0 11px 10px}.resize-hint{font-size:11px;color:#5b6470}',
    'button:focus-visible,textarea:focus-visible{outline:3px solid #ffb84d;outline-offset:2px}',
    '@media(max-width:600px){.panel:not(.fullscreen){right:8px;bottom:70px;width:calc(100vw - 16px)!important;height:min(75dvh,640px)!important;min-width:0;max-width:none;resize:none}.launch{right:12px;bottom:12px}}',
    '.panel{--eva-bg:#efeae2;--eva-text:#172739;--eva-head:#075e54;--eva-user:#d9fdd3;--eva-bot:#fff;--eva-muted:#56616c;--eva-border:#cad1d8;--eva-input:#fff;--eva-tools:#fff;--eva-button:#075e54;--eva-pattern-opacity:.48;background:var(--eva-bg);color:var(--eva-text);border-color:var(--eva-border)}',
    '.panel[data-theme="dark"]{--eva-bg:#0b141a;--eva-text:#e9edef;--eva-head:#202c33;--eva-user:#005c4b;--eva-bot:#202c33;--eva-muted:#aab7c4;--eva-border:#344249;--eva-input:#2a3942;--eva-tools:#202c33;--eva-button:#005c4b;--eva-pattern-opacity:.22;color-scheme:dark}',
    '.head{background:var(--eva-head);color:#fff}',
    '.messages{position:relative;isolation:isolate;background-color:var(--eva-bg);background-image:var(--eva-pattern-url);background-size:230px 230px;background-repeat:repeat}',
    '.messages::before{content:"";position:absolute;inset:0;pointer-events:none;background:var(--eva-bg);opacity:calc(1 - var(--eva-pattern-opacity));z-index:-1}',
    '.bubble{background:var(--eva-bot);color:var(--eva-text)}.user .bubble{background:var(--eva-user);color:var(--eva-text)}',
    '.msg-tools button,.suggestions button{background:var(--eva-tools);color:var(--eva-text);border-color:var(--eva-border)}',
    '.form{background:var(--eva-bg);border-color:var(--eva-border)}.form textarea{background:var(--eva-input);color:var(--eva-text);border-color:var(--eva-border)}.form textarea::placeholder{color:var(--eva-muted)}',
    '.form button{background:var(--eva-button);color:#fff}.hint{background:var(--eva-bg);color:var(--eva-muted)}',
    '.panel .secondary{background:var(--eva-tools)!important;color:var(--eva-text)!important;border-color:var(--eva-border)!important}',
    '.panel .lead-form{background:var(--eva-bg)!important;border-color:var(--eva-border)!important}.panel .lead-form input:not([type="checkbox"]){background:var(--eva-input)!important;color:var(--eva-text)!important;border-color:var(--eva-border)!important}',
    '.panel .lead-form button[type="submit"]{background:var(--eva-button)!important;color:#fff!important}',
    '.panel .lead-form button[type="button"]{background:var(--eva-tools)!important;color:var(--eva-text)!important;border-color:var(--eva-border)!important}',
    '.panel .actions button[aria-pressed="true"]{background:#ffffff26;border-color:#fff}',
    '.panel .msg-tools button:focus-visible,.panel .suggestions button:focus-visible{outline:3px solid #ffb84d;outline-offset:2px}',
    '@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}'
  ].join('');
  root.appendChild(style);
  const launch = document.createElement('button');
  launch.className = 'launch';
  launch.type = 'button';
  launch.textContent = '💬 Asistent AI';
  launch.setAttribute('aria-label', 'Deschide asistentul AI');
  launch.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Asistent AI CAEN 4322');
  const head = document.createElement('header');
  head.className = 'head';
  const title = document.createElement('strong');
  title.textContent = script.dataset.name || 'Asistent AI · CAEN 4322';
  const actions = document.createElement('div');
  actions.className = 'actions';
  function action(label, glyph) {
    const b = document.createElement('button');
    b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); b.textContent = glyph;
    actions.appendChild(b); return b;
  }
  // Original, generic line-art background; no reuse of WhatsApp assets or user screenshot.
  const patternSvg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 230" width="230" height="230" fill="none" stroke="#89958b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+
   '<g opacity=".37"><circle cx="30" cy="33" r="18"/><circle cx="30" cy="33" r="7"/><path d="M68 17h27v22H68zM77 9v8M86 39v9M120 23l12 15 13-15-13-15zM168 24l4 9 10 3-10 4-4 9-4-9-10-4 10-3z"/>'+
   '<path d="M15 100c12-19 25-19 37 0-8 17-30 23-37 0zM30 80v12M71 86h37m-27-11v22m17-22v22M139 84l14-13 14 13v21h-28zM145 104V92h16v12"/>'+
   '<path d="M191 70c-12 13-12 22 0 30 13-8 13-17 0-30zM27 154h38v22H27zM38 176v13M54 176v13M82 155l12-12 12 12-12 12zM128 151c7-11 19-11 26 0s-4 25-13 34c-10-9-20-23-13-34z"/>'+
   '<circle cx="193" cy="162" r="17"/><path d="M193 150v24m-12-12h24M13 218l13-13 13 13m-13-13v-14M81 211h30M96 195v30M152 208c11-14 23-14 34 0-11 14-23 14-34 0z"/></g></svg>';
  panel.style.setProperty('--eva-pattern-url', 'url("data:image/svg+xml,' + encodeURIComponent(patternSvg) + '")');
  const themeKey = 'eva4322:theme:' + tenant + ':' + location.hostname;
  const themeButton = action('Activează tema întunecată', '☾');
  themeButton.setAttribute('aria-pressed', 'false');
  const applyTheme = mode => {
    const dark = mode === 'dark';
    panel.dataset.theme = dark ? 'dark' : 'light';
    themeButton.textContent = dark ? '☀' : '☾';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', dark ? 'Activează tema luminoasă' : 'Activează tema întunecată');
    themeButton.title = themeButton.getAttribute('aria-label');
  };
  let savedTheme = 'light';
  try { savedTheme = localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light'; } catch {}
  applyTheme(savedTheme);
  themeButton.addEventListener('click', () => {
    const next = panel.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(themeKey, next); } catch {}
  });

  const copyAll = action('Copiază conversația', '⧉');
  const expand = action('Ecran complet', '⛶');
  const close = action('Minimizează', '×');
  head.append(title, actions);
  const messages = document.createElement('div');
  messages.className = 'messages';
  messages.setAttribute('role', 'log');
  messages.setAttribute('aria-live', 'polite');
  const suggestions = document.createElement('div');
  suggestions.className = 'suggestions';
  suggestions.setAttribute('aria-label', 'Întrebări recomandate');
  const form = document.createElement('form');
  form.className = 'form';
  const input = document.createElement('textarea');
  input.rows = 2; input.maxLength = 1000; input.required = true;
  input.placeholder = 'Scrieți întrebarea…';
  input.setAttribute('aria-label', 'Întrebarea dumneavoastră');
  const send = document.createElement('button');
  send.type = 'submit'; send.textContent = 'Trimite';
  form.append(input, send);
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = 'Răspunsuri orientative · Trageți colțul ferestrei pentru redimensionare (desktop) · Vocea nu este activă.';
  panel.append(head, messages, suggestions, form, hint);
  root.append(launch, panel);
  document.body.append(host);

  let busy = false;
  const transcript = [];
  function copy(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }
    // Clipboard requires secure context or browser permission. No silently fake success.
    return Promise.reject(new Error('Clipboard unavailable'));
  }
  function notify(button, ok) {
    const old = button.textContent;
    button.textContent = ok ? 'Copiat ✓' : 'Copiere indisponibilă';
    setTimeout(() => {button.textContent = old;}, 1400);
  }
  function addMessage(text, role) {
    const value = String(text || '');
    transcript.push({role, text:value});
    const item = document.createElement('div');
    item.className = 'message ' + role;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = value;
    const tools = document.createElement('div');
    tools.className = 'msg-tools';
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Copiază';
    copyButton.setAttribute('aria-label', 'Copiază mesajul');
    copyButton.addEventListener('click', () => copy(value).then(() => notify(copyButton,true), () => notify(copyButton,false)));
    tools.append(copyButton);
    item.append(bubble, tools);
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
  }
  addMessage('Bună ziua! Cu ce vă pot ajuta?', 'assistant');
  copyAll.addEventListener('click', () => {
    const text = transcript.map(m => (m.role === 'user' ? 'Vizitator: ' : 'Asistent: ') + m.text).join('\n\n');
    copy(text).then(() => notify(copyAll,true), () => notify(copyAll,false));
  });
  const setOpen = open => {
    panel.classList.toggle('open', open);
    launch.setAttribute('aria-expanded', String(open));
    if (open) input.focus(); else launch.focus();
  };
  launch.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  close.addEventListener('click', () => setOpen(false));
  expand.addEventListener('click', () => {
    const full = panel.classList.toggle('fullscreen');
    expand.setAttribute('aria-label', full ? 'Revino la dimensiunea anterioară' : 'Ecran complet');
    expand.title = expand.getAttribute('aria-label');
    expand.textContent = full ? '▣' : '⛶';
    messages.scrollTop = messages.scrollHeight;
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      if (panel.classList.contains('fullscreen')) expand.click(); else setOpen(false);
    }
  });
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && Number.isFinite(saved.w) && Number.isFinite(saved.h)) {
      panel.style.width = Math.max(320, Math.min(saved.w, window.innerWidth - 24)) + 'px';
      panel.style.height = Math.max(350, Math.min(saved.h, window.innerHeight - 90)) + 'px';
    }
  } catch {}
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (!panel.classList.contains('open') || panel.classList.contains('fullscreen') || matchMedia('(max-width:600px)').matches) return;
      const w = Math.round(panel.getBoundingClientRect().width);
      const h = Math.round(panel.getBoundingClientRect().height);
      if (w < 320 || h < 350) return;
      try { localStorage.setItem(storageKey, JSON.stringify({w,h})); } catch {}
    }).observe(panel);
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault(); form.requestSubmit();
    }
  });
  const questionList = entries => {
    suggestions.replaceChildren();
    const used = new Set();
    for (const entry of (Array.isArray(entries) ? entries : []).slice(0, 4)) {
      const question = String(typeof entry === 'string' ? entry : entry?.question || '').trim();
      if (!question || question.length > 180 || used.has(question)) continue;
      used.add(question);
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = question;
      b.addEventListener('click', () => submitMessage(question));
      suggestions.append(b);
    }
  };
  async function submitMessage(text) {
    if (busy) return;
    const message = String(text || '').trim().slice(0, 1000);
    if (!message) return;
    busy = true; send.disabled = true; input.disabled = true;
    input.value = ''; questionList([]);
    addMessage(message, 'user');
    try {
      const res = await fetch(endpoint, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,history:transcript.slice(-9,-1).filter(m=>m.role==='user'||m.role==='assistant').map(m=>({role:m.role,content:m.text}))})});
      const data = await res.json();
      if (!res.ok) throw new Error('API error ' + res.status);
      addMessage(data.reply || 'Nu există un răspuns disponibil.', 'assistant');
      const proposed = Array.isArray(data.followups) ? data.followups : (data.followup ? [data.followup] : []);
      questionList(data.intent === 'siguranta' ? [] : proposed);
    } catch {
      addMessage('Serviciul nu este disponibil momentan. Încercați mai târziu.', 'assistant');
    } finally {
      busy = false; send.disabled = false; input.disabled = false; input.focus();
    }
  }
  form.addEventListener('submit', e => {e.preventDefault();submitMessage(input.value);});

  // Lead form is opened only by an explicit visitor action; no automatic personal-data capture.
  const offerButton = document.createElement('button');
  offerButton.type='button'; offerButton.textContent='Solicită ofertă';
  offerButton.className='secondary';
  offerButton.style.cssText='margin:0 12px 8px;align-self:flex-start;padding:8px 12px;border:1px solid #154a73;border-radius:8px;background:white;color:#154a73';
  panel.insertBefore(offerButton,form);
  let requestedService='';
  const leadForm=document.createElement('form');
  leadForm.className='lead-form';
  leadForm.style.cssText='display:none;padding:12px;overflow:auto;max-height:65%;border-top:1px solid #ddd;flex-direction:column;gap:9px;background:#f5f8fc';
  function makeField(label,type='text',required=true){
    const wrapper=document.createElement('label');wrapper.style.cssText='display:flex;flex-direction:column;gap:4px;font-size:12px';
    wrapper.textContent=label;
    const el=document.createElement('input');el.type=type;el.required=required;el.style.cssText='padding:8px;border:1px solid #aab8c7;border-radius:7px;font:14px system-ui';
    wrapper.append(el);leadForm.append(wrapper);return el;
  }
  const serviceField=makeField('Serviciu solicitat');
  const localityField=makeField('Localitate');
  const contactField=makeField('Contact (telefon sau email)');
  const consentBox=document.createElement('label');
  consentBox.style.cssText='display:flex;gap:8px;align-items:center;font-size:12px';
  const consent=document.createElement('input');consent.type='checkbox';consent.required=true;
  const consentText=document.createElement('span');
  consentText.textContent='Sunt de acord ca firma să mă contacteze pentru solicitarea transmisă.';
  consentBox.append(consent,consentText);leadForm.append(consentBox);
  const leadSubmit=document.createElement('button');leadSubmit.type='submit';leadSubmit.textContent='Trimite cererea';
  leadSubmit.style.cssText='background:#154a73;color:white;border:0;border-radius:8px;padding:11px;cursor:pointer';
  const leadCancel=document.createElement('button');leadCancel.type='button';leadCancel.textContent='Înapoi la conversație';
  leadCancel.style.cssText='background:white;color:#154a73;border:1px solid #154a73;border-radius:8px;padding:9px;cursor:pointer';
  leadForm.append(leadSubmit,leadCancel);panel.insertBefore(leadForm,form);
  const offerOpen=()=>{
    requestedService=requestedService||'Solicitare ofertă instalații';
    serviceField.value=requestedService;
    leadForm.style.display='flex';offerButton.style.display='none';form.style.display='none';
    serviceField.focus();
  };
  const offerClose=()=>{leadForm.style.display='none';offerButton.style.display='';form.style.display='flex';};
  offerButton.addEventListener('click',offerOpen);
  leadCancel.addEventListener('click',offerClose);
  const promoLabel=p=>p.discount_kind==='percent'
    ?p.discount_value+'% reducere'
    :p.discount_value+' '+p.currency+' reducere';
  leadForm.addEventListener('submit',async e=>{
    e.preventDefault();if(!consent.checked)return;
    leadSubmit.disabled=true;
    try{
      const leadEndpoint=new URL('/api/eva-4322-lead?tenant='+encodeURIComponent(tenant),script.src).href;
      const res=await fetch(leadEndpoint,{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({service:serviceField.value,locality:localityField.value,
          contact:contactField.value,consent:consent.checked})});
      const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'Cererea nu a fost salvată.');
      offerClose();requestedService='';consent.checked=false;contactField.value='';localityField.value='';
      addMessage('Vă mulțumim! Cererea de ofertă a fost înregistrată.\nReferință: '+data.reference+
        '\nServiciu: '+data.service+'\nLocalitate: '+data.locality+
        (data.promotion?'\n\n🎁 '+data.promotion.title+': '+promoLabel(data.promotion)+
         '\nCod: '+data.promotion.code+'\nValabil până la: '+data.promotion.valid_until+
         (data.promotion.terms?'\nCondiții: '+data.promotion.terms:'')+
         '\nReducerea va fi confirmată de firmă în oferta finală.':'')+
        '\n\nPuteți continua conversația cu EVA.','assistant');
      questionList([]);
    }catch(err){addMessage('Cererea nu a fost înregistrată: '+err.message,'assistant');}
    finally{leadSubmit.disabled=false;}
  });

})();