/*
  Script for the sample birthday page. It is the studio's original script with
  these changes: it reads the sample password from the page, it builds the
  little star with DOM calls, the buttons are wired up at the bottom of this
  file, the runaway "No" button is kept inside the screen, and focus follows
  the visitor from screen to screen. Nothing here talks to a server or stores
  anything.
*/
(function () {
"use strict";
const SECRET_PASSWORD = document.getElementById('secretPassword').getAttribute('data-secret') || '';
let lightsOn=false,isDecorated=false,candlesLit=false,candlesBlown=false;
let noEscapeCount=0,noFinal=false,noBusy=false;
const MAX_NO_ESCAPES=6;
let audioCtx;
let currentSlide=0;
const TOTAL_SLIDES=4;

// ---- AMBIENT PARTICLES ----
(function initParticles(){
  const layer=document.getElementById('particlesLayer');
  const colors=['rgba(232,84,122,VAR)','rgba(196,168,216,VAR)','rgba(232,198,106,VAR)','rgba(255,180,200,VAR)'];
  for(let i=0;i<28;i++){
    const el=document.createElement('div');
    el.className='particle';
    const c=colors[i%colors.length].replace('VAR',0.4+Math.random()*0.3);
    const size=4+Math.random()*10;
    el.style.cssText=`
      width:${size}px;height:${size}px;
      background:${c};
      left:${Math.random()*100}%;
      bottom:${-10+Math.random()*20}%;
      --dur:${10+Math.random()*16}s;
      --delay:${Math.random()*12}s;
      --op:${0.35+Math.random()*0.4};
      --dx:${-40+Math.random()*80}px;
    `;
    layer.appendChild(el);
  }
  // Stars
  for(let i=0;i<20;i++){
    const st=document.createElement('div');
    st.className='star';
    const sz=1.5+Math.random()*2.5;
    st.style.cssText=`
      width:${sz}px;height:${sz}px;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      --dur:${2+Math.random()*4}s;
      --delay:${Math.random()*5}s;
      --op:${0.5+Math.random()*0.5};
    `;
    layer.appendChild(st);
  }
})();

// ---- ROOM STARS ----
(function initRoomStars(){
  const rs=document.getElementById('roomStars');
  for(let i=0;i<60;i++){
    const st=document.createElement('div');
    st.className='room-star';
    const sz=1+Math.random()*2.5;
    st.style.cssText=`
      width:${sz}px;height:${sz}px;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      --d:${1.5+Math.random()*3}s;
      --dl:${Math.random()*4}s;
    `;
    rs.appendChild(st);
  }
})();

// ---- SPARKLES ----
function addSparkles(){
  const c=document.getElementById('sparkleContainer');
  const positions=[[8,15],[92,18],[5,55],[94,60],[15,82],[86,78],[50,8],[48,90],[25,30],[75,35],[20,65],[80,68],[60,20],[35,75]];
  positions.forEach(([x,y],i)=>{
    const sp=document.createElement('div');
    sp.className='sparkle';
    sp.style.cssText=`left:${x}%;top:${y}%;--d:${1.5+Math.random()*2}s;--dl:${i*0.3}s;`;
    const NS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('width','24');svg.setAttribute('height','24');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');
    const star=document.createElementNS(NS,'path');
    star.setAttribute('d','M12 2L13.5 9.5L21 8L13.5 12.5L15 20L12 14L9 20L10.5 12.5L3 8L10.5 9.5Z');
    star.setAttribute('fill','rgba(232,198,106,0.85)');
    svg.appendChild(star);sp.appendChild(svg);
    c.appendChild(sp);
  });
}

// ---- SCREEN NAV ----
function goHome(){
  showScreen('introScreen');
}
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='pictureScreen') initSlider();
  if(id==='bouquetScreen') initPetals();
  // Move keyboard and screen-reader focus to the new screen's heading.
  const scr=document.getElementById(id);
  const head=scr.querySelector('[role="heading"]') || scr;
  head.setAttribute('tabindex','-1');
  head.focus({preventScroll:true});
}

