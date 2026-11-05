/* Partilhado pelas páginas 2 e 3: pontuação transparente (heurística, não é uma verificação). */
(function(){
const KNOWN=/(^|\.)(wikipedia\.org|wikidata\.org|wikimedia\.org|archive\.org|github\.com|github\.io|openlibrary\.org|crossref\.org|doi\.org|openalex\.org|ycombinator\.com|virustotal\.com|osirisai\.live|gov|edu|europa\.eu|gov\.pt|pt)$/i;
const BADTLD=/\.(zip|mov|xyz|top|click|link|work|gq|tk|ml|cf|ga|rest|country|loan|kim|cam)$/i;
function safety(u,o){o=o||{};const why=[];let s=50,x;
 try{x=new URL(u)}catch(e){return{s:0,why:['endereço inválido']}}
 const h=x.hostname;
 if(/\.onion$/i.test(h)){return{s:5,why:['endereço .onion: só abre no Tor, não verificado']}}
 if(x.protocol==='https:'){s+=20;why.push('+20 HTTPS')}else{s-=30;why.push('−30 sem HTTPS')}
 if(/^\d+\.\d+\.\d+\.\d+$/.test(h)||h.includes(':')){s-=30;why.push('−30 endereço IP')}
 if(KNOWN.test(h)){s+=20;why.push('+20 domínio conhecido')}
 if(BADTLD.test(h)){s-=20;why.push('−20 domínio de topo frequentemente abusado')}
 if(o.fav){s+=10;why.push('+10 favorito')}
 if(o.demo){s-=25;why.push('−25 site simulado da página 1 (não existe na internet)')}
 return{s:Math.max(0,Math.min(100,s)),why}}
function osirisLinks(){const b='https://www.osirisai.live/?layers=';return[['Osiris · marítimo',b+'maritime'],['Osiris · aviões',b+'flights'],['Osiris · câmaras',b+'cctv'],['Osiris · tudo',b+'flights,maritime,cctv']]}
const vt=u=>'https://www.virustotal.com/gui/search/'+encodeURIComponent(u);
async function copy(t){try{await navigator.clipboard.writeText(t);return true}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();const r=document.execCommand('copy');a.remove();return r}}

/* ---- Fontes públicas (CORS verificado) e objetivo partilhado ---- */
const strip=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#0?39;/g,"'").trim();
async function j(sig,u){const c=new AbortController(),t=setTimeout(()=>c.abort('timeout'),15000),on=()=>c.abort('cancel');if(sig){if(sig.aborted)throw new Error('cancelado');sig.addEventListener('abort',on)}
 try{const r=await fetch(u,{signal:c.signal});if(!r.ok&&r.status!==202)throw new Error('HTTP '+r.status);return await r.json()}
 catch(e){throw new Error(sig&&sig.aborted?'cancelado':c.signal.aborted?'sem resposta (15 s)':(navigator.onLine?e.message:'sem internet'))}finally{clearTimeout(t);sig&&sig.removeEventListener('abort',on)}}
const E=encodeURIComponent;
// cada fonte: nome, autoridade (0–20), função que devolve [{t,u,s}]
const SRC=[
['Wikipédia (pt)',20,async (q,sig)=>(await j(sig,`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${E(q)}&format=json&origin=*&srlimit=10`)).query.search.map(x=>({t:x.title,u:'https://pt.wikipedia.org/wiki/'+E(x.title.replace(/ /g,'_')),s:strip(x.snippet)}))],
['Wikidata',15,async (q,sig)=>(await j(sig,`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${E(q)}&language=pt&uselang=pt&format=json&origin=*&limit=8`)).search.map(x=>({t:x.label||x.id,u:'https://www.wikidata.org/wiki/'+x.id,s:x.description||''}))],
['DuckDuckGo (resposta rápida)',12,async (q,sig)=>{const d=await j(sig,`https://api.duckduckgo.com/?q=${E(q)}&format=json&no_html=1&skip_disambig=1`),o=[];if(d.AbstractURL)o.push({t:d.Heading||q,u:d.AbstractURL,s:d.AbstractText||''});(d.RelatedTopics||[]).flatMap(x=>x.Topics||[x]).slice(0,8).forEach(x=>x.FirstURL&&o.push({t:strip(x.Text).slice(0,90)||x.FirstURL,u:x.FirstURL,s:strip(x.Text)}));return o}],
['Internet Archive',15,async (q,sig)=>(await j(sig,`https://archive.org/advancedsearch.php?q=${E(q)}&fl[]=identifier&fl[]=title&fl[]=description&rows=10&output=json`)).response.docs.map(x=>({t:strip(Array.isArray(x.title)?x.title[0]:x.title)||x.identifier,u:'https://archive.org/details/'+x.identifier,s:strip(Array.isArray(x.description)?x.description[0]:x.description).slice(0,200)}))],
['Open Library',14,async (q,sig)=>(await j(sig,`https://openlibrary.org/search.json?q=${E(q)}&limit=10&fields=key,title,author_name,first_publish_year`)).docs.map(x=>({t:x.title,u:'https://openlibrary.org'+x.key,s:[(x.author_name||[]).slice(0,2).join(', '),x.first_publish_year].filter(Boolean).join(' · ')}))],
['Crossref (artigos)',14,async (q,sig)=>(await j(sig,`https://api.crossref.org/works?query=${E(q)}&rows=8&select=DOI,title,container-title`)).message.items.map(x=>({t:(x.title||[])[0]||x.DOI,u:'https://doi.org/'+x.DOI,s:(x['container-title']||[])[0]||''}))],
['GitHub',10,async (q,sig)=>(await j(sig,`https://api.github.com/search/repositories?q=${E(q)}&per_page=8`)).items.map(x=>({t:x.full_name,u:x.html_url,s:(x.description||'')+' · ★'+x.stargazers_count}))],
['Hacker News',8,async (q,sig)=>(await j(sig,`https://hn.algolia.com/api/v1/search?query=${E(q)}&hitsPerPage=8&tags=story`)).hits.filter(x=>x.url||x.objectID).map(x=>({t:x.title||x.story_title||'(sem título)',u:x.url||'https://news.ycombinator.com/item?id='+x.objectID,s:(x.points||0)+' pontos'}))]];

async function searchAll(q,sig,cb){await Promise.all(SRC.map(async([n,a,f])=>{try{const r=(await f(q,sig)).filter(x=>x&&x.u).map(x=>({...x,src:n,auth:a}));cb(n,{s:r.length+' resultados',ok:1,n:r.length},r)}catch(e){cb(n,{s:'erro ('+e.message+')',err:1},null)}}))}
const GK='gc_goal_v1',GS='gc_goal_status_v1',FK='gc_found_v1';
function getGoal(){try{const g=JSON.parse(localStorage.getItem(GK));return g&&g.g?g:null}catch(e){return null}}
function getStatus(){try{return JSON.parse(localStorage.getItem(GS))}catch(e){return null}}
function emit(n){dispatchEvent(new Event(n))}
function storeFound(g,items){try{let F=JSON.parse(localStorage.getItem(FK)||'[]');const have=new Set(F.map(x=>x.url));items.forEach(x=>{if(have.has(x.u))return;have.add(x.u);F.push({k:x.u,titulo:x.t,url:x.u,resumo:(x.s||'').slice(0,200),fonte:x.src,objetivo:g,hora:Date.now(),origem:'objetivo «'+g+'» · '+x.src})});
 localStorage.setItem(FK,JSON.stringify(F.slice(-400)));emit('gc-found')}catch(e){}}
let gAC,gT;
function runGoal(g){clearTimeout(gT);if(gAC)gAC.abort();if(!g)return;gT=setTimeout(async()=>{gAC=new AbortController();const sig=gAC.signal,st={g,state:'a procurar…',src:{},n:0,t:Date.now()};
 const put=()=>{if(sig.aborted)return;try{localStorage.setItem(GS,JSON.stringify(st))}catch(e){}emit('gc-goal-status')};SRC.forEach(([n])=>st.src[n]={s:'a procurar…'});put();
 const all=[];await searchAll(g,sig,(n,v,r)=>{if(sig.aborted)return;st.src[n]=v;if(r){all.push(...r);storeFound(g,r)}st.n=all.length;put()});
 if(sig.aborted)return;st.state=all.length+' links';st.done=Date.now();put()},400)}
function putStatus(o){try{localStorage.setItem(GS,JSON.stringify(Object.assign({t:Date.now()},o)))}catch(e){}emit('gc-goal-status')}
function setGoal(w,o){w=String(w||'').trim();const cur=getGoal();if(w===(cur&&cur.g||''))return; if(!w){localStorage.removeItem(GK);localStorage.removeItem(GS);if(gAC)gAC.abort();clearTimeout(gT);emit('gc-goal');return}
 localStorage.setItem(GK,JSON.stringify({g:w,t:Date.now()}));emit('gc-goal');if(!(o&&o.noRun))runGoal(w);else{if(gAC)gAC.abort();clearTimeout(gT);putStatus({g:w,state:'a procurar (página 3)…',src:{}})}}
addEventListener('storage',e=>{if(e.key===GK)emit('gc-goal');if(e.key===GS)emit('gc-goal-status');if(e.key===FK)emit('gc-found')});
window.GCX={safety,osirisLinks,vt,copy,strip,SRC,searchAll,getGoal,getStatus,setGoal,runGoal,storeFound,putStatus};
})();
