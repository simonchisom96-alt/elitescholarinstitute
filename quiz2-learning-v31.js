/* ESI Quiz Studio Learning V31
   Client-side readiness for adaptive learning, gamification, review and accessibility.
   Server/AI URLs can be connected later.
*/
(function(){'use strict';
const KEY='esi.quiz2.learning.v31';
const D={xp:0,level:1,streak:0,lastDay:'',badges:[],tokens:0,mastery:{},mistakes:[],review:[],attempts:[],daily:{date:'',count:0},settings:{fontScale:1,tts:false,highContrast:false,reducedMotion:false,extendedTime:1},offlineQueue:[],goals:[]};
let s=D;try{s={...D,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}
s.mastery=s.mastery||{};s.mistakes=Array.isArray(s.mistakes)?s.mistakes:[];s.review=Array.isArray(s.review)?s.review:[];s.attempts=Array.isArray(s.attempts)?s.attempts:[];s.badges=Array.isArray(s.badges)?s.badges:[];s.offlineQueue=Array.isArray(s.offlineQueue)?s.offlineQueue:[];s.goals=Array.isArray(s.goals)?s.goals:[];s.settings={...D.settings,...(s.settings||{})};
function save(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}return true}
function emit(type,data){save();try{window.dispatchEvent(new CustomEvent('esi:learning',{detail:{type,...(data||{})}}))}catch(e){}return true}
function levelFor(xp){return Math.max(1,Math.floor(Math.sqrt(Math.max(0,xp)/100))+1)}
function awardXP(amount,reason='quiz'){const n=Math.max(0,Number(amount)||0);s.xp+=n;s.level=levelFor(s.xp);emit('xp',{amount:n,reason,level:s.level});return{sxp:s.xp,level:s.level}}
function recordAttempt(a={}){const x={id:'a_'+Date.now().toString(36),quizId:a.quizId||'',score:Number(a.score||0),total:Number(a.total||0),time:Number(a.time||0),topics:a.topics||[],at:Date.now()};s.attempts.unshift(x);s.attempts=s.attempts.slice(0,500);const pct=x.total?x.score/x.total:0;(x.topics||[]).forEach(t=>{const old=s.mastery[t]||{correct:0,total:0,mastery:0};old.correct+=x.score;old.total+=x.total;old.mastery=Math.round((old.correct/Math.max(1,old.total))*100);s.mastery[t]=old});if(pct<.7)awardXP(5,'practice');else awardXP(10,'quiz');emit('attempt',{attempt:x});return x}
function addMistake(q){const x={id:'m_'+Date.now().toString(36),questionId:q.questionId||'',quizId:q.quizId||'',topic:q.topic||'General',prompt:q.prompt||'',answer:q.answer||'',correct:q.correct||'',at:Date.now(),reviewed:false};s.mistakes.unshift(x);s.mistakes=s.mistakes.slice(0,500);scheduleReview(x);emit('mistake',{item:x});return x}
function scheduleReview(item){const now=Date.now();const old=s.review.find(x=>x.questionId===item.questionId);const step=old?Math.min(6,(old.step||0)+1):0;const days=[1,2,4,7,14,30,60][step];const r={questionId:item.questionId,topic:item.topic,step,dueAt:now+days*86400000};s.review=s.review.filter(x=>x.questionId!==item.questionId);s.review.push(r);emit('review-scheduled',{review:r});return r}
function dueReviews(now=Date.now()){return s.review.filter(x=>x.dueAt<=now)}
function topicMastery(topic){return s.mastery[topic||'General']||{correct:0,total:0,mastery:0}}
function weakTopics(limit=5){return Object.entries(s.mastery).sort((a,b)=>(a[1].mastery||0)-(b[1].mastery||0)).slice(0,limit).map(x=>({topic:x[0],...x[1]}))}
function streak(){const day=new Date().toISOString().slice(0,10);if(s.lastDay===day)return s.streak;if(s.lastDay){const d=(Date.parse(day)-Date.parse(s.lastDay))/86400000;if(d===1)s.streak++;else if(d>1)s.streak=1}else s.streak=1;s.lastDay=day;awardXP(3,'streak');emit('streak',{value:s.streak});return s.streak}
function badge(id,name,rule){if(s.badges.some(x=>x.id===id))return false;s.badges.push({id,name,earnedAt:Date.now(),rule});emit('badge',{id,name});return true}
function checkBadges(){if(s.attempts.length>=1)badge('first-quiz','First Quiz','Complete one quiz');if(s.attempts.length>=10)badge('ten-quizzes','Ten Quizzes','Complete ten quizzes');if(s.streak>=7)badge('seven-day','7 Day Streak','Play seven days');if(s.xp>=1000)badge('xp-1000','1000 XP','Earn 1000 XP');return s.badges}
function daily(){const d=new Date().toISOString().slice(0,10);if(s.daily.date!==d)s.daily={date:d,count:0};return s.daily}
function dailyComplete(){daily().count++;awardXP(5,'daily');checkBadges();emit('daily',{daily:s.daily});return s.daily}
function queue(action){s.offlineQueue.push({...action,id:action.id||'q_'+Date.now().toString(36),queuedAt:Date.now()});s.offlineQueue=s.offlineQueue.slice(-500);save();return s.offlineQueue.length}
function pending(){return s.offlineQueue.slice()}
function clearQueue(){s.offlineQueue=[];emit('offline-clear');return true}
function setAccessibility(x={}){s.settings={...s.settings,...x};applyAccessibility();emit('accessibility',{settings:s.settings});return s.settings}
function applyAccessibility(){const r=document.documentElement;r.style.fontSize=(s.settings.fontScale||1)*100+'%';document.body?.classList.toggle('esi-high-contrast',!!s.settings.highContrast);document.body?.classList.toggle('esi-reduced-motion',!!s.settings.reducedMotion);if(!document.getElementById('esiLearn31')){const st=document.createElement('style');st.id='esiLearn31';st.textContent='.esi-high-contrast *{text-shadow:none!important}.esi-reduced-motion *, .esi-reduced-motion *::before,.esi-reduced-motion *::after{animation-duration:.001ms!important;transition-duration:.001ms!important;scroll-behavior:auto!important}';document.head.appendChild(st)}}
function speak(text){if(!s.settings.tts||!window.speechSynthesis)return false;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text||''));u.rate=.95;window.speechSynthesis.speak(u);return true}
function confidenceScore(confidence,correct){const c=Math.max(0,Math.min(1,Number(confidence)||0));return correct?Math.round(100*c):Math.round(-50*c)}
function predictedReadiness(){const vals=Object.values(s.mastery).map(x=>x.mastery||0);const mastery=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;const recent=s.attempts.slice(0,5);const avg=recent.length?recent.reduce((a,x)=>a+(x.total?x.score/x.total:0),0)/recent.length*100:0;return Math.round(mastery*.6+avg*.4)}
function dashboard(){return{xP:s.xp,level:s.level,streak:s.streak,badges:s.badges.length,mastery:predictedReadiness(),weakTopics:weakTopics(),dueReviews:dueReviews().length,pendingOffline:s.offlineQueue.length}}
window.ESIQuizLearningV31={state:s,save,awardXP,levelFor,recordAttempt,addMistake,scheduleReview,dueReviews,topicMastery,weakTopics,streak,badge,checkBadges,daily,dailyComplete,queue,pending,clearQueue,setAccessibility,applyAccessibility,speak,confidenceScore,predictedReadiness,dashboard};
applyAccessibility();save();
})();