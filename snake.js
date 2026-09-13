'use strict';
(() => {
  const $=s=>document.querySelector(s),root=document.documentElement;
  const canvas=$('#snake-canvas'),ctx=canvas.getContext('2d'),section=$('#playground');
  if(!ctx||!window.SnakeGame)return;
  const game=new SnakeGame({cols:36,rows:6});
  // Arrival ends facing left on row two, with every segment already inside the board.
  game.routeIndex=game.cols-1+8;
  game.body=Array.from({length:9},(_,i)=>({...game.route[game.routeIndex-i]}));
  game.dir={x:-1,y:0};game.food=[];for(let i=0;i<5;i++)game.spawnFood();
  let previous=game.body.map(p=>({...p})),localPaused=false,visible=false,frame=0,lastStep=0,clock=0,w=0,h=0,best=0;
  let accent='#c6f37b',ink='#152014',bg='#0d100e',muted='#969c93';
  let sparks=[],touch=null;
  let arrived=root.classList.contains('motion-paused'),journeyFrame=0,entry=null,departure=null,resumeSnapshot=null,lastScrollPosition=scrollY,scrollDirection=1;
  const traveler=document.createElement('canvas');traveler.className='snake-journey';traveler.setAttribute('aria-hidden','true');
  document.body.append(traveler);const travelCtx=traveler.getContext('2d');
  if(!travelCtx)arrived=true;
  traveler.hidden=arrived;
  let travelW=0,travelH=0,lastBoardRect=null;

  try{best=Math.max(0,Number(localStorage.getItem('ishara-snake-best'))||0);}catch{}
  $('#snake-best').textContent=String(best).padStart(2,'0');
  const allowed=()=>arrived&&visible&&!document.hidden&&!localPaused&&!game.over&&(game.mode==='play'||!root.classList.contains('motion-paused'));
  function palette(){const css=getComputedStyle(root);accent=css.getPropertyValue('--accent').trim();ink=css.getPropertyValue('--ink').trim();bg=css.getPropertyValue('--bg').trim();muted=css.getPropertyValue('--muted').trim();}
  function tile(x,y,size,color,alpha=1,radius=3){ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,size,size,radius);else ctx.rect(x,y,size,size);ctx.fill();ctx.globalAlpha=1;}
  function render(now=clock,blend=1){
    if(!w||!h)return;
    if(arrived)lastBoardRect=canvas.getBoundingClientRect();
    ctx.clearRect(0,0,w,h);
    const cell=w/game.cols,gap=Math.max(2,cell*.22),size=cell-gap;
    for(let y=0;y<game.rows;y++)for(let x=0;x<game.cols;x++){
      const noise=(Math.sin(x*12.9898+y*78.233)*43758.5453)%1;
      const band=(x+y*2)%9===0;
      tile(x*cell+gap/2,y*cell+gap/2,size,accent,band?.09:.02+Math.abs(noise)*.03,Math.min(3,cell*.13));
    }
    for(const food of game.food){
      const x=(food.x+.5)*cell,y=(food.y+.5)*cell,pulse=.8+.2*Math.sin(now*.005+food.x);
      ctx.shadowColor=accent;ctx.shadowBlur=cell*.7*pulse;
      tile(x-size*.3,y-size*.3,size*.6,accent,1,2);ctx.shadowBlur=0;
      ctx.strokeStyle=accent;ctx.globalAlpha=.25+.25*pulse;ctx.lineWidth=1;ctx.strokeRect(x-size*.48,y-size*.48,size*.96,size*.96);ctx.globalAlpha=1;
    }
    const positions=(arrived?game.body:[]).map((p,i)=>{const from=previous[i]||previous[previous.length-1]||p;return{x:(from.x+(p.x-from.x)*blend)*cell+gap/2,y:(from.y+(p.y-from.y)*blend)*cell+gap/2};});
    for(let i=positions.length-1;i>=0;i--){const p=positions[i],opacity=i===0?1:.35+.6*(1-i/positions.length);if(i===0){ctx.shadowColor=accent;ctx.shadowBlur=cell*.7;}tile(p.x,p.y,size,accent,opacity,Math.min(5,cell*.2));ctx.shadowBlur=0;}
    const head=positions[0];
    if(head){const cx=head.x+size/2,cy=head.y+size/2,dir=game.dir,eye=Math.max(1.4,cell*.095);ctx.fillStyle=ink;
      for(const side of [-1,1]){const ex=cx+dir.x*size*.22-dir.y*side*size*.22,ey=cy+dir.y*size*.22+dir.x*side*size*.22;ctx.fillRect(ex-eye/2,ey-eye/2,eye,eye);}}
    sparks=sparks.filter(s=>now-s.time<550);
    for(const s of sparks){const p=(now-s.time)/550;ctx.strokeStyle=accent;ctx.globalAlpha=(1-p)*.7;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc((s.x+.5)*cell,(s.y+.5)*cell,cell*(.3+p*1.7),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  }
  function updateUI(){
    $('#snake-score').textContent=String(game.score).padStart(2,'0');
    const mode=game.mode==='demo'?(arrived?'AUTOPILOT':'ON THE WAY'):'YOUR TURN';$('#snake-mode').lastChild.textContent=mode;
    const ambientPaused=game.mode==='demo'&&root.classList.contains('motion-paused');
    $('#snake-pause').textContent=localPaused?'Resume':ambientPaused?'Motion paused':'Pause';
    $('#snake-pause').setAttribute('aria-pressed',String(localPaused||ambientPaused));
    $('#snake-pause').disabled=ambientPaused||game.over;
    $('#snake-play').textContent=game.mode==='play'?'Restart ↻':'Play snake ↗';
    $('#snake-auto').hidden=game.mode!=='play';$('.snake-dpad').hidden=game.mode!=='play';
    $('.snake-board').classList.toggle('is-playing',game.mode==='play');
    $('#snake-help').textContent=game.mode==='demo'?'A small detour. No finish line required.':'Collect the bright tiles. Avoid the walls and your tail.';
  }
  function endRound(){
    if(game.score>best){best=game.score;try{localStorage.setItem('ishara-snake-best',String(best));}catch{}$('#snake-best').textContent=String(best).padStart(2,'0');}
    $('#snake-overlay').hidden=false;$('#snake-result').textContent=game.won?'Every tile. Yours.':'One more round?';
    $('#snake-result-detail').textContent=`${game.score} collected · Your best ${best}`;
    $('#snake-announcement').textContent=`${game.won?'Board complete.':'Game over.'} Score ${game.score}. Select Try again to restart.`;
    updateUI();
  }
  function loop(now){
    frame=0;if(!allowed())return;
    clock=now;const interval=game.mode==='demo'?105:130;
    if(now-lastStep>=interval){
      previous=game.body.map(p=>({...p}));const result=game.step();lastStep=now;
      if(result.eaten){sparks.push({...result.cell,time:now});$('#snake-score').textContent=String(game.score).padStart(2,'0');}
      if(result.over){render(now,1);endRound();return;}
    }
    const blend=Math.min(1,(now-lastStep)/interval);render(now,blend);frame=requestAnimationFrame(loop);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;}
  function start(){if(!frame&&allowed()){
    lastStep=performance.now();
    if(resumeSnapshot){previous=resumeSnapshot.previous;lastStep-=resumeSnapshot.blend*(game.mode==='demo'?105:130);resumeSnapshot=null;}
    else {
      previous=game.body.map(p=>({...p}));
      const result=game.step();
      if(result.over){render();endRound();return;}
    }
    frame=requestAnimationFrame(loop);
  }}
  function reset(mode){finishJourney();departure=null;entry=null;resumeSnapshot=null;stop();game.reset(mode);previous=game.body.map(p=>({...p}));sparks=[];localPaused=false;$('#snake-overlay').hidden=true;updateUI();render();start();if(mode==='play'){canvas.focus({preventScroll:true});$('#snake-announcement').textContent='Game started. Use arrow keys, W A S D, or the direction buttons.';}}
  function togglePause(){if(game.over)return;localPaused=!localPaused;updateUI();if(localPaused){stop();render(clock,1);}else start();}
  $('#snake-play').addEventListener('click',()=>reset('play'));$('#snake-again').addEventListener('click',()=>reset('play'));$('#snake-auto').addEventListener('click',()=>reset('demo'));$('#snake-pause').addEventListener('click',togglePause);
  const directions={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  const keys={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  canvas.addEventListener('keydown',e=>{
    if(game.mode!=='play')return;
    if(keys[e.key]){e.preventDefault();game.turn(...directions[keys[e.key]]);}else if(e.code==='Space'){e.preventDefault();togglePause();}
  });
  document.querySelectorAll('[data-snake-direction]').forEach(button=>button.addEventListener('click',()=>{game.turn(...directions[button.dataset.snakeDirection]);}));
  canvas.addEventListener('pointerdown',e=>{if(game.mode!=='play')return;touch={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!touch||touch.id!==e.pointerId)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;if(Math.max(Math.abs(dx),Math.abs(dy))<14)return;game.turn(...(Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)]));touch={x:e.clientX,y:e.clientY,id:e.pointerId};});
  const release=e=>{touch=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  function finishJourney(){
    if(arrived)return;arrived=true;cancelAnimationFrame(journeyFrame);journeyFrame=0;traveler.hidden=true;
    updateUI();render(clock,resumeSnapshot?resumeSnapshot.blend:1);start();
  }
  function resizeJourney(){
    travelW=innerWidth;travelH=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.5);
    traveler.width=Math.round(travelW*dpr);traveler.height=Math.round(travelH*dpr);travelCtx?.setTransform(dpr,0,0,dpr,0,0);
  }
  function journeyTick(now){
    journeyFrame=0;
    if(arrived||document.hidden||!travelCtx)return;
    if(root.classList.contains('motion-paused')){finishJourney();return;}
    const rect=canvas.getBoundingClientRect(),clamp=n=>Math.max(0,Math.min(1,n));
    const compact=travelW<600,baseSize=compact?9:13,spacing=Math.min(baseSize+3,(travelH-120)/(game.body.length+2));
    // Restore the original scroll-progress travel instead of two fixed rail stops.
    const destination=Math.max(1,rect.top+scrollY-travelH*.45);
    const progress=clamp(scrollY/destination);
    const afterBoard=clamp((scrollY-destination)/Math.max(travelH,root.scrollHeight-travelH-destination));
    const railX=travelW-(compact?24:42)+Math.sin(progress*7+afterBoard*3)*(compact?6:11);
    const bodyMargin=game.body.length*spacing+32;
    const railY=Math.max(bodyMargin,Math.min(travelH-bodyMargin,
      Math.max(175,travelH*.24)+progress*travelH*.24+afterBoard*travelH*.16));
    const cell=rect.width/game.cols;
    const insideSize=cell-Math.max(2,cell*.22);
    if(!departure){
      const source=game.body.map((_,i)=>({x:railX,y:railY-i*spacing}));
      departure={body:game.body.map(p=>({...p})),points:source,size:baseSize,last:now,speed:160,phase:null,snapshot:null};
    }
    const d=departure,dt=Math.min(40,Math.max(0,now-d.last))/1000;d.last=now;
    // Keep entry inside the departure thresholds: crossing an edge must not
    // start an exit and immediately send the snake back into the board.
    const boardFits=rect.top>=120&&rect.top+rect.width*game.rows/game.cols<=travelH-40;
    const wantsIn=scrollDirection>0&&boardFits&&rect.top<travelH*.55;
    const phase=wantsIn?'in':scrollDirection>0?'down':'up';
    const head=d.points[0];
    // The traveler lives in viewport space. Page scroll cannot carry it offscreen.
    // Replan from the currently drawn body when the moving board changes position.
    const boardMoved=phase==='in'&&d.boardTop!==rect.top;
    const railMoved=phase!=='in'&&(Math.abs((d.railY??railY)-railY)>.25||Math.abs((d.railX??railX)-railX)>.25);
    if(d.phase!==phase||!d.path||boardMoved||railMoved||d.viewportWidth!==travelW||d.viewportHeight!==travelH){
      const destinationBody=d.body.map(p=>({x:rect.left+(p.x+.5)*cell,y:rect.top+(p.y+.5)*cell}));
      const sign=phase==='up'?-1:1;
      const target=phase==='in'?destinationBody:{x:railX,y:railY,direction:sign};
      d.boardTop=rect.top;d.railX=railX;d.railY=railY;d.viewportWidth=travelW;d.viewportHeight=travelH;
      d.path=SnakeEntry.followPath(d.points,target,phase==='in',{width:travelW,height:travelH});
      d.distance=d.path.start;d.phase=phase;d.sourceSize=d.size;
      d.endOffsets=phase==='in'?SnakeEntry.offsetsFor(destinationBody):d.body.map((_,i)=>i*spacing);
    }
    const remaining=d.path.total-d.distance;
    const gameSpeed=cell/(game.mode==='demo'?.105:.130);
    const desiredSpeed=phase==='in'?gameSpeed+Math.min(220,Math.max(0,remaining-cell*3)*.8):Math.max(150,Math.min(600,remaining*1.5));
    d.speed+=(desiredSpeed-d.speed)*(1-Math.exp(-dt*9));
    d.distance=Math.min(d.path.total,d.distance+d.speed*dt);
    const t=clamp((d.distance-d.path.start)/(d.path.total-d.path.start||1));
    const shape=t*t*(3-2*t);
    d.size=d.sourceSize+((phase==='in'?insideSize:baseSize)-d.sourceSize)*shape;
    d.points=d.body.map((_,i)=>SnakeEntry.sample(d.path,d.distance-(d.path.offsets[i]+(d.endOffsets[i]-d.path.offsets[i])*shape)));
    const points=d.points.map(p=>({x:p.x,y:p.y,size:d.size}));
    const complete=phase==='in'&&d.distance===d.path.total;
    if(complete){resumeSnapshot=d.snapshot;departure=null;}
    travelCtx.clearRect(0,0,travelW,travelH);
    if(!document.querySelector('dialog[open]')){
      for(let i=points.length-1;i>=0;i--){
        const p=points[i];travelCtx.globalAlpha=i===0?1:.35+.6*(1-i/points.length);travelCtx.fillStyle=accent;
        travelCtx.shadowColor=accent;travelCtx.shadowBlur=i===0?13:0;travelCtx.beginPath();
        if(travelCtx.roundRect)travelCtx.roundRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size,Math.min(5,p.size*.2));
        else travelCtx.rect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
        travelCtx.fill();
      }
      travelCtx.globalAlpha=1;travelCtx.shadowBlur=0;
      const head=points[0],neck=points[1],len=Math.hypot(head.x-neck.x,head.y-neck.y)||1,dx=(head.x-neck.x)/len,dy=(head.y-neck.y)/len;
      const eye=Math.max(1.5,head.size*.13);travelCtx.fillStyle=ink;
      for(const side of [-1,1])travelCtx.fillRect(head.x+dx*head.size*.22-dy*side*head.size*.22-eye/2,head.y+dy*head.size*.22+dx*side*head.size*.22-eye/2,eye,eye);
    }
    if(complete){finishJourney();return;}
    journeyFrame=requestAnimationFrame(journeyTick);
  }

  let lastDirectionScroll=scrollY;
  // Reuse the actual frozen body on the way out and back, preserving a playable round.
  addEventListener('scroll',()=>{
    const movingUp=scrollY<lastScrollPosition;lastScrollPosition=scrollY;
    if(Math.abs(scrollY-lastDirectionScroll)>3){scrollDirection=movingUp?-1:1;lastDirectionScroll=scrollY;}
    if(!arrived||!travelCtx||root.classList.contains('motion-paused'))return;
    const rect=canvas.getBoundingClientRect();
    const leavingBelow=movingUp&&rect.top>travelH*.6;
    const leavingAbove=!movingUp&&rect.top<80;
    if(!leavingBelow&&!leavingAbove)return;
    const interval=game.mode==='demo'?105:130;
    const blend=frame?Math.max(0,Math.min(1,(performance.now()-lastStep)/interval)):1;
    const savedPrevious=previous.map(p=>({...p}));
    const body=game.body.map((p,i)=>{const from=previous[i]||previous[previous.length-1]||p;return{x:from.x+(p.x-from.x)*blend,y:from.y+(p.y-from.y)*blend};});
    stop();arrived=false;entry=null;
    const anchor=(rect.top<0||rect.top+rect.width/6>travelH)?(lastBoardRect||rect):rect;
    const cell=anchor.width/game.cols;
    const source=body.map(p=>({x:Math.max(16,Math.min(travelW-16,anchor.left+(p.x+.5)*cell)),y:Math.max(24,Math.min(travelH-24,anchor.top+(p.y+.5)*cell))}));
    const size=cell-Math.max(2,cell*.22);
    departure={body,points:source,size,phase:null,speed:cell/(interval/1000),snapshot:blend<1?{previous:savedPrevious,blend}:null,last:performance.now()};
    traveler.hidden=false;updateUI();render();startJourney();
  },{passive:true});

  function startJourney(){if(!arrived&&!journeyFrame&&!document.hidden&&travelCtx)journeyFrame=requestAnimationFrame(journeyTick);}
  function resize(){w=canvas.clientWidth;h=w*game.rows/game.cols;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);render();}
  palette();updateUI();resizeJourney();startJourney();
  addEventListener('resize',resizeJourney);
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);else{resize();addEventListener('resize',resize);}
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else stop();},{threshold:.05}).observe(section);else{visible=true;start();}
  new MutationObserver(()=>{palette();if(!arrived&&root.classList.contains('motion-paused'))finishJourney();updateUI();if(allowed())start();else{stop();render();}}).observe(root,{attributes:true,attributeFilter:['class','data-theme']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();cancelAnimationFrame(journeyFrame);journeyFrame=0;}else{start();startJourney();}});
})();