// ---- NO BUTTON ----
function moveNoButton(event){
  const btn=document.getElementById('noBtn');
  const msg=document.getElementById('noMessage');
  if(noFinal || noBusy) return;
  noBusy=true;
  noEscapeCount++;
  if(noEscapeCount>MAX_NO_ESCAPES){
    noFinal=true;
    msg.textContent='No is not an option.';
    btn.textContent='Yes';
    btn.classList.remove('btn-secondary','no-running');
    btn.classList.add('btn-primary');
    btn.style.position='relative';
    btn.style.left='auto';
    btn.style.top='auto';
    btn.style.transform='none';
    btn.onmouseenter=null;
    btn.onmousemove=null;
    btn.onclick=()=>showScreen('switchScreen');
    noBusy=false;
    return;
  }
  const msgs=['How dare you.','Nope. Not allowed.','The button has escaped.','Still trying?','Almost done running.','Last chance.'];
  msg.textContent=msgs[Math.min(noEscapeCount-1,msgs.length-1)];
  const pad=34;
  const bw=btn.offsetWidth||140;
  const bh=btn.offsetHeight||48;
  const maxX=Math.max(pad,window.innerWidth-bw-pad);
  const maxY=Math.max(pad,window.innerHeight-bh-pad);
  let x=pad+Math.random()*(maxX-pad);
  let y=pad+Math.random()*(maxY-pad);
  if(event && typeof event.clientX==='number'){
    let attempts=0;
    while(Math.hypot(x-event.clientX,y-event.clientY)<190 && attempts<24){
      x=pad+Math.random()*(maxX-pad);
      y=pad+Math.random()*(maxY-pad);
      attempts++;
    }
  }
  btn.classList.add('no-running');
  btn.style.position='fixed';
  // While the panels of this page are animated, "fixed" is measured from the
  // nearest animated box and not from the screen. A probe placed at 0,0 shows
  // how far off that is, so the button lands where it was aimed and stays in view.
  const probe=document.createElement('span');
  probe.style.cssText='position:fixed;left:0;top:0;width:0;height:0;';
  btn.parentElement.appendChild(probe);
  const off=probe.getBoundingClientRect();
  probe.remove();
  btn.style.left=(x-off.left)+'px';
  btn.style.top=(y-off.top)+'px';
  btn.style.transform=`rotate(${-10+Math.random()*20}deg) scale(1.04)`;
  setTimeout(()=>{noBusy=false;},270);
}

// ---- LIGHTS ----
function turnLightsOn(){
  if(lightsOn) return;
  lightsOn=true;
  const world=document.getElementById('switchWorld');
  world.classList.add('lit');
  document.querySelector('.toggle-ball').textContent='☀️';
  document.getElementById('toggleLabel').textContent='lights on';
  document.getElementById('lightToggle').setAttribute('aria-pressed','true');
  // Burst light particles
  const inner=document.getElementById('switchInner');
  const rect=inner.getBoundingClientRect();
  const cx=rect.left+rect.width/2;
  const cy=rect.top+rect.height/2;
  for(let i=0;i<24;i++){
    const lp=document.createElement('div');
    lp.className='light-particle';
    const angle=Math.random()*Math.PI*2;
    const dist=60+Math.random()*130;
    const size=4+Math.random()*8;
    const colors=['#FFE566','#FFC847','#FFD0A0','#FFFFFF','#FFE8B0'];
    lp.style.cssText=`
      width:${size}px;height:${size}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:50%;
      left:${cx}px;top:${cy}px;
      --d:${1+Math.random()*1.5}s;
      --dl:${Math.random()*0.3}s;
      --tx:${Math.cos(angle)*dist}px;
      --ty:${Math.sin(angle)*dist}px;
    `;
    world.appendChild(lp);
    setTimeout(()=>lp.remove(),2500);
  }
  setTimeout(()=>document.getElementById('decorateReveal').classList.add('show'),500);
}

// ---- DECORATE ----
function decorateParty(){
  if(isDecorated) return;
  isDecorated=true;
  document.getElementById('partyBanner').classList.add('show');
  document.getElementById('garlandSvg').classList.add('show');
  document.getElementById('decorateWorld').classList.add('decorated');
  document.getElementById('decorateBtn').disabled=true;
  addSparkles();
  playBirthdayMelody();
  launchConfetti(120);
  setTimeout(()=>document.getElementById('toCakeBtn').classList.add('show'),1000);
}

// ---- CANDLES ----
function lightCandles(){
  if(candlesLit) return;
  candlesLit=true;
  document.getElementById('cakeScene').classList.add('cake-lit');
  document.getElementById('lightCandlesBtn').disabled=true;
  const blow=document.getElementById('blowCandlesBtn');
  blow.disabled=false;
  blow.classList.remove('btn-secondary');
  blow.classList.add('btn-primary');
}

