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
window.GCX={safety,osirisLinks,vt,copy};
})();
