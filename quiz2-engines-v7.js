/* ESI Quiz Studio Engines V7.1
 * Expanded phone-safe engine layer: integrity, scoring, adaptive learning,
 * recovery, search, templates, accessibility, import/export, offline jobs,
 * question-bank tools, conditional logic, media diagnostics, analytics,
 * publish gates, live-session state, security scanning and self-test.
 * No API keys or secrets are handled here.
 */
(()=>{'use strict';
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const id=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
const text=x=>String(x??'').trim();
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:0));
const emit=(n,d={})=>{try{window.dispatchEvent(new CustomEvent('esi:engine:'+n,{detail:d}))}catch{}};
const TYPES={mcq:{label:'Multiple choice',answers:'single'},multi:{label:'Multiple select',answers:'multi'},tf:{label:'True / False',answers:'single'},yesno:{label:'Yes / No',answers:'single'},short:{label:'Short text',answers:'text'},long:{label:'Long answer',answers:'text'},fill:{label:'Fill in the blank',answers:'text'},numeric:{label:'Numeric',answers:'numeric'},matching:{label:'Matching',answers:'pairs'},ordering:{label:'Ordering',answers:'order'},poll:{label:'Poll',answers:'poll'},scale:{label:'Scale',answers:'scale'},image:{label:'Image question',answers:'single'},audio:{label:'Audio question',answers:'single'},video:{label:'Video question',answers:'single'},code:{label:'Code response',answers:'code'}};
function getQuiz(){
 if(window.state&&Array.isArray(window.state.questions))return window.state;
 const d=read('esi.quiz2.draft.v7',null);return d?.quiz||read('esi.quiz2.draft',{title:'Untitled Quiz',description:'',questions:[],sections:[],settings:{}});
}
function getQuestions(){return Array.isArray(getQuiz().questions)?getQuiz().questions:[]}
function correctMarked(q){const opts=Array.isArray(q?.options)?q.options:[];return opts.some(o=>o&&((o.correct===true)||(o.isCorrect===true)))||q?.correct!==undefined&&q?.correct!==null&&q?.correct!==''}
function validateQuestion(q,i=0){
 q=q||{};const errors=[],warnings=[],type=text(q.type||q.kind||'mcq').toLowerCase();
 if(!text(q.text||q.question||q.prompt))errors.push('Question '+(i+1)+': missing prompt');
 if(['mcq','multi','tf','yesno'].includes(type)){
  const opts=Array.isArray(q.options)?q.options:[];if(opts.length<2)errors.push('Question '+(i+1)+': needs at least 2 options');
  const correct=opts.filter(o=>o&&((o.correct===true)||(o.isCorrect===true))).length;
  if(!correctMarked(q))errors.push('Question '+(i+1)+': no correct answer marked');
  if(type!=='multi'&&correct>1)errors.push('Question '+(i+1)+': multiple correct answers for a single-answer type');
 }
 if(type==='numeric'&&q.answer==null&&q.correct==null)warnings.push('Numeric question has no target answer');
 if(['short','fill','long'].includes(type)&&q.required!==false&&!q.answer&&!q.correct&&!Array.isArray(q.answers))warnings.push('Text answer has no accepted answer set');
 if(q.points!=null&&(!Number.isFinite(+q.points)||+q.points<0))errors.push('Question '+(i+1)+': points must be zero or greater');
 if(q.time!=null&&(!Number.isFinite(+q.time)||+q.time<0))errors.push('Question '+(i+1)+': time limit is invalid');
 return{valid:!errors.length,errors,warnings,type};
}
function validateQuiz(quiz=getQuiz()){
 const qs=Array.isArray(quiz.questions)?quiz.questions:[],rs=qs.map(validateQuestion),errors=rs.flatMap(r=>r.errors),warnings=rs.flatMap(r=>r.warnings),ids=new Set();
 if(!text(quiz.title))warnings.push('Quiz title is empty');if(!qs.length)errors.push('Quiz has no questions');
 qs.forEach((q,i)=>{if(q.id&&ids.has(q.id))errors.push('Duplicate question ID at '+(i+1));if(q.id)ids.add(q.id)});const out={valid:!errors.length,errors,warnings,questions:qs.length,checkedAt:Date.now()};emit('validated',out);return out;
}
function scoreAnswer(q,answer){
 const type=text(q?.type||'mcq').toLowerCase(),correct=q?.correct??q?.answer,pts=Number(q?.points||1);
 if(type==='poll'||type==='scale')return{correct:null,points:0,max:Number(q?.points||0),mode:'non-graded'};
 if(type==='multi'){const a=[...(Array.isArray(answer)?answer:[answer])].map(String).sort(),c=[...(Array.isArray(correct)?correct:[correct])].map(String).sort(),ok=a.length===c.length&&a.every((v,i)=>v===c[i]);return{correct:ok,points:ok?pts:0,max:pts,mode:'exact'};}
 if(type==='numeric'){const a=Number(answer),c=Number(correct),tol=Number(q?.tolerance??0),ok=Number.isFinite(a)&&Number.isFinite(c)&&Math.abs(a-c)<=tol;return{correct:ok,points:ok?pts:0,max:pts,mode:'tolerance'};}
 if(['short','fill','long'].includes(type)){const accepted=Array.isArray(q?.answers)?q.answers:[correct],norm=x=>text(x).toLowerCase().replace(/\s+/g,' '),ok=accepted.some(x=>x!=null&&norm(x)===norm(answer));return{correct:ok,points:ok?pts:0,max:pts,mode:'text'};}
 const ok=String(answer??'')===String(correct??'');return{correct:ok,points:ok?pts:0,max:pts,mode:'exact'};
}
function grade(questions,answers={}){let earned=0,max=0,correct=0;const rows=(questions||[]).map((q,i)=>{const r=scoreAnswer(q,answers[q.id??i]);earned+=r.points;max+=r.max;if(r.correct===true)correct++;return{index:i,id:q.id??i,...r}});return{earned,max,percentage:max?Math.round(earned/max*10000)/100:0,correct,answered:Object.keys(answers).filter(k=>!String(k).startsWith('__time_')).length,rows,at:Date.now()}}
function difficulty(q){if(!q)return 50;let n=50,t=text(q.type||'').toLowerCase();if(['mcq','tf','yesno'].includes(t))n-=5;if(['code','case','long','matching','ordering'].some(x=>t.includes(x)))n+=15;if(['image','hotspot','numeric','formula'].some(x=>t.includes(x)))n+=10;const len=text(q.text||q.question).length;n+=len>220?10:len<40?-5:0;n+=(Array.isArray(q.options)&&q.options.length>5)?5:0;return Math.round(clamp(n))}
function adaptiveOrder(questions,profile={}){const m=clamp(profile.mastery??50),target=m<45?45:m<70?60:75;return[...(questions||[])].map((q,i)=>({q,i,d:difficulty(q),distance:Math.abs(difficulty(q)-target)})).sort((a,b)=>a.distance-b.distance).map(x=>x.q)}
function misconception(result){const wrong=(result?.rows||[]).filter(x=>x.correct===false);return{wrongCount:wrong.length,weakIndexes:wrong.map(x=>x.index),needsReview:wrong.length>0}}
const DRAFT='esi.quiz2.draft.v7',HIST='esi.quiz2.history.v7';
function snapshot(quiz=getQuiz()){return{id:id('snap'),at:Date.now(),quiz:clone(quiz)}}
function autosave(quiz=getQuiz()){const snap=snapshot(quiz),h=read(HIST,[]);write(DRAFT,snap);h.unshift(snap);write(HIST,h.slice(0,20));emit('autosaved',snap);return snap}
function recover(){const d=read(DRAFT,null);if(!d?.quiz)return null;emit('recovered',d);return clone(d.quiz)}
function history(){return read(HIST,[]).map(x=>({id:x.id,at:x.at,title:x.quiz?.title||'Untitled',questions:x.quiz?.questions?.length||0}))}
function restore(idv){const h=read(HIST,[]).find(x=>x.id===idv);if(!h)return null;emit('restored',h);return clone(h.quiz)}
function searchQuestions(q,filters={}){const term=text(q).toLowerCase();return getQuestions().map((x,i)=>({x,i})).filter(({x})=>{const hay=[x.text,x.question,x.type,x.explanation,x.section,(x.tags||[]).join(' ')].map(text).join(' ').toLowerCase();if(term&&!hay.includes(term))return false;if(filters.type&&text(x.type)!==text(filters.type))return false;if(filters.minDifficulty!=null&&difficulty(x)<filters.minDifficulty)return false;if(filters.maxDifficulty!=null&&difficulty(x)>filters.maxDifficulty)return false;if(filters.tag&&!(x.tags||[]).includes(filters.tag))return false;return true}).map(x=>x.x)}
const templates=[{id:'exam',name:'Exam / CBT',desc:'Clean graded assessment',types:['mcq','tf','short'],settings:{showScore:true,showAnswers:false,randomQ:false}},{id:'practice',name:'Practice',desc:'Immediate learning feedback',types:['mcq','multi','short'],settings:{showScore:true,showAnswers:true,showExplain:true}},{id:'live',name:'Live classroom',desc:'Fast questions for a hosted room',types:['mcq','tf','poll'],settings:{leaderboard:true,time:30,randomQ:true}},{id:'revision',name:'Revision sprint',desc:'Short mixed-topic review',types:['mcq','tf','fill','numeric'],settings:{showExplain:true,randomQ:true}},{id:'survey',name:'Survey / feedback',desc:'Non-graded opinion collection',types:['poll','scale','short'],settings:{showScore:false,showAnswers:false}}];
function applyTemplate(idv){const t=templates.find(x=>x.id===idv);if(!t)return null;const q=t.types.map(type=>({id:id('q'),type,text:'New '+(TYPES[type]?.label||'Question'),options:['mcq','tf','yesno'].includes(type)?[{text:'Option A',correct:true},{text:'Option B',correct:false}]:[]}));const out={title:t.name,description:t.desc,questions:q,sections:[],settings:clone(t.settings)};emit('template-applied',out);return out}
function accessibility(){const checks=[];document.querySelectorAll('button').forEach((b,i)=>{if(!text(b.getAttribute('aria-label'))&&!text(b.innerText)&&!b.querySelector('svg,img'))checks.push({kind:'button-label',index:i})});document.querySelectorAll('img').forEach((im,i)=>{if(!im.alt)checks.push({kind:'image-alt',index:i})});return{valid:!checks.length,issues:checks,count:checks.length}}
function setReducedMotion(on=true){document.documentElement.classList.toggle('esi-reduced-motion',!!on);write('esi.quiz2.reducedMotion',!!on);emit('accessibility',{reducedMotion:!!on})}
function exportQuiz(quiz=getQuiz()){const payload={schema:'ESI-QUIZ-V7',version:7,exportedAt:new Date().toISOString(),quiz:clone(quiz)};emit('exported',payload);return payload}
function importQuiz(payload){if(!payload||payload.schema!=='ESI-QUIZ-V7'||!payload.quiz)throw Error('Invalid ESI quiz package');const q=clone(payload.quiz);q.questions=Array.isArray(q.questions)?q.questions:[];emit('imported',q);return q}
function enqueue(kind,payload){const jobs=read('esi.quiz2.jobs.v7',[]),j={id:id('job'),kind,payload:clone(payload),status:'queued',attempts:0,createdAt:Date.now()};jobs.push(j);write('esi.quiz2.jobs.v7',jobs);emit('job-queued',j);return j}
function jobs(){return read('esi.quiz2.jobs.v7',[])}
function completeJob(idv,result){const js=jobs(),j=js.find(x=>x.id===idv);if(!j)return false;j.status='complete';j.result=clone(result);j.completedAt=Date.now();write('esi.quiz2.jobs.v7',js);emit('job-complete',j);return true}
/* Question-bank engine */
function bankIndex(qs=getQuestions()){const map={};qs.forEach((q,i)=>{const k=text(q.id)||'q'+i;map[k]={id:k,index:i,type:text(q.type||'mcq'),tags:Array.isArray(q.tags)?q.tags:[],difficulty:difficulty(q),favorite:!!q.favorite,source:text(q.source),used:Number(q.used||0)}});return map}
function tagQuestion(idv,tag){const q=getQuestions().find(x=>text(x.id)===text(idv));if(!q)return false;q.tags=Array.isArray(q.tags)?q.tags:[];if(!q.tags.includes(tag))q.tags.push(tag);write('esi.quiz2.bank.v8',bankIndex());emit('bank-changed',{id:idv,tag});return true}
function duplicates(qs=getQuestions()){const seen=new Map(),out=[];qs.forEach((q,i)=>{const k=text(q.text||q.question).toLowerCase().replace(/\s+/g,' ');if(k&&(seen.has(k)))out.push([seen.get(k),i]);else if(k)seen.set(k,i)});return out}
function pool(filters={}){return getQuestions().filter(q=>(!filters.type||text(q.type)===text(filters.type))&&(!filters.tag||Array.isArray(q.tags)&&q.tags.includes(filters.tag))&&(!filters.source||text(q.source)===text(filters.source))&&(filters.favorite==null||!!q.favorite===!!filters.favorite))}
/* Conditional logic / branching engine */
function condition(rule,answers={}){if(!rule)return true;const a=answers[rule.questionId],op=text(rule.operator||'equals'),b=rule.value;if(op==='equals')return String(a??'')===String(b??'');if(op==='notEquals')return String(a??'')!==String(b??'');if(op==='contains')return Array.isArray(a)?a.map(String).includes(String(b)):String(a??'').toLowerCase().includes(String(b??'').toLowerCase());if(op==='gt')return Number(a)>Number(b);if(op==='gte')return Number(a)>=Number(b);if(op==='lt')return Number(a)<Number(b);if(op==='lte')return Number(a)<=Number(b);return true}
function visible(q,answers={}){const rules=Array.isArray(q?.logic)?q.logic:[];return rules.length?rules.every(r=>condition(r,answers)):true}
function route(qs=getQuestions(),answers={}){return qs.map((q,i)=>({q,i,visible:visible(q,answers),required:q.required!==false})).filter(x=>x.visible)}
function next(qs,index,answers={}){for(let i=index+1;i<qs.length;i++)if(visible(qs[i],answers))return i;return -1}
/* Media engine */
function mediaInventory(qs=getQuestions()){const a=[];qs.forEach((q,i)=>{['image','audio','video','media'].forEach(k=>{if(q[k])a.push({question:i,kind:k,url:text(q[k])})});(q.media||[]).forEach(m=>a.push({question:i,kind:m.type||'media',url:text(m.url||m.src)}))});return a}
function mediaDiagnostics(qs=getQuestions()){const assets=mediaInventory(qs),issues=[];assets.forEach(a=>{const q=qs[a.question];if(!a.url)issues.push({...a,issue:'missing-url'});if(/^data:/i.test(a.url)&&a.url.length>5000000)issues.push({...a,issue:'very-large-inline-asset'});if(a.kind==='image'&&!text(q?.altText||q?.alt))issues.push({...a,issue:'missing-alt-text'})});return{assets,issues,valid:issues.length===0}}
/* Analytics engine */
function analytics(qs=getQuestions(),answers={},result=null){const rows=result?.rows||[],byType={},wrong=[];rows.forEach(r=>{const q=qs[r.index]||{},t=text(q.type||'mcq'),x=byType[t]||(byType[t]={count:0,correct:0,earned:0,max:0});x.count++;if(r.correct===true)x.correct++;x.earned+=Number(r.points||0);x.max+=Number(r.max||0);if(r.correct===false)wrong.push(r.index)});const times=qs.map((q,i)=>Number(answers['__time_'+(q.id??i)]||0)).filter(x=>Number.isFinite(x)&&x>0),answered=Object.keys(answers).filter(k=>!k.startsWith('__time_')).length;return{accuracy:rows.length?Math.round(rows.filter(r=>r.correct===true).length/rows.length*10000)/100:0,answered,byType,weakQuestions:[...new Set(wrong)],avgTime:times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):0,generatedAt:Date.now()}}
/* Publish/preview engine */
function publishGate(q=getQuiz()){const errors=[],warnings=[];if(!text(q.title))errors.push('Quiz title is required');if(!(q.questions||[]).length)errors.push('At least one question is required');(q.questions||[]).forEach((x,i)=>{if(!text(x.text||x.question))errors.push('Question '+(i+1)+' needs a prompt');if(x.required!==false&&['short','fill','long'].includes(text(x.type))&&!x.answer&&!x.correct&&!Array.isArray(x.answers))warnings.push('Question '+(i+1)+' has no accepted text answer')});const dup=duplicates(q.questions||[]);if(dup.length)warnings.push(dup.length+' duplicate prompt pair(s) detected');const media=mediaDiagnostics(q.questions||[]);if(media.issues.length)warnings.push(media.issues.length+' media/accessibility issue(s) detected');return{ready:errors.length===0,errors,warnings,duplicatePairs:dup,media:media.issues,checkedAt:Date.now()}}
function publish(q=getQuiz()){const gate=publishGate(q);if(!gate.ready)return{published:false,gate};const pkg={id:id('pub'),schema:'ESI-PUBLISHED-1',publishedAt:new Date().toISOString(),quiz:clone(q),gate};write('esi.quiz2.published.v8',pkg);emit('published',pkg);return{published:true,pkg}}
function preview(q=getQuiz()){const p=clone(q);p.preview=true;emit('preview',{quiz:p});return p}
/* Live-session engine */
function liveState(){return read('esi.quiz2.live.v8',{status:'idle',code:'',host:null,participants:[],index:0,answers:{},startedAt:0})}
function saveLive(s){write('esi.quiz2.live.v8',s);emit('live-changed',s);return s}
function createLive(host='Host'){const code=Math.random().toString(36).slice(2,7).toUpperCase();return saveLive({status:'lobby',code,host,participants:[],index:0,answers:{},startedAt:0,createdAt:Date.now()})}
function joinLive(name){const s=liveState();if(s.status==='idle'||!s.code)return{ok:false,error:'No active room'};if(!s.participants.some(p=>p.name===name))s.participants.push({id:id('p'),name,joinedAt:Date.now(),connected:true,score:0});saveLive(s);return{ok:true,room:s.code}}
function startLive(){const s=liveState();if(!s.code)return{ok:false,error:'No room'};s.status='live';s.startedAt=Date.now();return{ok:true,state:saveLive(s)}}
function submitLive(name,answer){const s=liveState(),p=s.participants.find(x=>x.name===name);if(!p)return false;s.answers[s.index]=s.answers[s.index]||{};s.answers[s.index][name]=clone(answer);p.lastAnswerAt=Date.now();saveLive(s);return true}
function advanceLive(){const s=liveState();s.index++;saveLive(s);return s.index}
function endLive(){const s=liveState();s.status='ended';return saveLive(s)}
/* Security / privacy diagnostics */
function securityScan(){const body=document.documentElement?.outerHTML||'',patterns=[/AIza[0-9A-Za-z_-]{20,}/g,/sk-[A-Za-z0-9_-]{20,}/g,/ghp_[A-Za-z0-9]{20,}/g],hits=[];patterns.forEach(r=>{const m=body.match(r);if(m)hits.push(...m)});return{secretLikeStrings:hits.length,scriptCount:document.scripts.length,inlineScripts:[...document.scripts].filter(s=>!s.src).length,httpsPage:location.protocol==='https:'||location.protocol==='file:',ok:hits.length===0}}
/* Full self-test; does not write user quiz state */
function selfTest(){const sample={title:'Engine Self Test',questions:[{id:'a',type:'mcq',text:'2+2?',options:[{text:'4',correct:true},{text:'5',correct:false}],points:1}]},c=[];const add=(name,ok,detail='')=>c.push({name,ok:!!ok,detail});try{add('validate',validateQuiz(sample).valid)}catch(e){add('validate',false,e.message)}try{add('score',scoreAnswer(sample.questions[0],'4').correct===true)}catch(e){add('score',false,e.message)}try{add('logic',condition({questionId:'x',operator:'equals',value:'yes'},{x:'yes'}))}catch(e){add('logic',false,e.message)}try{add('duplicates',duplicates(sample.questions).length===0)}catch(e){add('duplicates',false,e.message)}try{add('publish-gate',publishGate(sample).ready===true)}catch(e){add('publish-gate',false,e.message)}try{add('media',mediaDiagnostics(sample.questions).valid===true)}catch(e){add('media',false,e.message)}try{add('analytics',analytics(sample.questions,{a:'4'},grade(sample.questions,{a:'4'})).accuracy===100)}catch(e){add('analytics',false,e.message)}try{add('security',securityScan().ok===true)}catch(e){add('security',false,e.message)}return{version:'7.1',checks:c,pass:c.filter(x=>x.ok).length,total:c.length,ok:c.every(x=>x.ok),at:Date.now()}}
function diagnostics(){const q=getQuiz(),v=validateQuiz(q),a=accessibility(),m=mediaDiagnostics(q.questions||[]);return{version:'7.1',quiz:{questions:q.questions?.length||0,sections:q.sections?.length||0},validation:v,accessibility:a,media:m,bank:{duplicates:duplicates(q.questions||[]).length},storage:{draft:!!read(DRAFT,null),history:history().length,jobs:jobs().filter(x=>x.status==='queued').length},selfTest:selfTest(),engines:['integrity','scoring','adaptive','autosave','search','templates','accessibility','import-export','offline-jobs','question-bank','logic-routing','media','analytics','publish','live-session','security']}}
function boot(){const api={version:'7.1',TYPES,templates,getQuestions,getQuiz,validateQuestion,validateQuiz,scoreAnswer,grade,difficulty,adaptiveOrder,misconception,autosave,recover,history,restore,searchQuestions,applyTemplate,accessibility,setReducedMotion,exportQuiz,importQuiz,enqueue,jobs,completeJob,bankIndex,tagQuestion,duplicates,pool,condition,visible,route,next,mediaInventory,mediaDiagnostics,analytics,publishGate,publish,preview,liveState,createLive,joinLive,startLive,submitLive,advanceLive,endLive,securityScan,selfTest,diagnostics};window.ESIQuizEnginesV7=api;window.ESIQuizEngines=Object.assign(window.ESIQuizEngines||{},api);try{setReducedMotion(!!read('esi.quiz2.reducedMotion',false))}catch{}emit('ready',{version:'7.1'})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();