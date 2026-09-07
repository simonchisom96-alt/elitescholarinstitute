/* ESI Quiz Studio Social Bridge V40 — reactions, comments, shares, saves, leaderboard and notification hooks */
(function(){'use strict';
const KEY='esi.quiz2.social.v40';
const D={version:40,likes:{},comments:[],shares:[],saved:[],followers:[],notifications:[],leaderboards:{},views:{}};let s=D;try{s={...D,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}
for(const k of ['comments','shares','saved','followers','notifications'])if(!Array.isArray(s[k]))s[k]=[];for(const k of ['likes','views','leaderboards'])s[k]=s[k]||{};
function save(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}return true}function emit(type,data){save();try{window.dispatchEvent(new CustomEvent('esi:v40',{detail:{type,...(data||{})}}))}catch(e){}return true}
function id(p){return p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function like(targetId,kind='quiz'){if(!targetId)return false;s.likes[targetId]=s.likes[targetId]||{count:0};s.likes[targetId].count++;emit('like',{targetId,kind});return s.likes[targetId]}
function unlike(targetId){if(!s.likes[targetId])return false;s.likes[targetId].count=Math.max(0,s.likes[targetId].count-1);emit('unlike',{targetId});return true}
function comment(targetId,text,parentId=null){const c={id:id('comment'),targetId,text:String(text||'').trim(),parentId,author:'ESI User',time:Date.now(),likes:0,reported:false};if(!c.text)return null;s.comments.unshift(c);emit('comment',{comment:c});return c}
function reply(targetId,text,parentId){return comment(targetId,text,parentId)}function likeComment(id0){const c=s.comments.find(x=>x.id===id0);if(!c)return false;c.likes++;emit('comment-like',{id:id0});return c.likes}
function removeComment(id0){const c=s.comments.find(x=>x.id===id0);if(!c)return false;c.deleted=true;c.text='Comment removed';emit('comment-remove',{id:id0});return true}
function report(targetId,reason=''){const r={id:id('report'),targetId,reason:String(reason||'').trim(),time:Date.now(),status:'queued'};s.notifications.unshift({type:'moderation',text:'Report queued',time:r.time});emit('report',{report:r});return r}
function share(item={}){const p={id:id('share'),title:item.title||'ESI Quiz',text:item.text||'',url:item.url||'',time:Date.now()};s.shares.unshift(p);s.shares=s.shares.slice(0,200);emit('share',{item:p});if(typeof navigator!=='undefined'&&navigator.share)navigator.share({title:p.title,text:p.text,url:p.url}).catch(()=>{});else if(typeof navigator!=='undefined'&&navigator.clipboard&&p.url)navigator.clipboard.writeText(p.url).catch(()=>{});return p}
function saveItem(item){if(!item?.id)return false;if(!s.saved.some(x=>x.id===item.id))s.saved.unshift({...item,savedAt:Date.now()});emit('save',{item});return true}function unsave(id0){s.saved=s.saved.filter(x=>x.id!==id0);emit('unsave',{id:id0});return true}
function follow(user){user=String(user||'').trim();if(!user)return false;if(!s.followers.includes(user))s.followers.push(user);emit('follow',{user});return true}function unfollow(user){s.followers=s.followers.filter(x=>x!==user);emit('unfollow',{user});return true}
function view(id0){s.views[id0]=(s.views[id0]||0)+1;emit('view',{id:id0});return s.views[id0]}
function leaderboard(quizId,rows=[]){const r=[...rows].map(x=>({...x,name:x.name||'Player',score:Number(x.score||0)})).sort((a,b)=>b.score-a.score).map((x,i)=>({...x,rank:i+1}));s.leaderboards[quizId||'global']={quizId:quizId||null,rows:r,updatedAt:Date.now()};emit('leaderboard',{quizId,rows:r});return s.leaderboards[quizId||'global']}
function notify(n={}){const x={id:id('n'),type:n.type||'activity',title:n.title||'ESI',text:n.text||'',link:n.link||'',time:Date.now(),read:false};s.notifications.unshift(x);s.notifications=s.notifications.slice(0,300);emit('notification',{item:x});return x}
function unread(){return s.notifications.filter(x=>!x.read).length}function markRead(id0){const n=s.notifications.find(x=>x.id===id0);if(n)n.read=true;emit('notification-read',{id:id0});return true}
function audit(){return{version:40,comments:s.comments.length,shares:s.shares.length,saved:s.saved.length,followers:s.followers.length,notifications:s.notifications.length,leaderboards:Object.keys(s.leaderboards).length}};
window.ESIQuizSocialV40={state:s,save,like,unlike,comment,reply,likeComment,removeComment,report,share,saveItem,unsave,follow,unfollow,view,leaderboard,notify,unread,markRead,audit};
})();