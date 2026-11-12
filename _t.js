/* SiteLift demo visit beacon v2 (sitelift-demos, vinaynay9/demos, ronandvin.com) -> Supabase sitelift.vinay_email_events.
   Open any demo with ?me=1 once to stop counting your own visits on that browser.
   Events (kind): visit (page load: referrer, screen, tz, language), stay (still on the page at 20s),
   time (active-time milestones 1/2/5/10/20 min, visible tab only), scroll (deepest point 25/50/75/90/100%),
   section (a section stayed half on screen for 1s), click (every click: what, link type, which section),
   copy (text copied, e.g. the phone number), form (field focused / form submitted), media (video/audio played),
   leave (tab hidden or closed: total active seconds, max scroll, clicks), return (came back to the tab).
   Every event carries sid (one id per browser tab session) and n (its order), so a session can be replayed in order.
   Keep the copy in the ronandvin repo (src/lib/demo-template/beacon.ts DEMO_BEACON_JS) identical to this file. */
(function(){try{
var U="https://fvybuorqivjmfsmakxlw.supabase.co/functions/v1/vin-visit",q=new URLSearchParams(location.search),S=sessionStorage,L=localStorage,D=document;
if(q.get("me")==="1")L.slme="1";if(L.slme||navigator.webdriver)return;
var r=q.get("r")||S.slr||"";if(r)S.slr=r;
var sid=S.slsid||(S.slsid=Math.random().toString(36).slice(2,10)),n=0,clicks=0,maxd=0;
function send(o){if(++n>200)return;o.p=location.pathname;o.h=location.host;o.r=r;o.sid=sid;o.n=n;var b=JSON.stringify(o);
 if(navigator.sendBeacon&&navigator.sendBeacon(U,new Blob([b],{type:"text/plain"})))return;
 fetch(U,{method:"POST",body:b,keepalive:true,mode:"no-cors"});}
function txt(s,k){return String(s||"").replace(/\s+/g," ").trim().slice(0,k||60);}
function lab(el){if(!el)return"";var h=el.querySelector&&el.querySelector("h1,h2,h3");return txt(el.id||(h&&h.textContent)||el.getAttribute("aria-label")||el.className||el.tagName,50);}
function sec(el){var s=el&&el.closest&&el.closest("section,header,footer,nav,main>div,[id]");return lab(s);}
function depth(){var h=D.documentElement,sh=Math.max(h.scrollHeight,D.body?D.body.scrollHeight:0),vh=innerHeight;return sh<=vh?100:Math.min(100,Math.round((scrollY+vh)/sh*100));}
/* active (visible) time */
var act=0,since=D.visibilityState==="visible"?Date.now():0;
function secs(){return Math.round((act+(since?Date.now()-since:0))/1000);}
send({ref:document.referrer,vw:innerWidth,vh:innerHeight,tz:(Intl.DateTimeFormat().resolvedOptions().timeZone||""),lang:navigator.language||"",touch:("ontouchstart" in window)?1:0});
setTimeout(function(){if(D.visibilityState!=="hidden")send({e:"stay",s:20});},20000);
var T=[60,120,300,600,1200],ti=0;
setInterval(function(){var a=secs();while(ti<T.length&&a>=T[ti]){send({e:"time",s:T[ti],d:maxd});ti++;}},5000);
/* scroll depth */
var M=[25,50,75,90,100],mi=0,st;
function onScroll(){var d=depth();if(d>maxd)maxd=d;while(mi<M.length&&maxd>=M[mi]){send({e:"scroll",d:M[mi]});mi++;}}
addEventListener("scroll",function(){clearTimeout(st);st=setTimeout(onScroll,250);},{passive:true});
/* sections actually looked at */
if(window.IntersectionObserver){var seen={},tm={};
 var io=new IntersectionObserver(function(es){es.forEach(function(x){var k=lab(x.target);if(!k||seen[k])return;
  var on=x.isIntersecting&&x.intersectionRect.height>=Math.min(x.boundingClientRect.height,innerHeight)*0.5;
  if(on){if(!tm[k])tm[k]=setTimeout(function(){seen[k]=1;send({e:"section",l:k,s:secs()});},1000);}else{clearTimeout(tm[k]);tm[k]=0;}});},{threshold:[0,.25,.5,.75,1]});
 var go=function(){D.querySelectorAll("section,header,footer").forEach(function(el){io.observe(el);});};
 D.readyState==="loading"?D.addEventListener("DOMContentLoaded",go):go();}
/* every click */
D.addEventListener("click",function(ev){var t=ev.target;if(!t||!t.closest)return;clicks++;
 var el=t.closest("a,button,[role=button],input,select,textarea,summary,label,img,video,[onclick]")||t,o={e:"click",tag:el.tagName.toLowerCase(),l:txt(el.getAttribute("aria-label")||el.alt||el.innerText||el.value||el.title),sec:sec(el),s:secs()};
 var a=el.closest("a");if(a&&a.getAttribute("href")){var h=a.getAttribute("href");o.href=h.slice(0,200);
  o.a=/^tel:/i.test(h)?"call":/^sms:/i.test(h)?"text":/^mailto:/i.test(h)?"email":/maps\.(google|apple)|goo\.gl\/maps|maps\.app/i.test(h)?"map":/^#/.test(h)?"jump":(a.host&&a.host!==location.host)?"out":"page";}
 send(o);},true);
D.addEventListener("copy",function(){send({e:"copy",l:txt(String(window.getSelection&&getSelection()),80),s:secs()});});
var ff={};D.addEventListener("focusin",function(ev){var t=ev.target;if(!t||!/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))return;var k=t.name||t.id||t.type;if(ff[k])return;ff[k]=1;send({e:"form",a:"focus",l:txt(k,40)});});
D.addEventListener("submit",function(ev){send({e:"form",a:"submit",l:txt(ev.target&&(ev.target.id||ev.target.getAttribute("action")),60)});},true);
D.addEventListener("play",function(ev){var t=ev.target;send({e:"media",tag:(t&&t.tagName||"").toLowerCase(),l:txt(t&&(t.currentSrc||t.src),120),s:secs()});},true);
/* leave / return */
var gone=0;
function leave(){if(gone)return;gone=1;if(since){act+=Date.now()-since;since=0;}send({e:"leave",s:secs(),d:maxd,c:clicks});}
D.addEventListener("visibilitychange",function(){if(D.visibilityState==="hidden")leave();else{since=Date.now();if(gone){gone=0;send({e:"return",s:secs()});}}});
addEventListener("pagehide",leave);
}catch(e){}})();
