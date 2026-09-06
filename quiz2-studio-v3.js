/*
 * Elite Scholar Institute — Quiz Studio V3 Expansion Pack
 * API-free product layer. Designed to be loaded by quiz2.html later.
 * No credentials, no external service assumptions, no destructive DOM replacement.
 *
 * Systems covered:
 *  - command palette
 *  - workspace tabs
 *  - autosave/recovery journal
 *  - quiz validation
 *  - bulk question operations
 *  - question filters/search
 *  - section navigation
 *  - AI generation queue shell
 *  - source intake shell
 *  - template browser
 *  - media asset manager shell
 *  - live-session control room shell
 *  - classroom-safe prediction/opinion polls (no wagering)
 *  - analytics events
 *  - Nexus presets and balance helpers
 *  - notification center
 *  - privacy/accessibility preferences
 *  - import/export adapters
 *  - keyboard shortcuts
 *  - mobile-safe interaction helpers
 *
 * This file intentionally does not contain API keys or call private APIs.
 */
(()=>{
'use strict';
const KEY='esi.quiz2.studio.v3';
const JOURNAL='esi.quiz2.journal.v3';
const VERSION='3.0.0';
const now=()=>Date.now();
const uid=(p='esi')=>p+'_'+now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
const safe=(fn,fallback)=>{try{return fn()}catch(e){return fallback}};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const DEFAULT={
 version:VERSION,
 activeWorkspace:'home',
 query:'',
 selectedQuestion:null,
 selectedSection:null,
 filter:'all',
 sort:'position',
 history:[],
 notifications:[],
 recent:[],
 aiQueue:[],
 media:[],
 templates:[],
 analytics:{opens:0,edits:0,previews:0,shares:0,starts:0,answers:0,events:[]},
 preferences:{autosave:true,sound:true,vibrate:true,compact:false,reducedMotion:false,confirmDelete:true,highContrast:false},
 builder:{zoom:100,view:'cards',showProperties:true,showQuestionNumbers:true,focusMode:false},
 live:{status:'idle',code:'',host:'You',participants:[],timer:0,questionIndex:0,locked:false,showLeaderboard:false},
 ai:{source:'topic',topic:'',difficulty:'mixed',bloom:'understand',count:10,language:'English',includeAnswers:true,includeExplanations:true},
 design:{theme:'ESI Blue & Gold',density:'comfortable',radius:'rounded',fontScale:100},
 nexus:{speed:78,accuracy:86,difficulty:70,consistency:82,mastery:74},
 shortcuts:true
};
let state=load();
function load(){return safe(()=>Object.assign(clone(DEFAULT),JSON.parse(localStorage.getItem(KEY)||'{}')) ,clone(DEFAULT))}
function persist(){safe(()=>localStorage.setItem(KEY,JSON.stringify(state)),null); journal()}
function journal(){const j=safe(()=>JSON.parse(localStorage.getItem(JOURNAL)||'[]'),[]);j.unshift({at:now(),workspace:state.activeWorkspace,questionCount:getQuestions().length,nexus:clone(state.nexus)});safe(()=>localStorage.setItem(JOURNAL,JSON.stringify(j.slice(0,30))),null)}
function getQuestions(){return Array.isArray(window.ESIQuizStudio?.questions)?window.ESIQuizStudio.questions:[]}
function getSections(){return Array.isArray(window.ESIQuizStudio?.sections)?window.ESIQuizStudio.sections:[]}
function emit(name,detail={}){window.dispatchEvent(new CustomEvent('esi:studio:'+name,{detail}))}
function event(name,data={}){state.analytics.events.unshift({id:uid('evt'),name,data,at:now()});state.analytics.events=state.analytics.events.slice(0,200);persist();emit('analytics',{name,data})}
function toast(msg){emit('toast',{message:String(msg)})}
function navigate(workspace){state.activeWorkspace=workspace;state.recent.unshift({workspace,at:now()});state.recent=state.recent.slice(0,20);event('navigate',{workspace});emit('navigate',{workspace});renderBridge()}

const workspaces=[
 ['home','⌂','Home','Command center'],
 ['builder','✎','Builder','Create and edit'],
 ['ai','✦','AI Studio','Generation workspace'],
 ['bank','▣','Question Bank','Organize knowledge'],
 ['design','◈','Design Studio','Themes and layout'],
 ['media','▧','Media Lab','Visual and audio assets'],
 ['live','▶','Live Control','Host a session'],
 ['analytics','◌','Analytics','Performance intelligence'],
 ['nexus','◇','Nexus','Five-factor balance'],
 ['notifications','♢','Notifications','Updates and alerts'],
 ['settings','⚙','Settings','Preferences and controls']
];

const templates=[
 {id:'tpl-exam',name:'Exam Master',desc:'Clean academic assessment with strong scoring controls',tags:['exam','academic','timed'],questions:40},
 {id:'tpl-live',name:'Live Challenge',desc:'Fast-paced classroom competition layout',tags:['live','competition','classroom'],questions:15},
 {id:'tpl-revision',name:'Revision Sprint',desc:'Short practice set with explanations and review',tags:['revision','practice'],questions:20},
 {id:'tpl-case',name:'Case Study',desc:'Passage-first assessment with multi-part questions',tags:['case','critical thinking'],questions:12},
 {id:'tpl-visual',name:'Visual Lab',desc:'Image-heavy science and diagram assessment',tags:['image','science','visual'],questions:18},
 {id:'tpl-language',name:'Language Builder',desc:'Vocabulary, comprehension and fill-in activities',tags:['language','english'],questions:25},
 {id:'tpl-poll',name:'Class Pulse',desc:'Safe opinion and confidence polling for classrooms',tags:['poll','feedback'],questions:8},
 {id:'tpl-med',name:'Medical Foundation',desc:'Structured biology and foundational medicine revision',tags:['biology','medicine'],questions:30}
];

const questionTypes=[
 ['mcq','Multiple Choice','One correct answer'],['multi','Multiple Select','Several correct answers'],['tf','True / False','Binary response'],['short','Short Text','Concise written response'],['long','Long Text','Extended response'],['blank','Fill in the Blank','Missing word or phrase'],['match','Matching','Pair related items'],['order','Ordering','Arrange items correctly'],['numeric','Numeric','Number with tolerance'],['formula','Formula','Expression-based answer'],['poll','Poll','Opinion / classroom pulse'],['case','Case Study','Passage with linked questions'],['hotspot','Hotspot','Tap a location on media'],['image-mcq','Image Choice','Visual answer options'],['audio','Audio Prompt','Listen and answer'],['video','Video Prompt','Watch and answer'],['code','Code Response','Educational code exercise'],['scale','Scale','Confidence or rating']
];

function validateQuestion(q,i=0){
 const errors=[];
 const text=String(q?.text||q?.question||'').trim();
 if(!text)errors.push('Question text is empty');
 const type=String(q?.type||'mcq').toLowerCase();
 if(['mcq','multi','tf','image-mcq'].includes(type)){
   const opts=Array.isArray(q.options)?q.options:[];
   if(opts.length<2)errors.push('At least two options are required');
   const correct=opts.filter(o=>o.correct||o.isCorrect||o.value===q.correct).length;
   if(!correct&&q.correct==null)errors.push('No correct answer selected');
 }
 if(type==='short'&&!q.answer&&!(q.answers?.length))errors.push('Expected answer is missing');
 if(type==='numeric'&&(q.answer==null||q.answer===''))errors.push('Numeric answer is missing');
 return {index:i,id:q?.id||null,valid:errors.length===0,errors};
}
function validateQuiz(){
 const qs=getQuestions();
 const results=qs.map(validateQuestion);
 const empty=results.filter(x=>!x.valid);
 const duplicate=[];const seen=new Map();
 qs.forEach((q,i)=>{const t=String(q?.text||q?.question||'').trim().toLowerCase();if(t){if(seen.has(t))duplicate.push([seen.get(t),i]);else seen.set(t,i)}});
 return {valid:empty.length===0,questions:qs.length,errors:empty,duplicates:duplicate,warnings:[...duplicate.map(x=>`Possible duplicate questions: ${x[0]+1} and ${x[1]+1}`)]};
}
function searchQuestions(query=state.query){
 const q=query.trim().toLowerCase();const qs=getQuestions();
 if(!q)return qs;
 return qs.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
}
function filteredQuestions(){
 let qs=searchQuestions();
 if(state.filter==='invalid')qs=qs.filter((q,i)=>!validateQuestion(q,i).valid);
 if(state.filter==='media')qs=qs.filter(q=>q.media||q.image||q.audio||q.video);
 if(state.filter==='unanswered')qs=qs.filter(q=>!q.correct&&!q.answer&&(q.options||[]).every(o=>!o.correct));
 if(state.filter==='type:'+state.filter.slice(5))qs=qs.filter(q=>q.type===state.filter.slice(5));
 return qs;
}
function duplicateQuestion(q){
 const n=clone(q);n.id=uid('q');n.text=(n.text||n.question||'Question')+' (Copy)';n.position=(getQuestions().length+1);return n;
}
function bulkDuplicate(ids){
 const qs=getQuestions();const chosen=qs.filter(q=>ids.includes(q.id)).map(duplicateQuestion);chosen.forEach(q=>emit('question:add',{question:q}));event('bulk_duplicate',{count:chosen.length});return chosen;
}
function bulkDelete(ids){
 if(state.preferences.confirmDelete&&!confirm('Delete selected questions?'))return [];
 ids.forEach(id=>emit('question:delete',{id}));event('bulk_delete',{count:ids.length});return ids;
}
function reorder(ids,targetIndex){
 const qs=getQuestions();const moving=qs.filter(q=>ids.includes(q.id));const rest=qs.filter(q=>!ids.includes(q.id));const at=Math.max(0,Math.min(targetIndex,rest.length));rest.splice(at,0,...moving);rest.forEach((q,i)=>q.position=i+1);emit('questions:replace',{questions:rest});event('reorder',{count:moving.length,targetIndex});
}

function addNotification(title,text,type='info'){
 state.notifications.unshift({id:uid('note'),title,text,type,read:false,at:now()});state.notifications=state.notifications.slice(0,100);persist();emit('notification',{notification:state.notifications[0]});
}
function unreadCount(){return state.notifications.filter(n=>!n.read).length}
function markAllRead(){state.notifications.forEach(n=>n.read=true);persist();emit('notifications:read');}

function queueAI(job={}){
 const item={id:uid('ai'),status:'queued',createdAt:now(),progress:0,...clone(state.ai),...job};
 state.aiQueue.unshift(item);persist();event('ai_queue',{id:item.id,source:item.source});emit('ai:queue',{item});return item;
}
function updateAI(id,patch){const x=state.aiQueue.find(j=>j.id===id);if(!x)return null;Object.assign(x,patch);persist();emit('ai:update',{item:x});return x}
function cancelAI(id){return updateAI(id,{status:'cancelled',cancelledAt:now()})}
function clearAICompleted(){state.aiQueue=state.aiQueue.filter(x=>!['done','cancelled','error'].includes(x.status));persist();emit('ai:clear')}

function setNexus(values){
 const n={...state.nexus,...values};Object.keys(n).forEach(k=>n[k]=Math.max(0,Math.min(100,Number(n[k])||0)));
 state.nexus=n;persist();event('nexus_update',n);emit('nexus:update',{nexus:clone(n),analysis:nexusAnalysis(n)});return n;
}
function nexusAnalysis(n=state.nexus){
 const vals=Object.values(n).map(Number);const avg=vals.reduce((a,b)=>a+b,0)/vals.length;const spread=Math.max(...vals)-Math.min(...vals);const variance=vals.reduce((a,b)=>a+(b-avg)**2,0)/vals.length;const balance=Math.max(0,100-spread*1.25);
 const score=Math.round(avg*.72+balance*.28);
 let label='Balanced';if(spread>30)label='Needs alignment';else if(spread>18)label='Developing balance';else if(score>=85)label='Elite balance';
 const keys=Object.keys(n);const weakest=keys.slice().sort((a,b)=>n[a]-n[b]).slice(0,2);const strongest=keys.slice().sort((a,b)=>n[b]-n[a]).slice(0,2);
 return {average:Math.round(avg),spread:Math.round(spread),variance:Math.round(variance),balance:Math.round(balance),score,label,weakest,strongest};
}
function nexusPreset(name){
 const presets={balanced:{speed:80,accuracy:80,difficulty:80,consistency:80,mastery:80},exam:{speed:88,accuracy:92,difficulty:84,consistency:86,mastery:90},learning:{speed:65,accuracy:86,difficulty:72,consistency:90,mastery:78},creative:{speed:74,accuracy:76,difficulty:88,consistency:68,mastery:84},recovery:{speed:58,accuracy:74,difficulty:60,consistency:82,mastery:70}};
 return setNexus(presets[name]||presets.balanced);
}

function startLive(opts={}){
 state.live={...state.live,status:'lobby',code:opts.code||Math.random().toString(36).slice(2,8).toUpperCase(),host:'You',participants:[],timer:Number(opts.timer||0),questionIndex:0,locked:false,showLeaderboard:false};persist();event('live_start',state.live);emit('live:start',{live:clone(state.live)});return state.live;
}
function updateLive(patch){Object.assign(state.live,patch);persist();emit('live:update',{live:clone(state.live)})}
function stopLive(){updateLive({status:'idle',locked:false});event('live_stop')}
function addParticipant(name){const p={id:uid('p'),name:String(name||'Participant'),online:true,score:0,answers:0,joinedAt:now()};state.live.participants.push(p);persist();emit('live:participant',{participant:p});return p}
function updateParticipant(id,patch){const p=state.live.participants.find(x=>x.id===id);if(!p)return;Object.assign(p,patch);persist();emit('live:participant',{participant:p})}
function safeClassroomForecast(question,options=[]){
 return {id:uid('forecast'),type:'opinion-poll',question:String(question||'What do you predict?'),options:options.slice(0,8).map(String),wagering:false,stakes:false,createdAt:now()};
}

function exportSnapshot(){
 const payload={schema:'ESI-QuizStudio',version:VERSION,exportedAt:new Date().toISOString(),state:clone(state),questions:clone(getQuestions()),sections:clone(getSections())};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='esi-quiz-studio-export.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);event('export',{questions:getQuestions().length});
}
function importSnapshot(payload){
 const p=typeof payload==='string'?safe(()=>JSON.parse(payload),null):payload;if(!p||p.schema!=='ESI-QuizStudio')throw Error('Invalid ESI Quiz Studio export');
 if(p.state)state=Object.assign(clone(DEFAULT),p.state);if(Array.isArray(p.questions))emit('questions:replace',{questions:p.questions});if(Array.isArray(p.sections))emit('sections:replace',{sections:p.sections});persist();event('import',{questions:p.questions?.length||0});renderBridge();return true;
}

function commandPaletteItems(){return [
 ...workspaces.map(x=>({id:'go:'+x[0],label:'Open '+x[2],hint:x[3],run:()=>navigate(x[0])})),
 {id:'new',label:'New question',hint:'Builder',run:()=>emit('question:new')},
 {id:'preview',label:'Preview quiz',hint:'Player preview',run:()=>emit('preview')},
 {id:'validate',label:'Validate quiz',hint:'Quality check',run:()=>{const r=validateQuiz();toast(r.valid?'Quiz is valid':'Found '+r.errors.length+' issue(s)');emit('validation',{result:r})}},
 {id:'export',label:'Export workspace',hint:'JSON backup',run:exportSnapshot},
 {id:'preset',label:'Nexus balanced preset',hint:'Analytics',run:()=>nexusPreset('balanced')},
 {id:'live',label:'Start live control room',hint:'Host',run:startLive}
]}
function openPalette(){
 if(document.getElementById('esiStudioPalette'))return;
 const root=document.createElement('div');root.id='esiStudioPalette';root.innerHTML='<div class="esp-backdrop"><div class="esp-box"><input autofocus placeholder="Search commands…"><div class="esp-results"></div><div class="esp-help">Enter to run • Esc to close</div></div></div>';
 const css=document.createElement('style');css.id='esiStudioPaletteCSS';css.textContent=`#esiStudioPalette{position:fixed;inset:0;z-index:20000;font-family:Poppins,Arial,sans-serif}.esp-backdrop{position:absolute;inset:0;background:#000b;display:grid;place-items:start center;padding-top:10vh}.esp-box{width:min(680px,94vw);background:#081a33;border:1px solid #3971aa;border-radius:18px;box-shadow:0 25px 80px #000b;overflow:hidden}.esp-box input{width:100%;border:0;border-bottom:1px solid #244a79;background:#0b2444;color:#fff;padding:16px;font-size:13px;outline:0}.esp-results{max-height:55vh;overflow:auto;padding:7px}.esp-item{display:flex;gap:10px;padding:11px;border-radius:10px;color:#dcecff;cursor:pointer}.esp-item:hover,.esp-item.on{background:#12345a}.esp-item b{font-size:9px;flex:1}.esp-item span{font-size:7px;color:#8fa8ca}.esp-help{padding:8px 12px;color:#7896b9;font-size:7px;border-top:1px solid #ffffff12}`;document.head.appendChild(css);document.body.appendChild(root);
 const input=root.querySelector('input'),list=root.querySelector('.esp-results');let index=0;
 function paint(){const q=input.value.toLowerCase();const items=commandPaletteItems().filter(x=>(x.label+' '+x.hint).toLowerCase().includes(q));list.innerHTML=items.map((x,i)=>`<div class="esp-item ${i===index?'on':''}" data-i="${i}"><b>${esc(x.label)}</b><span>${esc(x.hint)}</span></div>`).join('');list.querySelectorAll('.esp-item').forEach(el=>el.onclick=()=>{items[Number(el.dataset.i)]?.run();root.remove();css.remove()})}
 input.oninput=()=>{index=0;paint()};input.onkeydown=e=>{const items=commandPaletteItems().filter(x=>(x.label+' '+x.hint).toLowerCase().includes(input.value.toLowerCase()));if(e.key==='ArrowDown'){e.preventDefault();index=Math.min(items.length-1,index+1);paint()}else if(e.key==='ArrowUp'){e.preventDefault();index=Math.max(0,index-1);paint()}else if(e.key==='Enter'){e.preventDefault();items[index]?.run();root.remove();css.remove()}else if(e.key==='Escape'){root.remove();css.remove()}};root.querySelector('.esp-backdrop').onclick=e=>{if(e.target===e.currentTarget){root.remove();css.remove()}};paint();input.focus();
}

function injectToolbar(){
 if(document.getElementById('esiStudioToolbar'))return;
 const root=document.createElement('div');root.id='esiStudioToolbar';root.innerHTML=`<button data-action="palette" title="Command palette">⌘</button><button data-action="validate" title="Validate">✓</button><button data-action="preview" title="Preview">▷</button><button data-action="export" title="Backup">⇩</button><span class="esi-studio-status">V3 • API-ready later</span>`;
 const css=document.createElement('style');css.id='esiStudioToolbarCSS';css.textContent=`#esiStudioToolbar{position:fixed;right:12px;top:74px;z-index:9900;display:flex;align-items:center;gap:5px;padding:5px;background:#06172fe8;border:1px solid #244a79;border-radius:12px;backdrop-filter:blur(12px);box-shadow:0 10px 30px #0005;font-family:Poppins,Arial,sans-serif}#esiStudioToolbar button{width:31px;height:31px;border-radius:9px;border:1px solid #294d7a;background:#10294d;color:#dcecff;font-weight:900}#esiStudioToolbar button:hover{border-color:#f6c800;color:#f6c800}.esi-studio-status{font-size:6px;color:#8fa8ca;padding:0 5px}@media(max-width:620px){.esi-studio-status{display:none}}`;
 document.head.appendChild(css);document.body.appendChild(root);root.querySelectorAll('button').forEach(b=>b.onclick=()=>{const a=b.dataset.action;if(a==='palette')openPalette();if(a==='validate'){const r=validateQuiz();toast(r.valid?'✓ Quiz passed validation':'⚠ '+r.errors.length+' question issue(s)');emit('validation',{result:r})}if(a==='preview')emit('preview');if(a==='export')exportSnapshot()});
}
function renderBridge(){
 emit('state',{state:clone(state),validation:validateQuiz(),nexus:nexusAnalysis()});
}
function shortcuts(){
 if(window.__esiStudioShortcuts)return;window.__esiStudioShortcuts=true;document.addEventListener('keydown',e=>{if(!state.shortcuts)return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette()}if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();persist();toast('Saved locally')}if(e.key==='Escape'){emit('escape')}})
}
function boot(){injectToolbar();shortcuts();addNotification('Quiz Studio upgraded','V3 product systems are ready for the next integration layer.','system');window.ESIQuizStudioV3={version:VERSION,state,getQuestions,getSections,workspaces,questionTypes,templates,validateQuestion,validateQuiz,searchQuestions,filteredQuestions,duplicateQuestion,bulkDuplicate,bulkDelete,reorder,addNotification,unreadCount,markAllRead,queueAI,updateAI,cancelAI,clearAICompleted,setNexus,nexusAnalysis,nexusPreset,startLive,updateLive,stopLive,addParticipant,updateParticipant,safeClassroomForecast,exportSnapshot,importSnapshot,navigate,openPalette,persist,event};renderBridge();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
