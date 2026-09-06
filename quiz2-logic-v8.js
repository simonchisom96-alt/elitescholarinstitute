/* ESI Quiz Studio Logic V8
 * Conditional routing, branching, scoring rules, publish gates, media checks,
 * analytics, question-bank indexing, and provider-neutral AI/live adapters.
 * API-free: secrets and network credentials never belong in this file.
 */
(()=>{'use strict';
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
const txt=x=>String(x??'').trim();
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:0));
const id=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
const emit=(n,d={})=>{try{window.dispatchEvent(new CustomEvent('esi:logic:'+n,{detail:d}))}catch{}};

function quiz(){return window.state&&Array.isArray(window.state.questions)?window.state:read('esi.quiz2.draft.v7')?.quiz||{title:'Untitled Quiz',questions:[],sections:[],settings:{}}}
function questions(){return quiz().questions||[]}

/* 1. Conditional routing engine */
function condition(c,ctx={}){
 if(!c)return true;const actual=ctx[c.field]??ctx.answer??ctx.value;
 const op=c.op||c.operator||'equals', expected=c.value;
 if(op==='equals'||op==='eq')return String(actual)===String(expected);
 if(op==='notEquals'||op==='neq')return String(actual)!==String(expected);
 if(op==='contains')return String(actual??'').toLowerCase().includes(String(expected??'').toLowerCase());
 if(op==='gt')return Number(actual)>Number(expected);
 if(op==='gte')return Number(actual)>=Number(expected);
 if(op==='lt')return Number(actual)<Number(expected);
 if(op==='lte')return Number(actual)<=Number(expected);
 if(op==='in')return Array.isArray(expected)&&expected.map(String).includes(String(actual));
 return false;
}
function nextQuestion(index,answer,ctx={}){const q=questions()[index];if(!q)return null;const rules=Array.isArray(q.logic)?q.logic:[];for(const r of rules){if(condition(r.when||r.condition,{...ctx,answer,value:answer}))return r.action?.type==='end'?null:(r.action?.questionId??r.questionId??index+1)}return index+1<questions().length?index+1:null}
function route(answer,index=0,ctx={}){const next=nextQuestion(index,answer,ctx);emit('routed',{index,answer,next});return next}

/* 2. Scoring modifiers / mastery */
function applyScore(base,rules=[],ctx={}){let points=Number(base)||0;for(const r of rules){if(condition(r.when||r.condition,ctx)){if(r.type==='multiply')points*=Number(r.value??1);else if(r.type==='add')points+=Number(r.value??0);else if(r.type==='cap')points=Math.min(points,Number(r.value??points));else if(r.type==='set')points=Number(r.value??points)}}return Math.max(0,Math.round(points*100)/100)}
function mastery(rows=[]){const graded=rows.filter(r=>r.correct===true||r.correct===false);if(!graded.length)return{score:0,evidence:0,band:'No evidence'};const score=graded.filter(r=>r.correct).length/graded.length*100;return{score:Math.round(score*100)/100,evidence:graded.length,band:score>=85?'Mastered':score>=70?'Strong':score>=50?'Developing':'Needs review'}}

/* 3. Question bank/index engine */
function bankIndex(qs=questions()){const map={};qs.forEach((q,i)=>{const tags=Array.isArray(q.tags)?q.tags:[];for(const tag of tags){const k=txt(tag).toLowerCase();if(!map[k])map[k]=[];map[k].push(q.id??i)}});return map}
function findByTag(tag){const key=txt(tag).toLowerCase();return questions().filter(q=>(q.tags||[]).map(x=>txt(x).toLowerCase()).includes(key))}
function duplicateGroups(qs=questions()){const m={};qs.forEach((q,i)=>{const k=txt(q.text||q.question).toLowerCase().replace(/\s+/g,' ');if(k){m[k]??=[];m[k].push(q.id??i)}});return Object.values(m).filter(x=>x.length>1)}

/* 4. Media integrity engine */
function mediaAudit(root=document){const issues=[];root.querySelectorAll('img,video,audio,source').forEach((el,i)=>{const src=el.currentSrc||el.src||el.getAttribute('src');if(!src)issues.push({index:i,kind:'missing-src',tag:el.tagName.toLowerCase()});if(el.tagName==='IMG'&&!txt(el.alt))issues.push({index:i,kind:'missing-alt'});});return{valid:!issues.length,count:issues.length,issues}}

