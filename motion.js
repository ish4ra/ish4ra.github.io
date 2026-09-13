'use strict';
(() => {
  const q = s => document.querySelector(s);
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (n,a=0,b=1) => Math.max(a,Math.min(b,n));
  const cards = [...document.querySelectorAll('.project-card')];
  let paused = false, explicitMotion = true;
try { localStorage.removeItem('ishara-motion'); } catch {}
  function animate(el,frames,options){return !paused && el.animate ? el.animate(frames,options) : null;}
  function syncMotion(){
    root.classList.toggle('motion-paused',paused);
    q('#motion-toggle').textContent=paused?'Play motion':'Pause motion';
    q('#motion-toggle').setAttribute('aria-pressed',String(paused));
    q('#motion-toggle').setAttribute('aria-label',paused?'Play website animations':'Pause website animations');
    if(paused)document.getAnimations().filter(a=>!(a instanceof CSSAnimation)).forEach(a=>a.finish());
  }
  syncMotion();

  // This intro is visible immediately: giant name, live 3D geometry, moving type strip.
  document.querySelectorAll('.name-line>span').forEach((line,i)=>animate(line,[
    {transform:`translate3d(${i?'-12%':'7%'},120%,0) rotate(${i?-4:4}deg)`,opacity:0},
    {transform:'translate3d(0,0,0) rotate(0)',opacity:1}
  ],{duration:1500,delay:120+i*180,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  animate(q('.hero-bottom'),[{opacity:0,transform:'translateY(35px)'},{opacity:1,transform:'translateY(0)'}],{duration:900,delay:600,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});

  // Real-time perspective projection of a deforming parametric surface.
  const canvas=q('#hero-canvas'), stage=q('.hero-stage'), ctx=canvas.getContext('2d');
  let width=0,height=0,raf=0,last=0,time=0,visible=true,accent='198,243,123',dark=true;
  let pointer={x:0,y:0},follow={x:0,y:0},shape=0,weights=[1,0,0],heldUntil=0,cycle=0;
  const rotation={x:0,y:0,vx:0,vy:0};
  let dragging=false,dragPointer=null,dragLast={x:0,y:0};
  const labels=['01 / ORBIT','02 / SPHERE','03 / WAVE'];
  const forms=[...document.querySelectorAll('[data-form]')];
  function chooseForm(n,manual=false){
    shape=n; if(manual)heldUntil=time+14000;
    forms.forEach((button,i)=>{button.classList.toggle('active',i===n);button.setAttribute('aria-pressed',String(i===n));});
    q('#form-label').textContent=labels[n];
    if(paused){weights=[0,0,0];weights[n]=1;draw(0);}
  }
  forms.forEach((button,i)=>button.addEventListener('click',()=>chooseForm(i,true)));
  function palette(){dark=root.dataset.theme!=='light';accent=dark?'198,243,123':'65,105,24';if(paused)draw(0);}
  new MutationObserver(palette).observe(root,{attributes:true,attributeFilter:['data-theme']});
  palette();
  function resizeCanvas(){
    if(!ctx)return;
    width=canvas.clientWidth;height=canvas.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,1.75);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    stage.classList.add('canvas-ready');draw(0);start();
  }
  const cols=64,rows=28;
  function project(x,y,z,rx,ry,cx,cy,radius,rz=0){
    const ax=x*Math.cos(ry)+z*Math.sin(ry),az=-x*Math.sin(ry)+z*Math.cos(ry);
    const ay=y*Math.cos(rx)-az*Math.sin(rx),depth=y*Math.sin(rx)+az*Math.cos(rx);
    const p=3.7/(3.7-depth);
    const sx=ax*Math.cos(rz)-ay*Math.sin(rz),sy=ax*Math.sin(rz)+ay*Math.cos(rz);
    return {x:cx+sx*radius*p,y:cy+sy*radius*p,z:depth,p};
  }
  function draw(dt){
    if(!ctx||!width||!height)return;
    ctx.clearRect(0,0,width,height);
    const mobile=innerWidth<=600;
    const cx=width*(mobile?.51:.69),cy=height*(mobile?.61:.55),radius=Math.min(width*(mobile?.29:.24),height*(mobile?.23:.35));
    if(paused){follow.x=pointer.x;follow.y=pointer.y;}
    else {const ease=1-Math.pow(.82,dt||1);follow.x+=(pointer.x-follow.x)*ease;follow.y+=(pointer.y-follow.y)*ease;}
    if(dt&&!dragging&&!paused){
      rotation.x+=rotation.vx*dt;rotation.y+=rotation.vy*dt;
      rotation.vx*=Math.pow(.94,dt);rotation.vy*=Math.pow(.94,dt);
    }
    // A torus is rotationally symmetric around Y. Tilt on X and Z as well so rotation is visible.
    const t=time*.00045,ry=t*.8+follow.x*5.8+rotation.y;
    const rx=.65+Math.sin(t*.9)*.85-follow.y*4.8+rotation.x;
    const rz=Math.sin(t*.65)*.45+follow.x*.5;
    if(dt)for(let i=0;i<3;i++)weights[i]+=((i===shape?1:0)-weights[i])*(1-Math.pow(.92,dt));
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,radius*1.8);
    glow.addColorStop(0,`rgba(${accent},${dark?.13:.05})`);glow.addColorStop(1,`rgba(${accent},0)`);
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    // Perspective grid under the floating surface.
    ctx.strokeStyle=`rgba(${accent},.085)`;ctx.lineWidth=.6;
    for(let j=0;j<9;j++){
      const y=cy+radius*.78+j*j*2.5;ctx.beginPath();ctx.moveTo(cx-radius*2.2,y);ctx.lineTo(cx+radius*2.2,y);ctx.stroke();
    }
    for(let j=-6;j<=6;j++){ctx.beginPath();ctx.moveTo(cx+j*radius*.13,cy+radius*.78);ctx.lineTo(cx+j*radius*.6,height);ctx.stroke();}
    const points=[];
    for(let i=0;i<=cols;i++){
      const u=i/cols*Math.PI*2;
      for(let j=0;j<=rows;j++){
        const v=j/rows*Math.PI*2,lat=j/rows*Math.PI;
        const tor=[(1+.34*Math.cos(v))*Math.cos(u),.34*Math.sin(v),(1+.34*Math.cos(v))*Math.sin(u)];
        const sphere=[1.15*Math.sin(lat)*Math.cos(u),1.15*Math.cos(lat),1.15*Math.sin(lat)*Math.sin(u)];
        const wave=[(i/cols-.5)*2.7,(j/rows-.5)*1.8,.38*Math.sin(u*1.5+t*5)*Math.cos(v*.75+t*3)];
        let x=0,y=0,z=0;for(let k=0;k<3;k++){const p=[tor,sphere,wave][k];x+=p[0]*weights[k];y+=p[1]*weights[k];z+=p[2]*weights[k];}
        points.push(project(x,y,z,rx,ry,cx,cy,radius,rz));
      }
    }
    // Depth-sorted line segments keep the back of the sculpture quieter than its front.
    const lines=[];
    for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++){
      const n=i*(rows+1)+j,a=points[n];
      if(j<rows&&i%2===0){const b=points[n+1];lines.push({a,b,z:(a.z+b.z)/2});}
      if(i<cols&&j%2===0){const b=points[n+rows+1];lines.push({a,b,z:(a.z+b.z)/2});}
    }
    lines.sort((a,b)=>a.z-b.z);
    for(const l of lines){const alpha=clamp((l.z+1.8)/3.4,.12,.95);ctx.strokeStyle=`rgba(${accent},${alpha})`;ctx.lineWidth=l.z>.65?1.05:.55;ctx.beginPath();ctx.moveTo(l.a.x,l.a.y);ctx.lineTo(l.b.x,l.b.y);ctx.stroke();}
    // Bright nodes travel along the surface, giving motion an obvious focal point.
    for(let k=0;k<7;k++){
      const index=(Math.floor(time*.015+k*241))%points.length,p=points[index];
      ctx.fillStyle=`rgba(${accent},.95)`;ctx.shadowColor=`rgb(${accent})`;ctx.shadowBlur=12;
      ctx.beginPath();ctx.arc(p.x,p.y,2.3*p.p,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowBlur=0;
  }
  function tick(now){
    raf=0;if(paused||document.hidden||!visible)return;
    const elapsed=Math.min(now-last,40);last=now;time+=elapsed;
    const next=Math.floor(time/6500)%3;
    if(time>heldUntil&&next!==cycle){cycle=next;chooseForm(next);}
    draw(elapsed/16.667);raf=requestAnimationFrame(tick);
  }
  function start(){if(ctx&&!raf&&!paused&&!document.hidden&&visible){last=performance.now();raf=requestAnimationFrame(tick);}}
  function stop(){cancelAnimationFrame(raf);raf=0;}
  function pointerPosition(e){
    const r=stage.getBoundingClientRect();
    return {x:clamp((e.clientX-r.left)/r.width,0,1)-.5,y:clamp((e.clientY-r.top)/r.height,0,1)-.5};
  }
  function directRender(){if(paused){draw(0);}else start();}
  stage.addEventListener('pointerdown',e=>{
    if(e.target.closest('button,a')||e.button!==0)return;
    dragging=true;dragPointer=e.pointerId;dragLast={x:e.clientX,y:e.clientY};
    rotation.vx=0;rotation.vy=0;stage.classList.add('is-dragging');
    stage.setPointerCapture(e.pointerId);stage.focus({preventScroll:true});
  });
  stage.addEventListener('pointermove',e=>{
    if(dragging&&e.pointerId===dragPointer){
      const dx=e.clientX-dragLast.x,dy=e.clientY-dragLast.y;
      rotation.y+=dx*.018;rotation.x+=dy*.018;
      rotation.vy=clamp(dx*.018,-.24,.24);rotation.vx=clamp(dy*.018,-.24,.24);
      dragLast={x:e.clientX,y:e.clientY};
    }else if(e.pointerType!=='touch'){pointer=pointerPosition(e);}
    directRender();
  });
  function endDrag(e){
    if(e.pointerId!==dragPointer)return;
    dragging=false;dragPointer=null;stage.classList.remove('is-dragging');
    if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
    if(paused||e.type==='pointercancel'){rotation.vx=0;rotation.vy=0;}
    directRender();
  }
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
  stage.addEventListener('lostpointercapture',e=>{if(dragging)endDrag(e);});
  stage.addEventListener('pointerleave',()=>{if(!dragging){pointer={x:0,y:0};directRender();}});
  stage.addEventListener('keydown',e=>{
    if(e.target!==stage)return;
    const turns={ArrowLeft:[0,-.35],ArrowRight:[0,.35],ArrowUp:[-.35,0],ArrowDown:[.35,0]};
    if(e.key==='Home'){e.preventDefault();rotation.x=rotation.y=rotation.vx=rotation.vy=0;pointer={x:0,y:0};directRender();}
    else if(turns[e.key]){e.preventDefault();rotation.x+=turns[e.key][0];rotation.y+=turns[e.key][1];directRender();}
  });
  if('ResizeObserver'in window)new ResizeObserver(resizeCanvas).observe(canvas);else{resizeCanvas();addEventListener('resize',resizeCanvas);}
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?start():stop();}).observe(stage);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());

  // A horizontal exhibition driven by ordinary vertical scrolling on large screens.
  // Smaller screens retain a native, swipeable gallery, with previous/next controls.
  const work=q('#work'),workStage=q('.work-stage'),track=q('.project-grid'),viewport=q('.work-window');
  let horizontal=false,travel=0,startY=0,active=0,scrollFrame=0;
  function layout(){
    horizontal=innerWidth>900&&innerHeight>700&&!paused;
    root.classList.toggle('horizontal-work',horizontal);
    track.style.transform='';work.style.height='';viewport.scrollLeft=0;
    if(horizontal){
      travel=cards[cards.length-1].offsetLeft-cards[0].offsetLeft;
      work.style.height=`${85+workStage.offsetHeight+travel}px`;
      startY=work.getBoundingClientRect().top+scrollY+85-83;
    }
    updateScroll();
  }
  function setActive(n){
    active=clamp(n,0,cards.length-1);q('#work-current').textContent=String(active+1).padStart(2,'0');
    q('#project-prev').disabled=active===0;q('#project-next').disabled=active===cards.length-1;
  }
  function go(n){
    n=clamp(n,0,cards.length-1);
    const offset=cards[n].offsetLeft-cards[0].offsetLeft;
    if(horizontal)window.scrollTo({top:startY+offset,behavior:paused?'instant':'smooth'});
    else viewport.scrollTo({left:offset,behavior:paused?'instant':'smooth'});
  }
  q('#project-prev').addEventListener('click',()=>go(active-1));q('#project-next').addEventListener('click',()=>go(active+1));
  cards.forEach((card,i)=>card.addEventListener('focus',()=>{if(card.matches(':focus-visible'))go(i);}));
  viewport.addEventListener('scroll',()=>{if(!horizontal){const step=cards[1].offsetLeft-cards[0].offsetLeft;setActive(Math.round(viewport.scrollLeft/step));q('.work-meter i').style.transform=`translateX(${active*100}%)`;}},{passive:true});
  const copy=q('.reading-copy');
  const copyText=copy.textContent;
  copy.replaceChildren(...copyText.split(/(\s+)/).map(word=>{if(!word.trim())return document.createTextNode(word);const span=document.createElement('span');span.className='reading-word';span.textContent=word;return span;}));
  const words=[...copy.querySelectorAll('.reading-word')];
  const timeline=q('.experience-list');
  function updateScroll(){
    scrollFrame=0;
    if(horizontal){
      const x=clamp(scrollY-startY,0,travel);track.style.transform=`translate3d(${-x}px,0,0)`;
      const step=cards[1].offsetLeft-cards[0].offsetLeft;setActive(Math.round(x/step));
      q('.work-meter i').style.transform=`translateX(${travel?x/travel*300:0}%)`;
      cards.forEach(card=>{const center=card.offsetLeft-x;card.style.setProperty('--cover-shift',`${clamp(-center/innerWidth,-1,1)*70}px`);});
    }
    const rect=copy.getBoundingClientRect(),progress=clamp((innerHeight*.9-rect.top)/(innerHeight*.6));
    words.forEach((word,i)=>word.classList.toggle('lit',paused||i/words.length<progress));
    const tr=timeline.getBoundingClientRect();timeline.style.setProperty('--timeline',`${clamp((innerHeight*.7-tr.top)/tr.height)*100}%`);
    timeline.querySelectorAll('.experience').forEach(el=>el.classList.toggle('passed',el.getBoundingClientRect().top<innerHeight*.7));
    const contact=q('.contact'),cr=contact.getBoundingClientRect();
    if(cr.top<innerHeight&&cr.bottom>0){
      const offset=paused?0:clamp((cr.top-innerHeight*.35)/innerHeight,-1,1)*55;
      q('.contact h2>span').style.transform=`translateX(${offset}px)`;
      q('.contact h2>em').style.display='inline-block';q('.contact h2>em').style.transform=`translateX(${-offset}px)`;
    }
    const heroRect=stage.getBoundingClientRect();
    if(!paused&&heroRect.bottom>0){
      const p=clamp(-heroRect.top/height,0,1);q('.name-first').style.transform=`translateX(${-p*90}px)`;q('.name-last').style.transform=`translateX(${p*90}px)`;
    }else if(paused){q('.name-first').style.transform='';q('.name-last').style.transform='';}
  }
  function requestScroll(){if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);}
  addEventListener('scroll',requestScroll,{passive:true});addEventListener('resize',layout);
  document.fonts?.ready.then(layout);layout();
  q('#motion-toggle').addEventListener('click',()=>{
    paused=!paused;explicitMotion=true;try{localStorage.setItem('ishara-motion',paused?'off':'on');}catch{}
    const wasInWork=work.getBoundingClientRect().top<83&&work.getBoundingClientRect().bottom>innerHeight*.5;
    const keep=active;syncMotion();stop();layout();if(wasInWork)go(keep);paused?draw(0):start();
  });
  reduce.addEventListener('change',()=>{if(explicitMotion)return;paused=reduce.matches;syncMotion();stop();layout();paused?draw(0):start();});

  // Large type and content enter with a deliberate stagger, without hiding fallback content.
  if('IntersectionObserver'in window){
    const obs=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      animate(entry.target,[{opacity:0,transform:'translateY(65px) rotate(1.5deg)'},{opacity:1,transform:'translateY(0) rotate(0)'}],{duration:1000,easing:'cubic-bezier(.16,1,.3,1)'});obs.unobserve(entry.target);
    }),{threshold:.12});
    document.querySelectorAll('.about h2,.toolbox,.experience,.contact h2,.archive-heading,.archive-card,.more-note,.impact-heading,.social-grid>a,.tool-group').forEach(el=>obs.observe(el));
  }
  const cursor=q('.project-cursor');
  cards.forEach(card=>{
    card.addEventListener('pointermove',e=>{if(!fine.matches||paused)return;cursor.style.transform=`translate(${e.clientX+18}px,${e.clientY-42}px)`;cursor.classList.add('active');});
    card.addEventListener('pointerleave',()=>cursor.classList.remove('active'));card.addEventListener('click',()=>cursor.classList.remove('active'));
  });
  document.querySelectorAll('.button').forEach(button=>{
    button.addEventListener('pointermove',e=>{if(!fine.matches||paused)return;const r=button.getBoundingClientRect();button.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.13}px,${(e.clientY-r.top-r.height/2)*.2}px)`;});
    button.addEventListener('pointerleave',()=>{button.style.transform='';});
  });
  const dialog=q('#project-dialog');
  document.querySelectorAll('[data-project]').forEach(card=>card.addEventListener('click',()=>{
    const art=card.querySelector('.project-art')||card,visual=q('#dialog-visual');
    visual.className=card.dataset.cover||art.className.replace('project-art','').trim();visual.replaceChildren(art.querySelector('.project-wordmark').cloneNode(true));dialog.scrollTop=0;
    const from=art.getBoundingClientRect(),to=dialog.getBoundingClientRect();
    animate(dialog,[{transform:`translate(${from.left+from.width/2-to.left-to.width/2}px,${from.top+from.height/2-to.top-to.height/2}px) scale(${from.width/to.width},${from.height/to.height})`,opacity:.25},{transform:'translate(0,0) scale(1,1)',opacity:1}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'});
    [...dialog.children].filter(el=>!el.matches('#dialog-visual,.close-dialog')).forEach((el,i)=>animate(el,[{opacity:0,transform:'translateY(25px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,delay:180+i*40,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  }));
  dialog.addEventListener('close',()=>dialog.getAnimations().forEach(a=>a.cancel()));
  // A gentle 3D tilt follows the pointer across the archive cards.
  document.querySelectorAll('.archive-card').forEach(card=>{
    card.addEventListener('pointermove',e=>{
      if(paused||!fine.matches)return;
      const rect=card.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;
      card.style.setProperty('--mx',`${x*100}%`);card.style.setProperty('--my',`${y*100}%`);
      card.style.transform=`perspective(900px) rotateX(${-(y-.5)*9}deg) rotateY(${(x-.5)*11}deg) translateY(-5px)`;
    });
    const reset=()=>{card.style.transform='';};card.addEventListener('pointerleave',reset);card.addEventListener('blur',reset);card.addEventListener('click',reset);
  });
  // Count real résumé outcomes when they enter view; always keep final values readable.
  if('IntersectionObserver' in window){
    const counts=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;counts.unobserve(entry.target);
      const target=Number(entry.target.dataset.count);
      if(paused)return;
      const began=performance.now();
      function step(now){const progress=paused?1:clamp((now-began)/1450);entry.target.textContent=String(Math.round(target*(1-Math.pow(1-progress,3))));if(progress<1)requestAnimationFrame(step);}
      requestAnimationFrame(step);
    }),{threshold:.6});
    document.querySelectorAll('[data-count]').forEach(el=>counts.observe(el));
    const rows=[...document.querySelectorAll('.skill-row')];let skillTimer=0,skillIndex=0;
    function nextSkill(){if(paused||document.hidden)return;rows.forEach((row,i)=>row.classList.toggle('skill-active',i===skillIndex));skillIndex=(skillIndex+1)%rows.length;}
    new IntersectionObserver(entries=>{
      clearInterval(skillTimer);skillTimer=0;
      if(entries[0].isIntersecting){nextSkill();skillTimer=setInterval(nextSkill,1900);}
      else rows.forEach(row=>row.classList.remove('skill-active'));
    },{threshold:.25}).observe(q('.toolbox'));
  }

})();
