/* ESI Quiz Studio Social V28 — community surfaces, backend-ready */
(()=>{'use strict';
const K='esi.quiz2.social.v28';const R='esi.quiz2.social.notifications.v28';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};const id=p=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const base=()=>read(K,{profiles:[],follows:[],likes:[],saves:[],shares:[],reactions:[],reports:[],comments:[],polls:[],collections:[]});
function profile(name='Guest'){const s=base();let p=s.profiles.find(x=>x.name===name);if(!p){p={id:id('usr'),name:String(name).slice(0,60),avatar:'',bio:'',badges:[],createdAt:Date.now()};s.profiles.push(p);write(K,s)}return p}
function follow(user,target){const s=base();const key=`${user}:${target}`;s.follows=s.follows.filter(x=>x.key!==key);s.follows.push({key,user,target,at:Date.now()});write(K,s);return true}
function unfollow(user,target){const s=base();s.follows=s.follows.filter(x=>x.key!==`${user}:${target}`);write(K,s);return true}
function isFollowing(user,target){return base().follows.some(x=>x.key===`${user}:${target}`)}
function reaction(target,type='like',user='Guest'){const s=base();const key=`${user}:${target}:${type}`;const i=s.reactions.findIndex(x=>x.key===key);if(i>=0)s.reactions.splice(i,1);else s.reactions.push({key,target,type,user,at:Date.now()});write(K,s);return s.reactions.filter(x=>x.target===target)}
function save(target,user='Guest'){const s=base();const key=`${user}:${target}`;const i=s.saves.findIndex(x=>x.key===key);if(i>=0)s.saves.splice(i,1);else s.saves.push({key,target,user,at:Date.now()});write(K,s);return i<0}
function share(target,channel='native',user='Guest'){const s=base();s.shares.push({id:id('shr'),target,channel,user,at:Date.now()});write(K,s);return s.shares.length}
function addComment(target,text,user='Guest',parent=null){const t=String(text||'').trim();if(!t)return null;const s=base();const c={id:id('cmt'),target,text:t.slice(0,1000),user:String(user).slice(0,60),parent,likes:0,reported:false,at:Date.now()};s.comments.push(c);write(K,s);notify('comment',target,user);return c}
function editComment(cid,text,user){const s=base(),c=s.comments.find(x=>x.id===cid&&x.user===user);if(!c)return false;c.text=String(text||'').trim().slice(0,1000);c.editedAt=Date.now();write(K,s);return true}
function removeComment(cid,user){const s=base(),c=s.comments.find(x=>x.id===cid&&x.user===user);if(!c)return false;c.deleted=true;write(K,s);return true}
function report(target,reason='other',user='Guest'){const s=base();s.reports.push({id:id('rpt'),target,reason:String(reason).slice(0,100),user,at:Date.now(),status:'pending'});write(K,s);return true}
function createPoll(target,question,options,user='Guest'){const s=base();const p={id:id('poll'),target,question:String(question).slice(0,300),options:(options||[]).map(String).slice(0,10),votes:{},user,at:Date.now()};s.polls.push(p);write(K,s);return p}
function votePoll(pid,option,user='Guest'){const s=base(),p=s.polls.find(x=>x.id===pid);if(!p)return false;p.votes[user]=option;write(K,s);return true}
function notify(type,target,user='Guest'){const a=read(R,[]);a.push({id:id('ntf'),type,target,user,read:false,at:Date.now()});write(R,a.slice(-1000));return true}
function notifications(user='Guest'){return read(R,[]).filter(x=>x.user===user||x.user==='*')}
function markRead(idv){const a=read(R,[]),x=a.find(n=>n.id===idv);if(x)x.read=true;write(R,a);return true}
function unread(user='Guest'){return notifications(user).filter(x=>!x.read).length}
window.ESIQuizSocialV28={profile,follow,unfollow,isFollowing,reaction,save,share,addComment,editComment,removeComment,report,createPoll,votePoll,notify,notifications,markRead,unread};
})();