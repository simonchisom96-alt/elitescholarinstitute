/* ESI Quiz Studio Ecosystem V24 — public-ready client layer; backend/API agnostic */
(()=>{'use strict';
const KEY='esi.quiz2.ecosystem.v24',RESP='esi.quiz2.responses.v24',COMMENTS='esi.quiz2.comments.v24',SOCIAL='esi.quiz2.social.v24',SET='esi.quiz2.public.settings.v24';
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const now=()=>Date.now(),uid=p=>`${p||'esi'}_${now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const slug=()=>{try{const p=new URLSearchParams(location.search);return p.get('quiz')||p.get('q')||''}catch{return''}};
const quiz=()=>{const a=read('esi.quiz2.share.v22',[]);return a.find(x=>x.slug===slug()&&x.status==='published')||null};
const qid=()=>quiz()?.id||slug()||'local';
const defaults={theme:'dark',sound:true,vibrate:true,highContrast:false,largeText:false,reduceMotion:false,language:'en',fontScale:1};
const settings=()=>({...defaults,...read(SET,{})});
function setSettings(p){const s={...settings(),...p};write(SET,s);return s}
function emit(type,payload={}){try{window.dispatchEvent(new CustomEvent('esi:quiz',{detail:{type,...payload}}))}catch{}}
/* response model */
function response(data={}){const r={id:uid('resp'),quizId:qid(),quizSlug:slug(),startedAt:data.startedAt||now(),submittedAt:data.submittedAt||now(),participant:String(data.participant||'Guest'),answers:clone(data.answers||[]),score:Number(data.score||0),percent:Number(data.percent||0),duration:Number(data.duration||0),status:data.status||'complete',device:'web'};const a=read(RESP,[]);a.push(r);write(RESP,a.slice(-500));emit('response', {response:r});return r}
function responses(id=qid()){return read(RESP,[]).filter(x=>x.quizId===id||x.quizSlug===id)}
function score(questions,answers){let points=0,max=0;questions.forEach((x,i)=>{const w=Number(x.points??1)||1;max+=w;const c=x.correct,a=answers[i];let ok=false;if(typeof c==='number')ok=a===c;else if(Array.isArray(c)&&Array.isArray(a))ok=JSON.stringify(c.slice().sort())===JSON.stringify(a.slice().sort());else if(c!=null)ok=String(c).trim().toLowerCase()===String(a??'').trim().toLowerCase();if(ok)points+=w});return{points,max,percent:max?Math.round(points/max*100):0}}
function leaderboard(id=qid()){return responses(id).filter(x=>x.status==='complete').sort((a,b)=>b.percent-a.percent||a.duration-b.duration).slice(0,100).map((x,i)=>({...x,rank:i+1}))}
function rankFor(percent,id=qid()){return leaderboard(id).findIndex(x=>x.percent<=percent)+1||leaderboard(id).length+1}
/* bookmarks / reactions / shares */
function social(){return read(SOCIAL,{bookmarks:[],likes:{},shares:0,views:{}})}
function bookmark(kind,id=qid(),value=true){const s=social();s.bookmarks=s.bookmarks.filter(x=>!(x.kind===kind&&x.id===id));if(value)s.bookmarks.push({kind,id,at:now()});write(SOCIAL,s);emit('bookmark',{kind,id,value});return s}
function isBookmarked(kind,id=qid()){return social().bookmarks.some(x=>x.kind===kind&&x.id===id)}
function like(target,id=qid()){const s=social();s.likes[target]=s.likes[target]||{count:0,liked:false};if(!s.likes[target].liked){s.likes[target].count++;s.likes[target].liked=true}else{s.likes[target].count=Math.max(0,s.likes[target].count-1);s.likes[target].liked=false}write(SOCIAL,s);emit('like',{target,id,state:s.likes[target]});return s.likes[target]}
function share(){const s=social();s.shares++;write(SOCIAL,s);emit('share');return s.shares}
function view(){const s=social();s.views[qid()]=(s.views[qid()]||0)+1;write(SOCIAL,s);return s.views[qid()]}
/* comments */
function comments(id=qid()){return read(COMMENTS,[]).filter(x=>x.quizId===id&&!x.deleted).sort((a,b)=>a.createdAt-b.createdAt)}
function addComment(text,meta={}){const t=String(text||'').trim().slice(0,1000);if(!t)return null;const c={id:uid('cmt'),quizId:qid(),author:String(meta.author||'Guest').slice(0,80),text:t,createdAt:now(),likes:0,replies:[],reported:false};const a=read(COMMENTS,[]);a.push(c);write(COMMENTS,a.slice(-2000));emit('comment',{comment:c});return c}
function reply(commentId,text,author='Guest'){const a=read(COMMENTS,[]),c=a.find(x=>x.id===commentId);if(!c||!String(text||'').trim())return null;(c.replies||(c.replies=[])).push({id:uid('reply'),author:String(author).slice(0,80),text:String(text).trim().slice(0,500),createdAt:now()});write(COMMENTS,a);emit('reply',{comment:c});return c}
function likeComment(id){const a=read(COMMENTS,[]),c=a.find(x=>x.id===id);if(!c)return null;c.likes=(c.likes||0)+1;write(COMMENTS,a);return c}
function reportComment(id){const a=read(COMMENTS,[]),c=a.find(x=>x.id===id);if(!c)return false;c.reported=true;write(COMMENTS,a);emit('report',{id});return true}
function deleteComment(id){const a=read(COMMENTS,[]),c=a.find(x=>x.id===id);if(!c)return false;c.deleted=true;write(COMMENTS,a);return true}
/* review/navigation */
function reviewState(answers,questions){return questions.map((x,i)=>({index:i,answered:answers[i]!==undefined&&answers[i]!==null&&answers[i]!=='',flagged:false,type:x.type||'mcq'}))}
function flag(index,value=true){const k=`${RESP}:flags:${qid()}`;const a=read(k,[]);if(value&&!a.includes(index))a.push(index);if(!value){const i=a.indexOf(index);if(i>-1)a.splice(i,1)}write(k,a);return a}
function flagged(){return read(`${RESP}:flags:${qid()}`,[])}
/* timers */
let timer=null;function startTimer(seconds,onTick,onEnd){clearInterval(timer);let left=Math.max(0,Number(seconds)||0);onTick?.(left);if(!left)return()=>{};timer=setInterval(()=>{left--;onTick?.(left);if(left<=0){clearInterval(timer);timer=null;onEnd?.()}},1000);return()=>{clearInterval(timer);timer=null}}
/* randomization */
function shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function randomizeQuestions(qs){return shuffle(qs||[])}
function randomizeOptions(q){if(!Array.isArray(q?.options))return q;const x=clone(q);x.options=shuffle(x.options);return x}
/* offline queue */
const queueKey=`${RESP}:queue`;
function queue(item){const a=read(queueKey,[]);a.push({...clone(item),id:item.id||uid('pending'),queuedAt:now()});write(queueKey,a.slice(-500));emit('queued',{item});return a.length}
function pending(){return read(queueKey,[])}
function clearPending(){write(queueKey,[]);return true}
/* analytics */
const EVENTS='esi.quiz2.analytics.v24';
function track(type,data={}){const a=read(EVENTS,[]);a.push({id:uid('evt'),quizId:qid(),type,at:now(),data:clone(data)});write(EVENTS,a.slice(-3000));emit('analytics',{type,data});return true}
function analytics(id=qid()){const a=read(EVENTS,[]).filter(x=>x.quizId===id),rs=responses(id);return{events:a.length,views:a.filter(x=>x.type==='view').length,starts:a.filter(x=>x.type==='start').length,submits:rs.length,completion:rs.length&&a.filter(x=>x.type==='start').length?Math.round(rs.length/a.filter(x=>x.type==='start').length*100):0,avgScore:rs.length?Math.round(rs.reduce((s,x)=>s+x.percent,0)/rs.length):0}}
/* search/filter */
function search(list,text){const t=String(text||'').trim().toLowerCase();if(!t)return list||[];return(list||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(t))}
/* accessibility */
function applyAccessibility(){const s=settings();const root=document?.documentElement;if(root){const dataset=root.dataset||(root.dataset={});dataset.contrast=s.highContrast?'high':'';dataset.motion=s.reduceMotion?'reduced':'';root.style?.setProperty?.('--esi-font-scale',String(s.fontScale||1));}document?.body?.classList?.toggle?.('esi-large-text',!!s.largeText);return s}
/* API contract: URLs only, credentials stay server-side */
const api={base:'',endpoints:{publish:'/api/quizzes',getQuiz:'/api/quizzes/:slug',responses:'/api/quizzes/:slug/responses',leaderboard:'/api/quizzes/:slug/leaderboard',comments:'/api/quizzes/:slug/comments',share:'/api/quizzes/:slug/share',notifications:'/api/notifications',status:'/api/status',chat:'/api/chat',rooms:'/api/rooms',ai:'/api/ai',media:'/api/media',analytics:'/api/quizzes/:slug/analytics'},configure(base){this.base=String(base||'').replace(/\/$/,'');return this},url(path){return this.base+String(path)},contract(){return clone({base:this.base,endpoints:this.endpoints})}};
/* feature registry */
const features=[
'publish','public-link','preview','copy-link','qr','share','responses','autosave','resume','progress','review','flag-question','timer','random-questions','random-options','scoring','partial-credit','leaderboard','rank','badges','streaks','comments','comment-replies','comment-likes','comment-reports','bookmarks','likes','views','notifications','status','chat','groups','live-rooms','presence','typing','polls','reactions','saved','archived','search','filters','dark-mode','accessibility','large-text','high-contrast','reduced-motion','vibration','sound','offline-queue','retry','analytics','completion-rate','average-score','question-analysis','attempt-history','participant-history','export-results','csv-ready','pdf-ready','share-image-ready','certificate-ready','webhook-ready','embed-ready','iframe-ready','deep-link-ready','social-preview-ready','og-metadata-ready','anti-duplicate-submit','attempt-id','device-session','tab-recovery','visibility-detection','network-detection','fullscreen','wake-lock','keyboard-navigation','touch-navigation','image-media','audio-media','video-media','rich-text','latex','code','matching','ordering','numeric','formula','hotspot','multi-select','fill-blank','case-study','slider','poll','yes-no','true-false','short-text','long-text','image-annotation','image-occlusion','drag-label','sequence','memory-state','API-adapter','backend-contract','secret-free-client'];
function audit(){return{version:24,features:features.slice(),apiConfigured:!!api.base,pending:pending().length,comments:comments().length,leaderboard:leaderboard().length,settings:settings(),quiz:!!quiz()}}
window.ESIQuizEcosystemV24={settings,setSettings,applyAccessibility,response,responses,score,leaderboard,rankFor,bookmark,isBookmarked,like,share,view,comments,addComment,reply,likeComment,reportComment,deleteComment,reviewState,flag,flagged,startTimer,shuffle,randomizeQuestions,randomizeOptions,queue,pending,clearPending,track,analytics,search,api,audit,features};
window.ESIQuizPublicV24=window.ESIQuizEcosystemV24;
window.addEventListener('online',()=>emit('online'));window.addEventListener('offline',()=>emit('offline'));document.addEventListener('visibilitychange',()=>track(document.hidden?'hidden':'visible'));applyAccessibility();
})();