/* 5. Analytics engine */
function analytics(rows=[],questionsList=questions()){const out={total:rows.length,answered:0,correct:0,byQuestion:[],byType:{},time:{sum:0,count:0}};rows.forEach((r,i)=>{if(r.answer!==undefined&&r.answer!==null&&txt(r.answer)!=='')out.answered++;if(r.correct===true)out.correct++;const q=questionsList[i]||{};const type=q.type||'unknown';out.byType[type]??={attempts:0,correct:0};out.byType[type].attempts++;if(r.correct===true)out.byType[type].correct++;if(Number.isFinite(+r.time)){out.time.sum+=+r.time;out.time.count++}out.byQuestion.push({index:i,id:q.id??i,correct:r.correct===true,time:Number(r.time)||0});});out.accuracy=out.answered?Math.round(out.correct/out.answered*10000)/100:0;out.avgTime=out.time.count?Math.round(out.time.sum/out.time.count*100)/100:0;return out}

/* 6. Publish/preview gate */
function publishCheck(q=quiz()){const errors=[],warnings=[];if(!txt(q.title))errors.push('Add a quiz title');if(!(q.questions||[]).length)errors.push('Add at least one question');(q.questions||[]).forEach((x,i)=>{if(!txt(x.text||x.question||x.prompt))errors.push('Question '+(i+1)+' has no prompt');if(['mcq','multi','tf','yesno'].includes(txt(x.type).toLowerCase())&&(x.options||[]).length<2)errors.push('Question '+(i+1)+' needs answer choices');if(x.media?.src&&!txt(x.media.alt))warnings.push('Question '+(i+1)+' media needs alt text');});return{ready:!errors.length,errors,warnings,checkedAt:Date.now()}}
function publishSnapshot(q=quiz()){const gate=publishCheck(q);if(!gate.ready)throw Error('Publish check failed: '+gate.errors.join('; '));const p={id:id('publish'),schema:'ESI-PUBLISHED-V8',createdAt:new Date().toISOString(),quiz:clone(q)};write('esi.quiz2.published.v8',p);emit('published',p);return p}
function preview(q=quiz()){return{mode:'preview',quiz:clone(q),checked:publishCheck(q),createdAt:Date.now()}}

/* 7. Provider-neutral AI adapter. No API key fields. */
function aiRequest(kind,input,options={}){const req={id:id('ai'),schema:'ESI-AI-REQUEST-V8',kind,input:clone(input),options:clone(options),createdAt:Date.now(),transport:'server-adapter-required',secretPolicy:'credentials-server-side-only'};const queue=read('esi.quiz2.ai.v8',[]);queue.push(req);write('esi.quiz2.ai.v8',queue.slice(-50));emit('ai-requested',req);return req}
function aiQueue(){return read('esi.quiz2.ai.v8',[])}

/* 8. Live-session state engine */
function liveSession(action,payload={}){const key='esi.quiz2.live.v8';let s=read(key,{status:'idle',participants:{},answers:{},events:[]});if(action==='start')s={...s,status:'lobby',roomId:payload.roomId||id('room'),startedAt:Date.now(),participants:{},answers:{},events:[]};if(action==='join'){s.participants[payload.id||id('p')]={id:payload.id||id('p'),name:txt(payload.name)||'Participant',joinedAt:Date.now(),online:true}}if(action==='answer')s.answers[payload.questionId]={participantId:payload.participantId,answer:clone(payload.answer),at:Date.now()};if(action==='close')s.status='closed';s.events.push({action,at:Date.now()});write(key,s);emit('live',s);return s}

/* 9. Privacy/security self-audit */
function securityAudit(){const textBlob=[...document.scripts].map(s=>s.src||s.textContent||'').join('\n');const suspicious=/(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,})/g;const hits=textBlob.match(suspicious)||[];return{safe:!hits.length,credentialLikeStrings:hits.length,policy:'Do not ship provider credentials in client HTML/JS'}}

/* 10. Self-test: read-only and deterministic */
function selfTest(){const sample={title:'ESI Test',questions:[{id:'a',type:'mcq',text:'Test?',options:[{text:'A',correct:true},{text:'B',correct:false}]}],sections:[],settings:{}};const checks=[['publish',publishCheck(sample).ready],['routing',nextQuestion(0,'A',{})===null],['score',applyScore(2,[{type:'multiply',value:2}],{})===4],['mastery',mastery([{correct:true}]).score===100]];const result={version:8,pass:checks.every(x=>x[1]),checks};emit('selftest',result);return result}

function boot(){const api={version:8,condition,nextQuestion,route,applyScore,mastery,bankIndex,findByTag,duplicateGroups,mediaAudit,analytics,publishCheck,publishSnapshot,preview,aiRequest,aiQueue,liveSession,securityAudit,selfTest};window.ESIQuizLogicV8=api;window.ESIQuizEngines=Object.assign(window.ESIQuizEngines||{},api);emit('ready',{version:8});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
