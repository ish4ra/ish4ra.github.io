/* Small deterministic game model, shared by the canvas renderer and local checks. */
(function(scope){
  'use strict';
  const same=(a,b)=>a.x===b.x&&a.y===b.y;
  class SnakeGame{
    constructor({cols=28,rows=12,mode='demo',random=Math.random}={}){
      if(cols<4||rows<4||rows%2)throw new Error('Use an even row count of at least four.');
      this.cols=cols;this.rows=rows;this.random=random;this.route=[];
      // A closed route visits every cell; autopilot cannot trap its own tail.
      for(let y=0;y<rows;y++){
        if(y%2===0)for(let x=1;x<cols;x++)this.route.push({x,y});
        else for(let x=cols-1;x>=1;x--)this.route.push({x,y});
      }
      for(let y=rows-1;y>=0;y--)this.route.push({x:0,y});
      this.reset(mode);
    }
    reset(mode='demo'){
      this.mode=mode;this.score=0;this.over=false;this.won=false;this.queue=[];this.food=[];this.dir={x:1,y:0};this.routeIndex=54;
      if(mode==='demo')this.body=Array.from({length:9},(_,i)=>({...this.route[(this.routeIndex-i+this.route.length)%this.route.length]}));
      else this.body=Array.from({length:5},(_,i)=>({x:Math.floor(this.cols/3)-i,y:Math.floor(this.rows/2)}));
      const count=mode==='demo'?5:1;for(let i=0;i<count;i++)this.spawnFood();
    }
    spawnFood(){
      const occupied=p=>this.body.some(b=>same(b,p))||this.food.some(f=>same(f,p));
      let empty=[];
      if(this.mode==='demo'){
        for(let n=5;n<85;n++){const p=this.route[(this.routeIndex+n)%this.route.length];if(!occupied(p))empty.push(p);}
      }else{
        for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){const p={x,y};if(!occupied(p))empty.push(p);}
      }
      if(!empty.length)return false;
      this.food.push({...empty[Math.floor(this.random()*empty.length)]});return true;
    }
    turn(x,y){
      if(this.mode!=='play'||this.over||this.queue.length>=2||Math.abs(x)+Math.abs(y)!==1)return false;
      const last=this.queue[this.queue.length-1]||this.dir;
      if((x===-last.x&&y===-last.y)||(x===last.x&&y===last.y))return false;
      this.queue.push({x,y});return true;
    }
    step(){
      if(this.over)return {over:true};
      let next;
      if(this.mode==='demo'){
        this.routeIndex=(this.routeIndex+1)%this.route.length;next={...this.route[this.routeIndex]};
        this.dir={x:next.x-this.body[0].x,y:next.y-this.body[0].y};
      }else{
        if(this.queue.length)this.dir=this.queue.shift();
        next={x:this.body[0].x+this.dir.x,y:this.body[0].y+this.dir.y};
      }
      const foodIndex=this.food.findIndex(f=>same(f,next)),eaten=foodIndex!==-1;
      const collisionBody=eaten?this.body:this.body.slice(0,-1);
      if(next.x<0||next.y<0||next.x>=this.cols||next.y>=this.rows||collisionBody.some(b=>same(b,next))){this.over=true;return {over:true};}
      this.body.unshift(next);
      // The scroll traveler is this same snake: keep autopilot at its original
      // nine segments so board time cannot produce an oversized departing body.
      // Player-controlled rounds still grow normally when food is collected.
      if(!eaten||this.mode==='demo'&&this.body.length>9)this.body.pop();
      if(eaten){this.score++;this.food.splice(foodIndex,1);if(this.body.length===this.cols*this.rows){this.over=true;this.won=true;}else this.spawnFood();}
      return {eaten,cell:next,over:this.over,won:this.won};
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=SnakeGame;
  else scope.SnakeGame=SnakeGame;
})(typeof window!=='undefined'?window:globalThis);
