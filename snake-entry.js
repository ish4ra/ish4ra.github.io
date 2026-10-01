/* One continuous route from the page edge into the board. */
(function(scope){
  function pathFor(body,board,head){
    const cell=board.width/board.cols;
    const points=body.slice().reverse().map(p=>({x:p.x,y:p.y}));
    const start=points[points.length-1],entry={x:board.left+board.width+cell*.5,y:board.top+(head.y+.5)*cell};
    const c1={x:start.x,y:entry.y-Math.max(55,Math.abs(entry.y-start.y)*.4)};
    const c2={x:entry.x+cell*1.4,y:entry.y};
    const startIndex=points.length-1;
    for(let i=1;i<=100;i++){
      const t=i/100,u=1-t;
      points.push({x:u*u*u*start.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*entry.x,y:u*u*u*start.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*entry.y});
    }
    points.push({x:board.left+(head.x+.5)*cell,y:entry.y});
    const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
    return {points,lengths,start:lengths[startIndex],total:lengths[lengths.length-1],cell};
  }
  function sample(path,distance){
    const d=Math.max(0,Math.min(path.total,distance));let i=1;
    while(i<path.lengths.length-1&&path.lengths[i]<d)i++;
    const a=path.points[i-1],b=path.points[i],length=path.lengths[i]-path.lengths[i-1],t=length?(d-path.lengths[i-1])/length:0;
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  function followPath(body,target,returning=false,bounds=null){
    const points=body.slice().reverse().map(p=>({...p})),startIndex=points.length-1;
    const head=body[0],neck=body[1]||{x:head.x,y:head.y+1};
    const len=Math.hypot(head.x-neck.x,head.y-neck.y)||1;
    const direction={x:(head.x-neck.x)/len,y:(head.y-neck.y)/len};
    function curve(end,c1,c2){
      if(bounds){
        const keep=p=>({x:Math.max(16,Math.min(bounds.width-16,p.x)),y:Math.max(24,Math.min(bounds.height-24,p.y))});
        c1=keep(c1);c2=keep(c2);
      }
      const a=points[points.length-1];
      for(let i=1;i<=100;i++){const t=i/100,u=1-t;points.push({x:u*u*u*a.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*end.x,y:u*u*u*a.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*end.y});}
    }
    if(returning){
      const tail=target[target.length-1],before=target[target.length-2]||tail;
      const d=Math.hypot(before.x-tail.x,before.y-tail.y)||1;
      const reach=Math.max(65,Math.hypot(tail.x-head.x,tail.y-head.y)*.4);
      curve(tail,{x:head.x+direction.x*reach,y:head.y+direction.y*reach},{x:tail.x-(before.x-tail.x)/d*reach,y:tail.y-(before.y-tail.y)/d*reach});
      points.push(...target.slice(0,-1).reverse().map(p=>({...p})));
    }else{
      const sign=target.direction||-1;
      const distance=Math.hypot(target.x-head.x,target.y-head.y);
      const continuing=direction.y*sign>.5&&(target.y-head.y)*sign>=0;
      const reversing=direction.y*sign<-.45;

      if(reversing){
        // A direct U-turn folds several body offsets into the same tiny curve.
        // Give the snake room to step inward, sweep a wide loop, then return
        // to the rail facing the new scroll direction.
        const compact=!!bounds&&bounds.width<600;
        const gaps=body.slice(1).map((p,i)=>Math.hypot(p.x-body[i].x,p.y-body[i].y)).filter(Boolean);
        const averageGap=gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:(compact?12:16);
        const radius=Math.max(compact?54:82,Math.min(compact?84:128,averageGap*(body.length+1)*.78));
        const side=!bounds||target.x>bounds.width*.55?-1:1;
        const minX=compact?18:24,maxX=(bounds?.width||innerWidth)-(compact?18:24);
        const minY=compact?30:38,maxY=(bounds?.height||innerHeight)-(compact?30:38);
        const mid={
          x:Math.max(minX,Math.min(maxX,head.x+side*radius)),
          y:Math.max(minY,Math.min(maxY,head.y+direction.y*radius*.9))
        };
        const horizontal=Math.max(24,Math.abs(mid.x-head.x)*.48);
        const vertical=Math.max(28,radius*.55);

        curve(
          mid,
          {x:head.x,y:head.y+direction.y*vertical},
          {x:mid.x-side*horizontal,y:mid.y}
        );
        curve(
          target,
          {x:mid.x+side*horizontal,y:mid.y},
          {x:target.x,y:target.y-sign*vertical}
        );
      }else{
        // Tiny continued scrolls keep the original compact movement.
        const reach=continuing?Math.min(160,distance*.4):Math.max(45,Math.min(160,distance*.4));
        curve(target,{x:head.x+direction.x*reach,y:head.y+direction.y*reach},{x:target.x,y:target.y-sign*reach});
      }
    }
    const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
    const offsets=body.map((_,i)=>lengths[startIndex]-lengths[startIndex-i]);
    return {points,lengths,start:lengths[startIndex],total:lengths[lengths.length-1],offsets};
  }
  function offsetsFor(body){let d=0;return body.map((p,i)=>{if(i)d+=Math.hypot(p.x-body[i-1].x,p.y-body[i-1].y);return d;});}
  const api={pathFor,sample,followPath,offsetsFor};if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.SnakeEntry=api;
})(typeof window!=='undefined'?window:globalThis);
