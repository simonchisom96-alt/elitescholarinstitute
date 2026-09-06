/* ESI Quiz Studio Engines V7
 * API-free, phone-safe engines for builder quality, scoring, logic, autosave,
 * adaptive sequencing, search, templates, accessibility and offline recovery.
 * No secrets. Network adapters remain optional.
 */
(()=>{'use strict';
const NS='esi.quiz2.engines.v7';
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
const read=(k,d)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x==null?d:x}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const id=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:0));
const text=x=>String(x??'').trim();
const emit=(n,d={})=>{try{window.dispatchEvent(new CustomEvent('esi:engine:'+n,{detail:d}))}catch{}};

const TYPES={mcq:{label:'Multiple choice',answers:'single'},multi:{label:'Multiple select',answers:'multi'},tf:{label:'True / False',answers:'single'},short:{label:'Short text',answers:'text'},long:{label:'Long answer',answers:'text'},fill:{label:'Fill in the blank',answers:'text'},numeric:{label:'Numeric',answers:'numeric'},matching:{label:'Matching',answers:'pairs'},ordering:{label:'Ordering',answers:'order'},poll:{label:'Poll',answers:'poll'},scale:{label:'Scale',answers:'scale'},image:{label:'Image question',answers:'single'},audio:{label:'Audio question',answers:'single'},video:{label:'Video question',answers:'single'},code:{label:'Code response',answers:'code'}};

function getQuestions(){
 const s=window.state;
 if(s&&Array.isArray(s.questions))return s.questions;
 try{if(window.ESIQuizStudioV3&&Array.isArray(window.ESIQuizStudioV3.questions))return window.ESIQuizStudioV3.questions}catch{}
 return [];
}
function getQuiz(){return window.state||read('esi.quiz2.draft',{title:'Untitled Quiz',description:'',questions:[],sections:[],settings:{}})}

/* 1. Schema + integrity engine */
function validateQuestion(q,i=0){
 const errors=[],warnings=[];q=q||{};const type=text(q.type||q.kind||'mcq').toLowerCase();
 if(!text(q.text||q.question||q.prompt))errors.push('Question '+(i+1)+': missing prompt');
 if(['mcq','multi','tf','yesno'].includes(type)){
  const opts=Array.isArray(q.options)?q.options:[];
  if(opts.length<2)errors.push('Question '+(i+1)+': needs at least 2 options');
  if(type==='multi'&&opts.length<2)errors.push('Question '+(i+1)+': multiple-select needs answer choices');
  const correct=opts.filter(o=>o&&((o.correct===true)||o.isCorrect===true)).length;
  if(correct===0&&!q.correct)errors.push('Question '+(i+1)+': no correct answer marked');
  if(type!=='multi'&&correct>1)errors.push('Question '+(i+1)+': multiple correct answers for a single-answer type');
 }
 if(type==='numeric'&&q.answer==null&&q.correct==null)warnings.push('Numeric question has no target answer');
 if((type==='short'||type==='fill')&&!q.answer&&!q.correct&&!Array.isArray(q.answers))warnings.push('Text answer has no accepted answer set');
 if(q.points!=null&&(!Number.isFinite(+q.points)||+q.points<0))errors.push('Question '+(i+1)+': points must be zero or greater');
 if(q.time!=null&&(!Number.isFinite(+q.time)||+q.time<0))errors.push('Question '+(i+1)+': time limit is invalid');
 return{valid:!errors.length,errors,warnings,type};
}
function validateQuiz(quiz=getQuiz()){
 const qs=Array.isArray(quiz.questions)?quiz.questions:[];const results=qs.map(validateQuestion);const errors=results.flatMap(r=>r.errors),warnings=results.flatMap(r=>r.warnings);
 if(!text(quiz.title))warnings.push('Quiz title is empty');
 if(!qs.length)errors.push('Quiz has no questions');
 const ids=new Set();qs.forEach((q,i)=>{if(q.id&&ids.has(q.id))errors.push('Duplicate question ID at '+(i+1));if(q.id)ids.add(q.id)});
 const out={valid:errors.length===0,errors,warnings,questions:qs.length,checkedAt:Date.now()};emit('validated',out);return out;
}