function blowCandles(){
  if(!candlesLit||candlesBlown) return;
  candlesBlown=true;
  const scene=document.getElementById('cakeScene');
  scene.classList.remove('cake-lit');
  scene.classList.add('cake-blown');
  document.getElementById('blowCandlesBtn').disabled=true;
  // Add smoke puffs
  const smokes=document.getElementById('smokePuffs');
  const offsets=[-80,-40,0,40,80];
  offsets.forEach((ox,i)=>{
    for(let j=0;j<3;j++){
      const sp=document.createElement('div');
      sp.className='smoke-puff';
      sp.style.cssText=`
        position:absolute;
        left:calc(50% + ${ox}px);
        top:10px;
        width:${10+j*4}px;height:${10+j*4}px;
        --sx:${-8+Math.random()*16}px;
        animation-delay:${i*0.08+j*0.12}s;
        animation:smokePuff 2s ${i*0.08+j*0.12}s ease-out forwards;
      `;
      smokes.appendChild(sp);
      setTimeout(()=>sp.remove(),2500);
    }
  });
  // Wish particles
  const wishItems=['⭐','🌟','✨','💫','🌸','💕','🌷','🎀'];
  for(let i=0;i<20;i++){
    const wp=document.createElement('div');
    wp.className='wish-particle';
    wp.textContent=wishItems[Math.floor(Math.random()*wishItems.length)];
    wp.style.cssText=`
      left:${20+Math.random()*60}%;
      top:50%;
      --s:${16+Math.random()*16}px;
      --d:${0.1+Math.random()*0.6}s;
      --x:${-60+Math.random()*120}px;
      --r:${-30+Math.random()*60}deg;
    `;
    document.getElementById('cakeScene').appendChild(wp);
    setTimeout(()=>wp.remove(),2500);
  }
  launchConfetti(80);
  setTimeout(()=>document.getElementById('toGiftBtn').classList.add('show'),700);
}

// ---- ENVELOPE ----
function toggleEnvelope(){
  const envelope = document.getElementById('envelope');
  const screen = document.getElementById('envelopeScreen');
  envelope.classList.toggle('open');
  screen.classList.toggle('envelope-active', envelope.classList.contains('open'));
  envelope.setAttribute('aria-expanded', String(envelope.classList.contains('open')));
}

// ---- PASSWORD ----
function checkPassword(){
  const inp=document.getElementById('secretPassword');
  const err=document.getElementById('passwordError');
  const msg=document.getElementById('secretMessage');
  const lock=document.getElementById('lockIcon');
  if(inp.value.trim().toLowerCase()===SECRET_PASSWORD.toLowerCase()){
    err.textContent='';
    lock.textContent='🔓';
    lock.classList.add('lock-unlocked');
    msg.classList.add('show');
    launchConfetti(60);
  } else {
    msg.classList.remove('show');
    err.textContent='✦ That password is not quite right.';
    lock.style.animation='none';
    lock.offsetHeight;
    lock.style.animation='lockPulse 2s ease-in-out infinite';
  }
}
function handleSecret(e){if(e.key==='Enter')checkPassword();}

// ---- SLIDER ----
function initSlider(){
  const dots=document.getElementById('slideDots');
  if(!dots.children.length){
    for(let i=0;i<TOTAL_SLIDES;i++){
      const d=document.createElement('button');
      d.className='slide-dot';
      d.setAttribute('aria-label','Photo '+(i+1)+' of '+TOTAL_SLIDES);
      d.onclick=()=>goSlide(i);
      dots.appendChild(d);
    }
  }
  updateSlider();
}
function updateSlider(){
  document.getElementById('slidesTrack').style.transform=`translateX(-${currentSlide*100}%)`;
  document.querySelectorAll('.slide-dot').forEach((d,i)=>d.classList.toggle('active',i===currentSlide));
}
function nextSlide(){currentSlide=(currentSlide+1)%TOTAL_SLIDES;updateSlider();}
function prevSlide(){currentSlide=(currentSlide-1+TOTAL_SLIDES)%TOTAL_SLIDES;updateSlider();}
function goSlide(i){currentSlide=i;updateSlider();}
setInterval(()=>{if(document.getElementById('pictureScreen').classList.contains('active'))nextSlide();},4500);

// ---- PETALS ----
function initPetals(){
  const stage=document.getElementById('bouquetStage');
  if(stage.dataset.petals) return;
  stage.dataset.petals='1';
  const shapes=['ellipse','M-6,-10C-4,-16,4,-16,6,-10C8,-4,4,4,0,10C-4,4,-8,-4,-6,-10Z'];
  for(let i=0;i<22;i++){
    const p=document.createElement('div');
    p.className='petal';
    const size=10+Math.random()*14;
    const colors=['rgba(249,178,204,0.7)','rgba(232,84,122,0.55)','rgba(255,210,230,0.65)','rgba(196,168,216,0.6)'];
    p.style.cssText=`
      width:${size}px;height:${size*1.5}px;
      border-radius:60% 20% 60% 20%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      left:${Math.random()*100}%;
      --d:${7+Math.random()*6}s;
      --dl:${Math.random()*8}s;
      transform:rotate(${Math.random()*180}deg);
    `;
    stage.appendChild(p);
  }
}

