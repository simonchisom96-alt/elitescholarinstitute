/* ESI Quiz Studio Integrity + Analytics V41
   Privacy-conscious client telemetry and session integrity. No surveillance payloads or secrets.
*/
(function(){'use strict';
const KEY='esi.quiz2.integrity.v41';
const s={events:[],sessions:{},answers:{},visibility:0,focusLoss:0,started:Date.now(),submits:{}};
try{Object.assign(s,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}return true}
function id(){return 'evt_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function track(type,data={}){const e={id:id(),type,time:Date.now(),data};s.events.unshift(e);s.events=s.events.slice(0,2000);save();return e}
function start(quizId){const sid='session_'+Date.now().toString(36);s.sessions[sid]={quizId,start:Date.now(),last:Date.now(),answered:0};track('session-start',{quizId,sid});return sid}
function answer(sessionId,questionId,meta={}){const x=s.sessions[sessionId];if(!x)return false;x.answered++;x.last=Date.now();s.answers[questionId]={sessionId,questionId,correct:!!meta.correct,timeMs:Number(meta.timeMs||0),changed:Number(meta.changed||0)};track('answer',{sessionId,questionId,correct:!!meta.correct,timeMs:Number(meta.timeMs||0)});return true}
function submit(quizId,attemptId){const key=String(attemptId||'');if(!key||s.submits[key])return false;s.submits[key]={quizId,time:Date.now()};track('submit',{quizId,attemptId:key});return true}
function visibility(hidden){if(hidden)s.visibility++;track('visibility',{hidden:!!hidden,count:s.visibility});return s.visibility}
function focusLost(){s.focusLoss++;track('focus-loss',{count:s.focusLoss});return s.focusLoss}
function summary(quizId){const ev=s.events.filter(e=>!quizId||e.data?.quizId===quizId);const answers=Object.values(s.answers).filter(a=>!quizId||s.sessions[a.sessionId]?.quizId===quizId);const correct=answers.filter(a=>a.correct).length;return{quizId:quizId||null,events:ev.length,answers:answers.length,correct,accuracy:answers.length?Math.round(correct/answers.length*100):0,visibility:s.visibility,focusLoss:s.focusLoss,submits:Object.keys(s.submits).length}}
function exportJSON(quizId){return JSON.stringify(summary(quizId))}
function audit(){return{version:41,eventCount:s.events.length,sessionCount:Object.keys(s.sessions).length,answerCount:Object.keys(s.answers).length,duplicateSubmitProtection:true,privacyConscious:true}}
if(typeof document!=='undefined'){document.addEventListener('visibilitychange',()=>visibility(document.hidden));window.addEventListener?.('blur',focusLost)}
window.ESIQuizIntegrityAnalyticsV41={state:s,save,track,start,answer,submit,visibility,focusLost,summary,exportJSON,audit};
})();
