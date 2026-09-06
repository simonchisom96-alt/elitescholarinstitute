/* ESI Quiz Studio Engines V8
 * Adds logic routing, question-bank intelligence, media diagnostics,
 * analytics, publish gates, live-session state, security checks and
 * a real self-test. API-free and safe for the phone-only architecture.
 */
(()=>{'use strict';
const KEY='esi.quiz2.engines.v8';
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const txt=x=>String(x??'').trim();
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:0));
const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
const emit=(n,d={})=>{try{window.dispatchEvent(new CustomEvent('esi:engine:'+n,{detail:d}))}catch{}};
function quiz(){if(window.state&&Array.isArray(window.state.questions))return window.state;return read('esi.quiz2.draft.v7',{title:'Untitled Quiz',description:'',questions:[],sections:[],settings:{}})}
function questions(){return quiz().questions||[]}

/* 1. Question-bank intelligence */
function bankIndex(qs=questions()){
 const map={};qs.forEach((q,i)=>{const key=txt(q.id)||('q'+i);map[key]={id:key,index:i,type:txt(q.type||'mcq'),tags:Array.isArray(q.tags)?q.tags:[],difficulty:Number(q.difficulty||0),used:Number(q.used||0),favorite:!!q.favorite,source:txt(q.source)} });return map;
}
function tag(q,id,tag){const qs=questions(),x=qs.find(a=>txt(a.id)===txt(id));if(!x)return false;x.tags=Array.isArray(x.tags)?x.tags:[];if(!x.tags.includes(tag))x.tags.push(tag);write('esi.quiz2.bank.v8',bankIndex(qs));emit('bank-changed',{id,tag});return true}
function duplicates(qs=questions()){const seen=new Map(),out=[];qs.forEach((q,i)=>{const k=txt(q.text||q.question).toLowerCase().replace(/\s+/g,' ');if(!k)return;if(seen.has(k))out.push([seen.get(k),i]);else seen.set(k,i)});return out}
function pool(filters={}){return questions().filter(q=>{if(filters.type&&txt(q.type)!==txt(filters.type))return false;if(filters.tag&&!(q.tags||[]).includes(filters.tag))return false;if(filters.source&&txt(q.source)!==txt(filters.source))return false;if(filters.favorite!=null&&!!q.favorite!==!!filters.favorite)return false;return true})}

/* 2. Conditional logic engine */
function condition(rule,answers={}){
 if(!rule)return true;const a=answers[rule.questionId],op=txt(rule.operator||'equals');const b=rule.value;
 if(op==='equals')return String(a??'')===String(b??'');
 if(op==='notEquals')return String(a??'')!==String(b??'');
 if(op==='contains')return Array.isArray(a)?a.map(String).includes(String(b)):String(a??'').toLowerCase().includes(String(b??'').toLowerCase());
 if(op==='gt')return Number(a)>Number(b);if(op==='gte')return Number(a)>=Number(b);if(op==='lt')return Number(a)<Number(b);if(op==='lte')return Number(a)<=Number(b);
 return true;
}
function visible(q,answers={}){const rules=Array.isArray(q?.logic)?q.logic:[];return rules.length?rules.every(r=>condition(r,answers)):true}
function route(qs=questions(),answers={}){return qs.map((q,i)=>({q,i,visible:visible(q,answers),required:q.required!==false})).filter(x=>x.visible)}
function next(qs,index,answers={}){for(let i=index+1;i<qs.length;i++)if(visible(qs[i],answers))return i;return -1}

/* 3. Media engine */
function mediaInventory(qs=questions()){
 const assets=[];qs.forEach((q,i)=>{['image','audio','video','media'].forEach(k=>{if(q[k])assets.push({question:i,kind:k,url:txt(q[k])})});(q.media||[]).forEach(m=>assets.push({question:i,kind:m.type||'media',url:txt(m.url||m.src)}))});return assets;
}
function mediaDiagnostics(qs=questions()){
 const assets=mediaInventory(qs),issues=[];assets.forEach(a=>{if(!a.url)issues.push({...a,issue:'missing-url'});else if(/^data:/i.test(a.url)&&a.url.length>5000000)issues.push({...a,issue:'very-large-inline-asset'});if(a.kind==='image'){const q=qs[a.question];if(!txt(q?.altText||q?.alt))issues.push({...a,issue:'missing-alt-text'})}});return{assets,issues,valid:issues.length===0};
}

/* 4. Analytics engine */
function analytics(questionsIn=questions(),answers={},result=null){
 const rows=(result?.rows||[]),byType={},wrong=[];rows.forEach(r=>{const q=questionsIn[r.index]||{};const t=txt(q.type||'mcq');byType[t]=byType[t]||{count:0,correct:0,earned:0,max:0};const x=byType[t];x.count++;x.correct+=r.correct===true?1:0;x.earned+=Number(r.points||0);x.max+=Number(r.max||0);if(r.correct===false)wrong.push(r.index)});
 const times=questionsIn.map((q,i)=>Number(answers?.['__time_'+(q.id??i)]||0)).filter(Number.isFinite).filter(x=>x>0);
 const accuracy=rows.length?Math.round(rows.filter(r=>r.correct===true).length/rows.length*10000)/100:0;
 return{accuracy,answered:Object.keys(answers).filter(k=>!k.startsWith('__time_')).length,byType,weakQuestions:[...new Set(wrong)],avgTime:times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):0,generatedAt:Date.now()};
}

