(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
// nav
const t=$('.navtoggle'),n=$('#nav');
if(t)t.addEventListener('click',()=>{const o=t.getAttribute('aria-expanded')!=='true';t.setAttribute('aria-expanded',o);n.classList.toggle('open',o);t.setAttribute('aria-label',o?'Close menu':'Open menu')});
// Austin time
let now;try{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'numeric',minute:'numeric',hour12:false}).formatToParts(new Date());
 const g=k=>p.find(x=>x.type===k).value;now={d:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday')),h:(+g('hour')%24)+(+g('minute'))/60}}catch(e){const d=new Date();now={d:d.getDay(),h:d.getHours()+d.getMinutes()/60}}
const f=h=>(h%12||12)+(h<12?'am':'pm');
$$('[data-hours]').forEach(el=>{const H=JSON.parse(el.dataset.hours),lab=el.dataset.label||'';const td=H[now.d];
 if(td&&now.h>=td[0]&&now.h<td[1]){el.textContent=`${lab}: Open now · until ${f(td[1])}`;el.classList.add('is-open')}
 else{let nx='';for(let i=0;i<8;i++){const d=(now.d+i)%7,x=H[d];if(x&&(i>0||now.h<x[0])){nx=(i===0?'today':i===1?'tomorrow':['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d])+' '+f(x[0]);break}}
  el.textContent=`${lab}: Closed · opens ${nx}`;el.classList.add('is-closed')}});
$$('table.hours tr[data-d="'+now.d+'"]').forEach(r=>r.classList.add('today'));
// reveal
const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'}):null;
$$('.rv').forEach(el=>io?io.observe(el):el.classList.add('in'));
// home roast picker
const hb=$('#home-beans');
if(hb){const cards=$$('.bean',hb);const show=lv=>{let c=0;cards.forEach(b=>{const ok=b.dataset.roast.split(' ').includes(lv)&&c<6;if(ok)c++;b.hidden=!ok;b.style.display=ok?'flex':''})};
 $$('.rp').forEach(b=>b.addEventListener('click',()=>{$$('.rp').forEach(x=>x.setAttribute('aria-selected','false'));b.setAttribute('aria-selected','true');show(b.dataset.pick);cards.forEach(c=>c.classList.add('in'))}));
 show('Vienna')}
// beans filter
const g=$('#bean-grid');
if(g){const cards=$$('.bean',g),cnt=$('#bean-count'),act={};
 const apply=()=>{let k=0;cards.forEach(c=>{let ok=true;for(const[f,vs]of Object.entries(act)){if(!vs.size)continue;const val=c.dataset[f]||'';if(![...vs].some(v=>val.includes(v)))ok=false}c.hidden=!ok;if(ok){k++;c.classList.add('in')}});cnt.textContent=k};
 $$('.chip[data-f]').forEach(ch=>ch.addEventListener('click',()=>{const f=ch.dataset.f,v=ch.dataset.v;act[f]=act[f]||new Set();const on=ch.getAttribute('aria-pressed')!=='true';ch.setAttribute('aria-pressed',on);on?act[f].add(v):act[f].delete(v);apply()}));
 const r=$('[data-reset]');if(r)r.addEventListener('click',()=>{for(const k in act)act[k].clear();$$('.chip[data-f]').forEach(c=>c.setAttribute('aria-pressed','false'));apply()})}
// wholesale form -> email
const fm=$('.wsform');
if(fm)fm.addEventListener('submit',ev=>{ev.preventDefault();const d=new FormData(fm);const b=[...d.entries()].map(([k,v])=>`${k}: ${v}`).join('\n');
 location.href=`mailto:${fm.dataset.mailto}?subject=${encodeURIComponent('Wholesale tasting request: '+(d.get('business')||''))}&body=${encodeURIComponent(b)}`});
// mobile action bar
const mb=$('.mbar');if(mb){const on=()=>mb.classList.toggle('show',scrollY>420);addEventListener('scroll',on,{passive:true});on()}
})();
