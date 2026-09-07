/* ESI Quiz Studio API Contract V25 — final client/server boundary; no secrets */
(()=>{'use strict';
const VERSION=25;
const schema={
version:VERSION,
transport:'HTTPS JSON',
auth:'server-issued session/token; never embed provider secrets in browser',
resources:{
quiz:{create:'POST /api/quizzes',read:'GET /api/quizzes/:slug',update:'PATCH /api/quizzes/:slug',publish:'POST /api/quizzes/:slug/publish',unpublish:'POST /api/quizzes/:slug/unpublish',clone:'POST /api/quizzes/:slug/clone'},
responses:{create:'POST /api/quizzes/:slug/responses',list:'GET /api/quizzes/:slug/responses',read:'GET /api/responses/:id'},
leaderboard:{read:'GET /api/quizzes/:slug/leaderboard'},
comments:{list:'GET /api/quizzes/:slug/comments',create:'POST /api/quizzes/:slug/comments',reply:'POST /api/comments/:id/replies',react:'POST /api/comments/:id/reactions',report:'POST /api/comments/:id/report',remove:'DELETE /api/comments/:id'},
chat:{rooms:'GET /api/chat/rooms',messages:'GET /api/chat/rooms/:id/messages',send:'POST /api/chat/rooms/:id/messages',presence:'POST /api/chat/presence'},
notifications:{list:'GET /api/notifications',read:'POST /api/notifications/:id/read'},
status:{list:'GET /api/status',create:'POST /api/status'},
rooms:{create:'POST /api/rooms',read:'GET /api/rooms/:code',join:'POST /api/rooms/:code/join',leave:'POST /api/rooms/:code/leave'},
analytics:{read:'GET /api/quizzes/:slug/analytics'},
media:{upload:'POST /api/media',read:'GET /api/media/:id'},
ai:{generate:'POST /api/ai/generate',review:'POST /api/ai/review',explain:'POST /api/ai/explain',translate:'POST /api/ai/translate'},
exports:{csv:'GET /api/quizzes/:slug/export.csv',pdf:'GET /api/quizzes/:slug/export.pdf',json:'GET /api/quizzes/:slug/export.json'}
},
realtime:{events:['quiz.updated','response.created','leaderboard.updated','comment.created','comment.updated','chat.message','chat.typing','chat.presence','notification.created','status.created','room.joined','room.left']},
response:{required:['attemptId','answers','submittedAt'],optional:['participant','duration','metadata'],serverCalculated:['score','percent','rank','feedback']},
security:{clientMustNotContain:['API keys','service-role keys','database passwords','private signing keys'],serverResponsibilities:['validation','authorization','rate limiting','scoring authority','moderation','file validation','AI provider credentials']},
status:{clientReady:true,requiresBackend:true}
};
const state={base:'',headers:{'Content-Type':'application/json'},timeout:15000};
function configure(base){state.base=String(base||'').replace(/\/$/,'');return state.base}
function url(path){return state.base+path}
async function request(path,options={}){if(!state.base)throw new Error('API base URL not configured');const c=new AbortController(),t=setTimeout(()=>c.abort(),state.timeout);try{const r=await fetch(url(path),{...options,headers:{...state.headers,...(options.headers||{})},signal:c.signal});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok){const e=new Error((data&&data.error)||`HTTP ${r.status}`);e.status=r.status;e.data=data;throw e}return data}finally{clearTimeout(t)}}
function payload(type,data){return{version:VERSION,type,client:'esi-quiz-studio',sentAt:Date.now(),data}}
window.ESIQuizAPIContractV25={VERSION,schema,state,configure,url,request,payload};
window.ESIQuizBackendContract=window.ESIQuizAPIContractV25;
})();