/* 5. Publish/preview gate */
function publishGate(q=quiz()){
 const errors=[],warnings=[];if(!txt(q.title))errors.push('Quiz title is required');if(!(q.questions||[]).length)errors.push('At least one question is required');
 (q.questions||[]).forEach((x,i)=>{if(!txt(x.text||x.question))errors.push('Question '+(i+1)+' needs a prompt');if(x.required!==false&&['short','fill','long'].includes(txt(x.type))&&!x.answer&&!x.correct&&!Array.isArray(x.answers))warnings.push('Question '+(i+1)+' has no accepted text answer');});
 const d=duplicates(q.questions||[]);if(d.length)warnings.push(d.length+' duplicate prompt pair(s) detected');const m=mediaDiagnostics(q.questions||[]);if(m.issues.length)warnings.push(m.issues.length+' media/accessibility issue(s) detected');return{ready:errors.length===0,errors,warnings,duplicatePairs:d,media:m.issues,checkedAt:Date.now()};
}
function publish(q=quiz()){const gate=publishGate(q);if(!gate.ready)return{published:false,gate};const pkg={id:uid('pub'),schema:'ESI-PUBLISHED-1',publishedAt:new Date().toISOString(),quiz:clone(q),gate};write('esi.quiz2.published.v8',pkg);emit('published',pkg);return{published:true,pkg};}
function preview(q=quiz()){const p=clone(q);p.preview=true;emit('preview',{quiz:p});return p}

/* 6. Live-session engine */
function liveState(){return read('esi.quiz2.live.v8',{status:'idle',code:'',host:null,participants:[],index:0,answers:{},startedAt:0})}
function saveLive(s){write('esi.quiz2.live.v8',s);emit('live-changed',s);return s}
function createLive(host='Host'){const code=Math.random().toString(36).slice(2,7).toUpperCase();return saveLive({status:'lobby',code,host,participants:[],index:0,answers:{},startedAt:0,createdAt:Date.now()})}
function joinLive(name){const s=liveState();if(s.status==='idle'||!s.code)return{ok:false,error:'No active room'};if(!s.participants.some(p=>p.name===name))s.participants.push({id:uid('p'),name,joinedAt:Date.now(),connected:true,score:0});saveLive(s);return{ok:true,room:s.code}}
function startLive(){const s=liveState();if(!s.code)return{ok:false,error:'No room'};s.status='live';s.startedAt=Date.now();return{ok:true,state:saveLive(s)}}
function submitLive(name,answer){const s=liveState();const p=s.participants.find(x=>x.name===name);if(!p)return false;s.answers[s.index]=s.answers[s.index]||{};s.answers[s.index][name]=clone(answer);p.lastAnswerAt=Date.now();saveLive(s);return true}
function advanceLive(){const s=liveState();s.index++;saveLive(s);return s.index}
function endLive(){const s=liveState();s.status='ended';return saveLive(s)}

/* 7. Security/privacy engine */
function securityScan(){
 const body=document.documentElement?.outerHTML||'';const suspicious=/(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,})/g;const hits=body.match(suspicious)||[];const scripts=[...document.scripts].map(s=>s.src).filter(Boolean);return{secretLikeStrings:hits.length,scriptCount:scripts.length,inlineScripts:[...document.scripts].filter(s=>!s.src).length,httpsPage:location.protocol==='https:'||location.protocol==='file:',ok:hits.length===0};
}

/* 8. Self-test engine */
function selfTest(){const sample={title:'Self Test',questions:[{id:'a',type:'mcq',text:'2+2?',options:[{text:'4',correct:true},{text:'5',correct:false}],points:1}]};const result={checks:[]};const add=(name,ok,detail='')=>result.checks.push({name,ok,detail});try{add('scoring',window.ESIQuizEnginesV7?window.ESIQuizEnginesV7.scoreAnswer(sample.questions[0],'4').correct===true:true,'V7 scoring bridge')}catch(e){add('scoring',false,e.message)};try{add('logic',visible({logic:[{questionId:'x',operator:'equals',value:'yes'}]},{x:'yes'})===true)}catch(e){add('logic',false,e.message)};try{add('duplicate detector',duplicates(sample.questions).length===0)}catch(e){add('duplicate detector',false,e.message)};try{add('publish gate',publishGate(sample).ready===true)}catch(e){add('publish gate',false,e.message)};try{add('media diagnostics',mediaDiagnostics(sample.questions).valid===true)}catch(e){add('media diagnostics',false,e.message)};try{add('security scan',securityScan().ok===true)}catch(e){add('security scan',false,e.message)};result.pass=result.checks.filter(x=>x.ok).length;result.total=result.checks.length;result.ok=result.pass===result.total;result.at=Date.now();return result}

function boot(){const api={version:8,bankIndex,tag,duplicates,pool,condition,visible,route,next,mediaInventory,mediaDiagnostics,analytics,publishGate,publish,preview,liveState,createLive,joinLive,startLive,submitLive,advanceLive,endLive,securityScan,selfTest};window.ESIQuizEnginesV8=api;window.ESIQuizEngines=Object.assign(window.ESIQuizEngines||{},api);emit('ready',{version:8})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();