/* 2. Scoring engine: deterministic and extensible */
function scoreAnswer(q,answer){
 const type=text(q?.type||'mcq').toLowerCase(),correct=q?.correct??q?.answer;
 if(type==='poll'||type==='scale')return{correct:null,points:0,max:Number(q?.points||0),mode:'non-graded'};
 if(type==='multi'){
  const a=[...(Array.isArray(answer)?answer:[answer])].map(String).sort(),c=[...(Array.isArray(correct)?correct:[correct])].map(String).sort();
  const ok=a.length===c.length&&a.every((v,i)=>v===c[i]);return{correct:ok,points:ok?Number(q?.points||1):0,max:Number(q?.points||1),mode:'exact'};
 }
 if(type==='numeric'){
  const a=Number(answer),c=Number(correct),tol=Number(q?.tolerance??0);const ok=Number.isFinite(a)&&Number.isFinite(c)&&Math.abs(a-c)<=tol;return{correct:ok,points:ok?Number(q?.points||1):0,max:Number(q?.points||1),mode:'tolerance'};
 }
 if(type==='short'||type==='fill'||type==='long'){
  const accepted=Array.isArray(q?.answers)?q.answers:[correct];const norm=x=>text(x).toLowerCase().replace(/\s+/g,' ');const ok=accepted.filter(x=>x!=null).some(x=>norm(x)===norm(answer));return{correct:ok,points:ok?Number(q?.points||1):0,max:Number(q?.points||1),mode:'text'};
 }
 const ok=String(answer??'')===String(correct??'');return{correct:ok,points:ok?Number(q?.points||1):0,max:Number(q?.points||1),mode:'exact'};
}
function grade(questions,answers={}){let earned=0,max=0,correct=0;const rows=(questions||[]).map((q,i)=>{const r=scoreAnswer(q,answers[q.id??i]);earned+=r.points;max+=r.max;if(r.correct===true)correct++;return{index:i,id:q.id??i,...r}});return{earned,max,percentage:max?Math.round(earned/max*10000)/100:0,correct,answered:Object.keys(answers).length,rows,at:Date.now()};}

/* 3. Difficulty + adaptive engine */
function difficulty(q){
 if(!q)return 50;let n=50;const t=text(q.type||'').toLowerCase();if(['mcq','tf','yesno'].includes(t))n-=5;if(['code','case','long','matching','ordering'].some(x=>t.includes(x)))n+=15;if(['image','hotspot','numeric','formula'].some(x=>t.includes(x)))n+=10;const len=text(q.text||q.question).length;n+=len>220?10:len<40?-5:0;const opts=Array.isArray(q.options)?q.options.length:0;n+=opts>5?5:0;return Math.round(clamp(n));}
function adaptiveOrder(questions,profile={}){const mastery=clamp(profile.mastery??50),target=mastery<45?45:mastery<70?60:75;return [...(questions||[])].map((q,i)=>({q,i,d:difficulty(q),distance:Math.abs(difficulty(q)-target)})).sort((a,b)=>a.distance-b.distance).map(x=>x.q);}
function misconception(result){const wrong=(result?.rows||[]).filter(x=>x.correct===false);return{wrongCount:wrong.length,weakIndexes:wrong.map(x=>x.index),needsReview:wrong.length>0};}

/* 4. Autosave/version/recovery engine */
const DRAFT='esi.quiz2.draft.v7',HIST='esi.quiz2.history.v7';
function snapshot(quiz=getQuiz()){return{id:id('snap'),at:Date.now(),quiz:clone(quiz)}}
function autosave(quiz=getQuiz()){const snap=snapshot(quiz);write(DRAFT,snap);const h=read(HIST,[]);h.unshift(snap);write(HIST,h.slice(0,20));emit('autosaved',snap);return snap;}
function recover(){const d=read(DRAFT,null);if(!d?.quiz)return null;emit('recovered',d);return clone(d.quiz)}
function history(){return read(HIST,[]).map(x=>({id:x.id,at:x.at,title:x.quiz?.title||'Untitled',questions:x.quiz?.questions?.length||0}))}
function restore(idv){const h=read(HIST,[]).find(x=>x.id===idv);if(!h)return null;emit('restored',h);return clone(h.quiz)}

/* 5. Search/index engine */
function searchQuestions(q,filters={}){const term=text(q).toLowerCase();return getQuestions().map((x,i)=>({x,i})).filter(({x})=>{const hay=[x.text,x.question,x.type,x.explanation,x.section].map(text).join(' ').toLowerCase();if(term&&!hay.includes(term))return false;if(filters.type&&text(x.type)!==text(filters.type))return false;if(filters.minDifficulty!=null&&difficulty(x)<filters.minDifficulty)return false;if(filters.maxDifficulty!=null&&difficulty(x)>filters.maxDifficulty)return false;return true}).map(x=>x.x)}

