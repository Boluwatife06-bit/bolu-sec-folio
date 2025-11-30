// Consolidated site script: canvas particles, cursor, reveals, skills, projects, modal
(function(){
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  let width = window.innerWidth;
  let height = window.innerHeight;
  // performance: reduce node count on small screens
  const NODE_COUNT = Math.max(18, Math.floor((width*height)/120000));
  const nodes = [];
  let mouse = {x: width/2, y: height/2, active: false};

  function rand(min,max){return Math.random()*(max-min)+min}
  function initCanvas(){
    if(!ctx || !canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    nodes.length = 0;
    const count = Math.max(12, Math.min(NODE_COUNT, Math.floor((width*height)/120000)));
    for(let i=0;i<count;i++){
      nodes.push({x: rand(0,width), y: rand(0,height), vx: rand(-0.4,0.4), vy: rand(-0.4,0.4), r: rand(0.6,1.8)});
    }
  }

  function renderCanvas(){
    if(!ctx) return;
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle = 'rgba(2,6,10,0.35)'; ctx.fillRect(0,0,width,height);

    // connections
    for(let i=0;i<nodes.length;i++){
      const a = nodes[i];
      for(let j=i+1;j<nodes.length;j++){
        const b = nodes[j];
        const d = Math.hypot(a.x-b.x,a.y-b.y);
        if(d<150){
          const alpha = 1 - d/150;
          ctx.strokeStyle = `rgba(0,255,209,${alpha*0.08})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }

    for(const n of nodes){
      const d = Math.hypot(n.x-mouse.x, n.y-mouse.y);
      if(mouse.active && d<120){ n.x += (n.x-mouse.x)*0.01; n.y += (n.y-mouse.y)*0.01; }
      ctx.fillStyle = 'rgba(124,92,255,0.9)'; ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
    }

    for(const n of nodes){ n.x += n.vx; n.y += n.vy; if(n.x<0||n.x>width) n.vx *= -1; if(n.y<0||n.y>height) n.vy *= -1; }
    requestAnimationFrame(renderCanvas);
  }

  // Custom cursor
  const cursor = document.getElementById('custom-cursor');
  function onPointerMove(e){ if(cursor){ cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; } mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }
  window.addEventListener('pointermove', onPointerMove);

  // Hover scaling handled by JS class toggles (reliable across DOM)
  document.addEventListener('pointerover', (e)=>{ const t = e.target; if(!cursor) return; if(t.closest && (t.closest('a')||t.closest('button')||t.closest('.project-card')||t.closest('.icon')||t.closest('.btn'))){ cursor.classList.add('cursor-hover'); } });
  document.addEventListener('pointerout', (e)=>{ const t = e.target; if(!cursor) return; if(t.closest && (t.closest('a')||t.closest('button')||t.closest('.project-card')||t.closest('.icon')||t.closest('.btn'))){ cursor.classList.remove('cursor-hover'); } });

  // Reveal observer for general .reveal elements
  const revealObserver = new IntersectionObserver((entries)=>{ entries.forEach(entry=>{ if(entry.isIntersecting){ entry.target.classList.add('visible'); } }); },{threshold:0.08});
  document.querySelectorAll('.reveal').forEach(r=>revealObserver.observe(r));

  // Skill bars observer
  const skillBars = document.querySelectorAll('.skill-bar');
  if(skillBars.length){
    const skillObserver = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){ const el = entry.target; const v = el.dataset.value || 70; el.style.setProperty('--value', v + '%'); el.classList.add('show'); skillObserver.unobserve(el); }
      });
    },{threshold:0.22});
    skillBars.forEach(s=>skillObserver.observe(s));
  }

  // Projects: staggered reveal, click-to-open, keyboard support
  const projectCards = Array.from(document.querySelectorAll('.projects-grid .project-card'));
  if(projectCards.length){
    const projObs = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          const idx = projectCards.indexOf(entry.target) || 0;
          setTimeout(()=>{ entry.target.classList.add('visible'); }, idx*100);
          projObs.unobserve(entry.target);
        }
      });
    },{threshold:0.08});
    projectCards.forEach(pc=>projObs.observe(pc));

    // click anywhere on the card (except anchors) opens modal
    projectCards.forEach(pc=>{
      pc.addEventListener('click', (e)=>{
        const a = e.target.closest('a');
        if(a) return; // let anchors function
        openModalFromCard(pc);
      });
      pc.addEventListener('keydown', (e)=>{
        if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openModalFromCard(pc); }
      });
    });
  }

  // Modal logic with focus trap
  const modal = document.getElementById('project-modal');
  const modalPanel = modal ? modal.querySelector('.modal-panel') : null;
  const modalBackdrop = modal ? modal.querySelector('.modal-backdrop') : null;
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalTools = document.getElementById('modal-tools');
  const modalRepo = document.getElementById('modal-repo');
  let lastFocused = null;
  let modalOpen = false;

  function getFocusable(container){ if(!container) return []; return Array.from(container.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])')).filter(el=>!el.disabled && el.offsetParent!==null); }

  function handleModalKeydown(e){ if(!modalOpen) return; if(e.key==='Escape'){ e.preventDefault(); closeModal(); } if(e.key==='Tab'){ const list = getFocusable(modal); if(list.length===0) { e.preventDefault(); return; } const first = list[0]; const last = list[list.length-1]; if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } } }

  function openModalFromCard(card){ if(!modal) return; lastFocused = document.activeElement; const title = card.dataset.title || ''; const desc = card.dataset.desc || ''; const tools = (card.dataset.tools||'').split(',').map(t=>t.trim()).filter(Boolean); modalTitle.textContent = title; modalDesc.textContent = desc; modalTools.innerHTML=''; tools.forEach(t=>{ const el = document.createElement('span'); el.className='tool'; el.textContent = t; modalTools.appendChild(el); }); const repoLink = card.querySelector('.project-actions a'); modalRepo.href = repoLink ? repoLink.href : '#'; modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); modalOpen = true; document.body.style.overflow = 'hidden'; const closeBtn = modal.querySelector('.modal-close'); if(closeBtn) closeBtn.focus(); document.addEventListener('keydown', handleModalKeydown);
  }

  function closeModal(){ if(!modal) return; modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); modalOpen = false; document.body.style.overflow = ''; document.removeEventListener('keydown', handleModalKeydown); if(lastFocused && lastFocused.focus) lastFocused.focus(); }

  if(modal){
    modal.querySelectorAll('.modal-close').forEach(btn=>btn.addEventListener('click', closeModal));
    if(modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
  }

  // Floating decor motion
  const floats = Array.from(document.querySelectorAll('.floating-decor'));
  let floatPhase = 0;
  function animateFloats(){ floatPhase += 0.0016; floats.forEach((f,i)=>{ const x = Math.sin(floatPhase*(i+1))*16; const y = Math.cos(floatPhase*(i+1))*10; f.style.transform = `translate(${x}px, ${y}px)`; }); requestAnimationFrame(animateFloats); }
  if(floats.length) animateFloats();

  // Button micro interactions
  document.querySelectorAll('.btn').forEach(b=>{ b.addEventListener('pointerdown', ()=>{ try{ b.animate([{transform:'scale(.98)'},{transform:'scale(1)'}],{duration:220,fill:'forwards',easing:'cubic-bezier(.2,.9,.2,1)'}); }catch(e){} }); });

  // pointerdown node ripple
  window.addEventListener('pointerdown', (e)=>{ nodes.forEach(n=>{ const d = Math.hypot(n.x-e.clientX, n.y-e.clientY); if(d<160){ n.vx += (n.x-e.clientX)/130; n.vy += (n.y-e.clientY)/130; } }); });

  // init
  window.addEventListener('resize', ()=>{ initCanvas(); });
  initCanvas();
  renderCanvas();
})();
