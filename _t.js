/* SiteLift demo visit beacon -> Supabase sitelift.vinay_email_events. Open any demo with ?me=1 once to stop counting your own visits on that browser. */
(function(){try{
var U="https://fvybuorqivjmfsmakxlw.supabase.co/functions/v1/vin-visit",q=new URLSearchParams(location.search);
if(q.get("me")==="1")localStorage.slme="1";if(localStorage.slme||navigator.webdriver)return;
var r=q.get("r")||sessionStorage.slr||"";if(r)sessionStorage.slr=r;
function send(o){o.p=location.pathname;o.r=r;var b=JSON.stringify(o);
 if(navigator.sendBeacon&&navigator.sendBeacon(U,new Blob([b],{type:"text/plain"})))return;
 fetch(U,{method:"POST",body:b,keepalive:true,mode:"no-cors"});}
send({ref:document.referrer});
setTimeout(function(){if(document.visibilityState!=="hidden")send({e:"stay",s:20});},20000);
}catch(e){}})();