/* 6. Template engine */
const templates=[
 {id:'exam',name:'Exam / CBT',desc:'Clean graded assessment',types:['mcq','tf','short'],settings:{showScore:true,showAnswers:false,randomQ:false}},
 {id:'practice',name:'Practice',desc:'Immediate learning feedback',types:['mcq','multi','short'],settings:{showScore:true,showAnswers:true,showExplain:true}},
 {id:'live',name:'Live classroom',desc:'Fast questions for a hosted room',types:['mcq','tf','poll'],settings:{leaderboard:true,time:30,randomQ:true}},
 {id:'revision',name:'Revision sprint',desc:'Short mixed-topic review',types:['mcq','tf','fill','numeric'],settings:{showExplain:true,randomQ:true}},
 {id:'survey',name:'Survey / feedback',desc:'Non-graded opinion collection',types:['poll','scale','short'],settings:{showScore:false,showAnswers:false}}
];
function applyTemplate(idv){const t=templates.find(x=>x.id===idv);if(!t)return null;const q=t.types.map((type,i)=>({id:id('q'),type,text:'New '+TYPES[type]?.label||'Question',options:type==='mcq'||type==='tf'?[{text:'Option A',correct:true},{text:'Option B',correct:false}]:[]}));const out={title:t.name,description:t.desc,questions:q,sections:[],settings:clone(t.settings)};emit('template-applied',out);return out;}

/* 7. Accessibility + interaction engine */
function accessibility(){const checks=[];document.querySelectorAll('button').forEach((b,i)=>{if(!text(b.getAttribute('aria-label'))&&!text(b.innerText))checks.push({kind:'button-label',index:i})});document.querySelectorAll('img').forEach((im,i)=>{if(!im.alt)checks.push({kind:'image-alt',index:i})});return{valid:!checks.length,issues:checks,count:checks.length};}
function setReducedMotion(on=true){document.documentElement.classList.toggle('esi-reduced-motion',!!on);write('esi.quiz2.reducedMotion',!!on);emit('accessibility',{reducedMotion:!!on})}

/* 8. Import/export engine */
function exportQuiz(quiz=getQuiz()){const payload={schema:'ESI-QUIZ-V7',version:7,exportedAt:new Date().toISOString(),quiz:clone(quiz)};emit('exported',payload);return payload;}
function importQuiz(payload){if(!payload||payload.schema!=='ESI-QUIZ-V7'||!payload.quiz)throw Error('Invalid ESI quiz package');const q=clone(payload.quiz);q.questions=Array.isArray(q.questions)?q.questions:[];emit('imported',q);return q;}

/* 9. Offline job engine */
function enqueue(kind,payload){const jobs=read('esi.quiz2.jobs.v7',[]);const j={id:id('job'),kind,payload:clone(payload),status:'queued',attempts:0,createdAt:Date.now()};jobs.push(j);write('esi.quiz2.jobs.v7',jobs);emit('job-queued',j);return j;}
function jobs(){return read('esi.quiz2.jobs.v7',[])}
function completeJob(idv,result){const jobs=read('esi.quiz2.jobs.v7',[]),j=jobs.find(x=>x.id===idv);if(!j)return false;j.status='complete';j.result=clone(result);j.completedAt=Date.now();write('esi.quiz2.jobs.v7',jobs);emit('job-complete',j);return true;}

/* 10. Engine diagnostics */
function diagnostics(){const q=getQuiz(),v=validateQuiz(q),a=accessibility();return{version:7,quiz:{questions:q.questions?.length||0,sections:q.sections?.length||0},validation:v,accessibility:a,storage:{draft:!!read(DRAFT,null),history:history().length,jobs:jobs().filter(x=>x.status==='queued').length},engines:['integrity','scoring','adaptive','autosave','search','templates','accessibility','import-export','offline-jobs']};}
function boot(){const api={version:7,TYPES,templates,getQuestions,getQuiz,validateQuestion,validateQuiz,scoreAnswer,grade,difficulty,adaptiveOrder,misconception,autosave,recover,history,restore,searchQuestions,applyTemplate,accessibility,setReducedMotion,exportQuiz,importQuiz,enqueue,jobs,completeJob,diagnostics};window.ESIQuizEnginesV7=api;window.ESIQuizEngines=Object.assign(window.ESIQuizEngines||{},api);try{setReducedMotion(!!read('esi.quiz2.reducedMotion',false))}catch{}emit('ready',{version:7});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();