// ---- CONFETTI ----
function launchConfetti(count=100){
  const container=document.getElementById('confettiLayer');
  const colors=['#E8547A','#D94F88','#EDE4F5','#FFD6E0','#F9B2CC','#E8C66A','#C4A8D8','#ffffff','#F7DCEC'];
  const shapes=[2,4,6,50];
  for(let i=0;i<count;i++){
    const el=document.createElement('div');
    el.className='cp';
    const br=shapes[Math.floor(Math.random()*shapes.length)];
    const size=6+Math.random()*10;
    el.style.cssText=`
      left:${Math.random()*100}vw;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${size}px;height:${size*1.4}px;
      --br:${br}px;
      --d:${2.5+Math.random()*1.5}s;
      --dl:${Math.random()*0.5}s;
      --spin:${360+Math.random()*720}deg;
      --sx:${-60+Math.random()*120}px;
    `;
    container.appendChild(el);
    setTimeout(()=>el.remove(),4500);
  }
}

// ---- MELODY ----
function playBirthdayMelody(){
  try {
    audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();
    const masterGain=audioCtx.createGain();
    masterGain.gain.value=0.12;
    const reverb=audioCtx.createConvolver();
    const reverbGain=audioCtx.createGain();
    reverbGain.gain.value=0.3;
    masterGain.connect(audioCtx.destination);
    const notes=[392,392,440,392,523,494,392,392,440,392,587,523,392,392,784,659,523,494,440,698,698,659,523,587,523];
    const durs=[.32,.32,.65,.65,.65,1.05,.32,.32,.65,.65,.65,1.05,.32,.32,.65,.65,.65,.65,1.15,.32,.32,.65,.65,.65,1.15];
    let t=audioCtx.currentTime+0.08;
    notes.forEach((freq,i)=>{
      const osc=audioCtx.createOscillator();
      const gain=audioCtx.createGain();
      osc.type='triangle';
      osc.frequency.value=freq;
      gain.gain.setValueAtTime(0.0001,t);
      gain.gain.exponentialRampToValueAtTime(0.3,t+0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001,t+durs[i]);
      // Add a subtle vibrato
      const vibOsc=audioCtx.createOscillator();
      const vibGain=audioCtx.createGain();
      vibOsc.frequency.value=5.5;
      vibGain.gain.value=3;
      vibOsc.connect(vibGain);
      vibGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(masterGain);
      vibOsc.start(t); vibOsc.stop(t+durs[i]+0.05);
      osc.start(t); osc.stop(t+durs[i]+0.05);
      t+=durs[i]+0.04;
    });
  } catch(e){ /* sound is optional: some browsers block it */ }
}

// ---- WIRING ----
// The original page called these from onclick="" attributes. Here the markup
// carries data-go (a screen to show) or data-act (one of the actions below),
// and one listener does the rest, so the page needs no inline script.
const ACTIONS={goHome,turnLightsOn,decorateParty,lightCandles,blowCandles,toggleEnvelope,checkPassword,prevSlide,nextSlide};
function runControl(el){
  const go=el.getAttribute('data-go');
  if(go){ if(document.getElementById(go)) showScreen(go); return; }
  const act=el.getAttribute('data-act');
  if(act && Object.prototype.hasOwnProperty.call(ACTIONS,act)) ACTIONS[act]();
  // Some buttons switch themselves off after one use. If that leaves the
  // keyboard nowhere, hand focus to the next button on the screen.
  setTimeout(()=>{
    const at=document.activeElement;
    if(at && at!==document.body && !at.disabled) return;
    const scr=document.querySelector('.screen.active');
    const next=scr && Array.from(scr.querySelectorAll('.btn')).find(b=>!b.disabled && b.offsetParent!==null && getComputedStyle(b).opacity!=='0' && getComputedStyle(b).pointerEvents!=='none');
    if(next) next.focus({preventScroll:true});
  },1200);
}
document.addEventListener('click',e=>{
  const el=e.target instanceof Element ? e.target.closest('[data-go],[data-act]') : null;
  if(el) runControl(el);
});
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter' && e.key!==' ') return;
  const el=e.target instanceof Element ? e.target : null;
  if(el && el.matches('[role="button"][data-go],[role="button"][data-act]')){ e.preventDefault(); runControl(el); }
});
const noButton=document.getElementById('noBtn');
noButton.onmouseenter=moveNoButton;
noButton.onmousemove=moveNoButton;
noButton.onclick=moveNoButton;
document.getElementById('secretPassword').addEventListener('keydown',handleSecret);

initSlider();
})();
