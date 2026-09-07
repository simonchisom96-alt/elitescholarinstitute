/* ESI Quiz Studio AI Bridge V39
   Provider-neutral AI boundary. No API keys in the browser.
*/
(function(){'use strict';
const KEY='esi.quiz2.ai.v39';
const state={configured:false,base:'',provider:'worker',requests:0,last:null};
try{Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}return true}
function configure(base,provider='worker'){state.base=String(base||'').trim().replace(/\/$/,'');state.provider=provider||'worker';state.configured=!!state.base;save();return {...state}}
function ready(){return state.configured}
function build(task,payload={}){return{task:String(task||'generate'),payload,provider:state.provider,client:'esi-quiz-studio'}}
async function request(task,payload={},options={}){if(!state.base)throw new Error('AI endpoint not configured');const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Number(options.timeout||20000));state.requests++;try{const r=await fetch(state.base,{method:'POST',headers:{'Content-Type':'application/json',...(options.headers||{})},body:JSON.stringify(build(task,payload)),signal:controller.signal});const text=await r.text();let data;try{data=JSON.parse(text)}catch(e){data={text}}state.last={task,ok:r.ok,status:r.status,time:Date.now()};save();if(!r.ok)throw new Error(data?.error||('AI request failed: '+r.status));return data}finally{clearTimeout(timer)}}
const tasks=['generate_quiz','generate_questions','generate_from_text','generate_from_document','generate_from_image','generate_from_audio','generate_from_video','rewrite','simplify','difficulty','bloom','distractors','explanation','translate','proofread','duplicate_check','originality_check','ai_copilot','essay_rubric','adaptive_next','tutor_explain'];
function audit(){return{version:39,configured:ready(),provider:state.provider,requests:state.requests,last:state.last,tasks:tasks.length,secretFree:true}}
window.ESIQuizAIBridgeV39={state,configure,ready,build,request,audit,tasks};
})();
