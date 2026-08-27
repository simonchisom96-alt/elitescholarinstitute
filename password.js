/* ============================================================
   password.js — Firebase config, admin auth, AND all app logic
   (feed rendering, polls, quizzes, reactions, comments, everything).
   The name is kept as requested; despite it, this is the one and only
   script notification.html loads — there's nothing left in the HTML
   itself and no other JS file to keep in sync with it.

   On the API key below: a Firebase Web API key is not a secret the way
   a server API key is — it's designed to be shipped to every browser
   that loads the page, and Google's own docs say so. What actually
   protects this project's data is the Firebase Security Rules (see the
   separate rules file), which run on Google's servers and enforce what
   any given request may do, regardless of who can see this key.
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyDkjELsB4qeaumvsMAIDGIFZgNzl6eoBPM",
  authDomain: "elite-notification.firebaseapp.com",
  databaseURL: "https://elite-notification-default-rtdb.firebaseio.com",
  projectId: "elite-notification",
  storageBucket: "elite-notification.firebasestorage.app",
  messagingSenderId: "359910414254",
  appId: "1:359910414254:web:a1bafd3e23fd554a975a3f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Every visitor (admin or not) signs in anonymously the moment the page
// loads. This gives Firebase Rules something real to check (auth != null)
// instead of trusting every request unconditionally. It does NOT by itself
// make someone an admin — that's the email/password sign-in in the ADMIN
// AUTHENTICATION section below, checked against a specific email in the
// rules, not against anything guessable from this file.
//
// authReady resolves with the real uid the FIRST time Firebase confirms a
// signed-in user (anonymous or admin). Reaction/vote/response functions now
// wait on this instead of racing a synchronous check — so a slow network on
// first load no longer produces "still connecting" false negatives. If sign-in
// itself is actually failing (wrong config, disabled provider, blocked
// network, etc.) that will now show as a visible toast with the real Firebase
// error code, instead of failing silently.
let authReadyResolve;
const authReady = new Promise(res => { authReadyResolve = res; });
let authResolved = false;
auth.onAuthStateChanged(user => {
  if (user && !authResolved) { authResolved = true; authReadyResolve(user.uid); }
});
auth.signInAnonymously().catch(err=>{
  console.error('[firebase-config] anonymous sign-in failed', err.code, err.message);
  toast('Sign-in error: ' + err.code, 'orange');
});

// The security rules require every reactions/views/poll/quiz write path to be
// keyed by the REAL Firebase auth uid (rule: auth.uid === $uid). deviceId is a
// separate, locally-generated id used only for display/history purposes — it is
// NOT the same value as auth.currentUser.uid, so any write path built from
// deviceId was being silently rejected by the rules for every non-admin user.
// This helper is the single correct key to use for those paths and lookups.
function myUid(){ return auth.currentUser ? auth.currentUser.uid : null; }

// Always resolves with whoever is CURRENTLY signed in. If sign-in has already
// completed (the common case — anonymous on load, or admin logged in later),
// resolves immediately with the live uid. Only actually waits on the very
// first load, before signInAnonymously() above has finished.
function getUid(){
  return auth.currentUser ? Promise.resolve(auth.currentUser.uid) : authReady.then(() => auth.currentUser && auth.currentUser.uid);
}

/* ============================================================
   STATE VARIABLES
============================================================ */
const $ = id => document.getElementById(id);
let deviceId = null, displayName = null;
let isAdmin = false, soundOn = true;
let readIds = new Set();
let viewedIds = new Set();
let savedIds = new Set();
let cache = {};
let activeTab = 'all';
let searchQuery = '';
let pageLimit = 20;
let hasMore = false;
let initialLoadDone = false;
let lastMaxTimestamp = 0;
let dbRefHandle = null, dbRefCb = null;
let observer = null;

const ALL_REACTIONS = ['😴','🙇','😂','🥳','📚','😭','🤓','😄','👀', '🧠', '🎓', '⚡', '🏆','🥺','🥶','🥵','👍','❤️', '🔥', '😘', '🎉', '😮', '👏', '💯', '🚀', '💡', '🤔', '🎯', '🙌','💪','📌','🌚','🤭','😁','☺️'];

/* ============================================================
   UTIL & HELPERS
============================================================ */
function esc(str){
  return String(str==null?'':str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
// Normalizes a vote/answer record into {choices:[indices], name, ts} — handles the OLD
// formats (a bare number, or a bare array for multi-select) that already exist in the
// database from before votes carried a name, as well as the current {opt/opts, name, ts}
// shape, so nothing written before this upgrade breaks.
function normalizeVote(v){
  if(v==null) return {choices:[], name:null, ts:null, deviceId:null};
  if(typeof v==='number') return {choices:[v], name:null, ts:null, deviceId:null};
  if(Array.isArray(v)) return {choices:v, name:null, ts:null, deviceId:null};
  if(typeof v==='object'){
    if(Array.isArray(v.opts)) return {choices:v.opts, name:v.name||null, ts:v.ts||null, deviceId:v.deviceId||null};
    if(typeof v.opt==='number') return {choices:[v.opt], name:v.name||null, ts:v.ts||null, deviceId:v.deviceId||null};
  }
  return {choices:[], name:null, ts:null, deviceId:null};
}
function relTime(ts){
  if(!ts) return 'just now';
  const diff = Math.max(0, Date.now()-ts);
  const s = Math.floor(diff/1000);
  if(s<60) return 'just now';
  const m = Math.floor(s/60);
  if(m<60) return m+'m ago';
  const h = Math.floor(m/60);
  if(h<24) return h+'h ago';
  const d = Math.floor(h/24);
  if(d<7) return d+'d ago';
  return new Date(ts).toLocaleDateString();
}
function toast(msg, color){
  const t = document.createElement('div');
  t.className = 'toast ' + (color==='orange' ? 'toast-orange' : 'toast-blue');
  t.textContent = msg;
  $('toastContainer').appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(), 300); }, 3500);
}

// Reading progress bar calculation
window.addEventListener('scroll', ()=>{
  const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const progress = (window.scrollY / totalHeight) * 100;
  $('readingProgress').style.width = progress + '%';
});

// Offline detection
window.addEventListener('online', ()=> $('offlineBanner').classList.remove('show'));
window.addEventListener('offline', ()=> $('offlineBanner').classList.add('show'));

/* ============================================================
   IDENTITY & LOCALSTORAGE
============================================================ */
function initIdentity(){
  deviceId = localStorage.getItem('notif_device_id');
  if(!deviceId){
    deviceId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('g-'+Math.random().toString(36).slice(2)+Date.now());
    localStorage.setItem('notif_device_id', deviceId);
  }
  displayName = localStorage.getItem('notif_display_name');
  if(!displayName){
    $('nameModal').classList.add('show');
  } else {
    $('settingsNameInput').value = displayName;
  }

  const savedTheme = localStorage.getItem('notif_theme') || '#1565ff';
  changeTheme(savedTheme, false);
  $('themeSelector').value = savedTheme;

  const savedFont = localStorage.getItem('notif_font') || '16px';
  changeFontSize(savedFont, false);
  $('fontSelector').value = savedFont;
}
function saveName(){
  const val = $('nameInput').value.trim();
  displayName = val || ('Scholar'+deviceId.slice(-4));
  localStorage.setItem('notif_display_name', displayName);
  $('settingsNameInput').value = displayName;
  $('nameModal').classList.remove('show');
  toast('Welcome, ' + displayName + '!', 'blue');
}
function updateDisplayName(val){
  val = val.trim();
  displayName = val || displayName || ('Scholar'+deviceId.slice(-4));
  localStorage.setItem('notif_display_name', displayName);
  toast('Display name updated', 'blue');
}
function changeTheme(color, save=true){
  document.documentElement.style.setProperty('--accent-color', color);
  if(save) localStorage.setItem('notif_theme', color);
}
function changeFontSize(size, save=true){
  document.body.style.fontSize = size;
  if(save) localStorage.setItem('notif_font', size);
}

/* ============================================================
   REALTIME SUBSCRIPTION
============================================================ */
function subscribe(){
  if(dbRefHandle && dbRefCb) dbRefHandle.off('value', dbRefCb);
  const ref = db.ref('notifications').orderByChild('timestamp').limitToLast(pageLimit);
  dbRefCb = ref.on('value', processSnapshot, err=>{
    toast('Connection error: '+err.message, 'orange');
    $('skeletonWrap').style.display='none';
  });
  dbRefHandle = ref;
}
function processSnapshot(snap){
  const val = snap.val() || {};
  const ids = Object.keys(val);
  const newCache = {};
  let maxTs = 0;
  ids.forEach(id=>{
    const item = val[id];
    item.id = id;
    newCache[id] = item;
    if((item.timestamp||0) > maxTs) maxTs = item.timestamp;
    if(item.views && item.views[myUid()]) viewedIds.add(id);
  });
  if(initialLoadDone){
    ids.forEach(id=>{
      const item = newCache[id];
      if((item.timestamp||0) > lastMaxTimestamp){
        handleNewItem(item);
      }
    });
  }
  lastMaxTimestamp = Math.max(lastMaxTimestamp, maxTs);
  cache = newCache;
  hasMore = ids.length >= pageLimit;
  $('loadMoreBtn').style.display = hasMore ? 'block' : 'none';
  $('skeletonWrap').style.display = 'none';
  initialLoadDone = true;
  renderFeed();
  updateUnreadBadge();
}
function loadMore(){
  pageLimit += 20;
  subscribe();
}
function manualRefresh(){
  const btn = $('refreshBtn');
  btn.classList.add('spin');
  setTimeout(()=>btn.classList.remove('spin'), 600);
  toast('Refreshed', 'blue');
}

/* ============================================================
   NOTIFICATIONS & AUDIO ALERTS
============================================================ */
let flashInterval = null;
const originalTitle = document.title;
function startFlash(){
  if(flashInterval) return;
  let on = false;
  flashInterval = setInterval(()=>{
    document.title = on ? originalTitle : '🔔 New Broadcast!';
    on = !on;
  }, 1000);
}
function stopFlash(){
  if(flashInterval){ clearInterval(flashInterval); flashInterval = null; document.title = originalTitle; }
}
window.addEventListener('focus', stopFlash);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) stopFlash(); });

function playBeep(){
  if(!soundOn) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type='sine'; o.frequency.value=784;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.5);
    o.start(); o.stop(ctx.currentTime+0.5);
  }catch(e){}
}
function handleNewItem(item){
  const preview = (item.poll && item.poll.question) || (item.quiz && item.quiz.question) || (item.text||'New announcement');
  const label = item.type==='poll' ? '📊 New poll: ' : item.type==='quiz' ? '💡 New quiz: ' : item.type==='image' ? '🖼️ New image: ' : '💬 Announcement: ';
  toast(label + preview.slice(0,40), item.priority==='urgent' ? 'orange' : 'blue');
  playBeep();
  if(document.hidden){
    startFlash();
    if('Notification' in window && Notification.permission==='granted'){
      try{ new Notification('Elite Scholar Institute', { body: preview.slice(0,80), icon: 'logo.jpg' }); }catch(e){}
    }
  }
}

/* ============================================================
   RENDER FEED
============================================================ */
function matchesSearch(it, q){
  const hay = [it.text, it.authorName, it.poll && it.poll.question, it.quiz && it.quiz.question, it.poll && it.poll.options && it.poll.options.join(' ')]
    .filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}
function renderFeed(){
  let items = Object.values(cache);
  const q = searchQuery.trim().toLowerCase();
  if(q) items = items.filter(it=>matchesSearch(it,q));
  if(activeTab==='unread') items = items.filter(it=>!readIds.has(it.id));
  else if(activeTab==='urgent') items = items.filter(it=>it.priority==='urgent');
  else if(activeTab==='poll') items = items.filter(it=>it.type==='poll');
  else if(activeTab==='quiz') items = items.filter(it=>it.type==='quiz');
  else if(activeTab==='image') items = items.filter(it=>it.type==='image');
  else if(activeTab==='saved') items = items.filter(it=>savedIds.has(it.id));

  items.sort((a,b)=>{
    const pa = a.pinned?1:0, pb = b.pinned?1:0;
    if(pa!==pb) return pb-pa;
    return (b.timestamp||0)-(a.timestamp||0);
  });

  const listEl = $('feedList');
  // Snapshot whatever's mid-interaction BEFORE tearing the list down — a view/reaction/vote
  // from someone else, anywhere in the feed, triggers this same rebuild, and without this
  // an open reaction picker or a focused input would just get wiped.
  const active = document.activeElement;
  let restoreInput = null;
  if(active && active.tagName==='INPUT' && active.id && active.id.startsWith('respInput-')){
    restoreInput = { id: active.id, value: active.value, selStart: active.selectionStart, selEnd: active.selectionEnd };
  }
  const openPicker = document.querySelector('.emoji-picker.show');
  const restorePickerId = openPicker ? openPicker.id : null;
  const prevScrollTop = listEl.scrollTop;

  if(items.length===0){
    listEl.innerHTML='';
    $('emptyState').style.display='block';
    $('emptyMsg').textContent = (q || activeTab!=='all') ? 'Nothing matches this filter' : 'No notifications yet';
  } else {
    $('emptyState').style.display='none';
    listEl.innerHTML = items.map(renderCard).join('');
  }

  if(restoreInput){
    const el = $(restoreInput.id);
    if(el){
      el.value = restoreInput.value;
      el.focus();
      try{ el.setSelectionRange(restoreInput.selStart, restoreInput.selEnd); }catch(e){}
    }
  }
  if(restorePickerId){
    const p = $(restorePickerId);
    if(p) p.classList.add('show');
  }
  listEl.scrollTop = prevScrollTop;
  if(observer){
    document.querySelectorAll('.notif-card.unread').forEach(el=>observer.observe(el));
    document.querySelectorAll('.notif-card').forEach(el=>observer.observe(el));
  }
}

function renderCard(it){
  const urgent = it.priority==='urgent';
  const unread = !readIds.has(it.id);
  const isSaved = savedIds.has(it.id);

  let bodyHtml = '';
  if(it.type==='message'){
    bodyHtml = `<div class="card-body">${esc(it.text)}</div>`;
  } else if(it.type==='image'){
    bodyHtml = (it.text ? `<div class="card-body">${esc(it.text)}</div>` : '') +
      `<img class="card-img" src="${esc(it.imageUrl)}" loading="lazy" data-action="lightbox" data-url="${esc(it.imageUrl)}" alt="broadcast image">`;
  } else if(it.type==='poll' && it.poll){
    const votes = it.poll.votes || {};
    const voterEntries = Object.keys(votes).map(dId=>({dId, ...normalizeVote(votes[dId])})).filter(e=>e.choices.length);
    const total = voterEntries.length;
    const myVote = normalizeVote(votes[myUid()]).choices;
    const isMultiple = !!it.poll.allowMultiple;
    const pollImg = it.poll.imageUrl ? `<img class="card-img" src="${esc(it.poll.imageUrl)}" loading="lazy" data-action="lightbox" data-url="${esc(it.poll.imageUrl)}" alt="poll image">` : '';
    
    bodyHtml = pollImg + `<div class="poll-q" style="margin-top:${pollImg?'8px':'0'}">${esc(it.poll.question)}</div>` +
      it.poll.options.map((opt,idx)=>{
        const count = voterEntries.filter(e=>e.choices.includes(idx)).length;
        const pct = total>0 ? Math.round(count/total*100) : 0;
        const mine = myVote.includes(idx);
        return `<div class="poll-opt" data-action="vote" data-id="${it.id}" data-opt="${idx}" data-multiple="${isMultiple}">
          <div class="poll-fill ${mine?'mine':''}" style="width:${pct}%"></div>
          <div class="poll-opt-label"><span>${mine?'✓ ':''}${esc(opt)} ${isMultiple?'':''}</span><span>${pct}% · ${count}</span></div>
        </div>`;
      }).join('') +
      `<div class="poll-total">${total} vote${total===1?'':'s'} total${(total>0 && isAdmin)?` · <span class="view-responses-link" onclick="event.stopPropagation();openVoteViewer('${it.id}','poll')">View responses</span>`:''}</div>`;
  } else if(it.type==='quiz' && it.quiz){
    const quizVotes = it.quiz.votes || {};
    const quizVoterEntries = Object.keys(quizVotes).map(dId=>({dId, ...normalizeVote(quizVotes[dId])})).filter(e=>e.choices.length);
    const myQuizAns = normalizeVote(quizVotes[myUid()]).choices[0]; // index chosen by user
    const hasAnswered = myQuizAns !== undefined;
    const quizImg = it.quiz.imageUrl ? `<img class="card-img" src="${esc(it.quiz.imageUrl)}" loading="lazy" data-action="lightbox" data-url="${esc(it.quiz.imageUrl)}" alt="quiz image">` : '';

    bodyHtml = quizImg + `<div class="poll-q" style="margin-top:${quizImg?'8px':'0'}">💡 Quiz: ${esc(it.quiz.question)}</div>` +
      it.quiz.options.map((opt, idx) => {
        let optClass = 'quiz-opt';
        let mark = '';
        if(hasAnswered){
          if(idx === it.quiz.correctIndex){
            optClass += ' correct';
            mark = ' ✓ (Correct)';
          } else if(myQuizAns === idx){
            optClass += ' incorrect';
            mark = ' ✗ (Your Answer)';
          }
        }
        return `<div class="${optClass}" ${hasAnswered ? '' : 'data-action="quiz-ans"'} data-id="${it.id}" data-opt="${idx}" style="${hasAnswered ? 'pointer-events: none; opacity: 0.9;' : ''}">            
          <span>${String.fromCharCode(65+idx)}. ${esc(opt)}${mark}</span>
        </div>`;
      }).join('') +
      (hasAnswered ? `<div class="quiz-explanation"><strong>Explanation:</strong> ${esc(it.quiz.explanation)}</div>` : '') +
      ((quizVoterEntries.length && isAdmin) ? `<div class="poll-total">${quizVoterEntries.length} answer${quizVoterEntries.length===1?'':'s'} so far · <span class="view-responses-link" onclick="event.stopPropagation();openVoteViewer('${it.id}','quiz')">View responses</span></div>` : '');
  }

  // Reactions & admin tooltips
  const reactions = it.reactions || {};
  const counts = {};
  const namesMap = {}; // emoji -> [names]
  Object.keys(reactions).forEach(dId => {
    const entry = reactions[dId];
    const emoji = typeof entry === 'string' ? entry : entry.emoji;
    const name = typeof entry === 'string' ? 'Scholar' : (entry.name || 'Scholar');
    counts[emoji] = (counts[emoji] || 0) + 1;
    if(!namesMap[emoji]) namesMap[emoji] = [];
    namesMap[emoji].push({ text: name, mine: entry.deviceId === deviceId });
  });
  const myReactionObj = reactions[myUid()];
  const myReaction = typeof myReactionObj === 'string' ? myReactionObj : (myReactionObj && myReactionObj.emoji);

  const reactionChips = Object.keys(counts).map(e => {
    const reactedNamesStr = (namesMap[e] || []).map(n => n.mine ? `${esc(n.text)} (you)` : esc(n.text)).join('');
    const adminTooltipHtml = isAdmin ? `<div class="reaction-names-tooltip">Reacted by: ${esc(reactedNamesStr)}</div>` : '';
    return `<button class="reaction-chip ${myReaction===e?'mine':''}" data-action="react" data-id="${it.id}" data-emoji="${e}">
      ${e} ${counts[e]}${adminTooltipHtml}
    </button>`;
  }).join('');

  const emojiPickerBtns = ALL_REACTIONS.map(e=>`<button data-action="react" data-id="${it.id}" data-emoji="${e}">${e}</button>`).join('');

  // WhatsApp-style responses
  const responses = it.responses || {};
  const responseIds = Object.keys(responses);
  const responseListHtml = responseIds.map(rId => {
    const r = responses[rId];
    return `<div class="response-item">
      <div class="response-author">${esc(r.authorName)}${r.deviceId===deviceId?' (you)':''} ${r.replyTo ? '↩ replied to '+esc(r.replyTo) : ''}</div>
      <div class="response-text">${esc(r.text)}</div>
      ${isAdmin ? `<button class="tool-btn" style="margin-top:4px" onclick="replyToResponse('${it.id}','${esc(r.authorName)}')">💬 Reply to this</button>` : ''}
    </div>`;
  }).join('');

  const responsesSectionHtml = `<div class="responses-section">
    <div class="response-list">${responseListHtml || '<div style="font-size:10px;color:var(--muted2)">No responses yet. Be the first to reply!</div>'}</div>
    <div class="response-reply-bar">
      <input type="text" class="response-input" id="respInput-${it.id}" placeholder="Type a response..." onkeydown="if(event.key==='Enter')sendResponse('${it.id}')">
      <button class="response-send-btn" onclick="sendResponse('${it.id}')">Send</button>
    </div>
  </div>`;

  // Views counter (Admin only)
  const viewsObj = it.views || {};
  const viewCount = Object.keys(viewsObj).length;
  const viewsHtml = isAdmin ? `<div class="card-views-counter" style="cursor:pointer" onclick="openViewsViewer('${it.id}')">${viewCount} 👁️ Views, Click to see viewers</div>` : '';

  const adminRow = isAdmin ? `<div class="admin-row">
      <button class="admin-btn" data-action="pin" data-id="${it.id}">${it.pinned?'📌 Unpin':'📌 Pin'}</button>
      <button class="admin-btn" data-action="edit" data-id="${it.id}">✏️ Edit</button>
      <button class="admin-btn danger" data-action="delete" data-id="${it.id}">🗑️ Delete</button>
    </div>` : '';

  return `<div class="notif-card ${urgent?'urgent':''} ${it.pinned?'pinned':''} ${unread?'unread':''}" data-card-id="${it.id}">
    <div class="card-top">
      <div class="card-author">
        <div class="author-avatar"><img src="logo.jpg" alt="Admin"></div>
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="author-name">${esc(it.authorName||'Elite Scholar Institute')}</span>
            <span class="chip-mini chip-admin">ADMIN</span>
          </div>
          <div class="card-meta">${relTime(it.timestamp)} ${it.edited?'<span class="chip-mini chip-edited">Edited</span>':''}</div>
        </div>
      </div>
      <div style="display:flex;gap:5px;align-items:center">
        ${it.pinned?'<span class="chip-mini chip-pinned">📌 PINNED</span>':''}
        ${urgent?'<span class="chip-mini chip-urgent">URGENT</span>':''}
      </div>
    </div>
    ${bodyHtml}
    <div class="reaction-row">
      ${reactionChips}
      <div style="position:relative">
        <button class="reaction-add" onclick="event.stopPropagation();toggleEmojiPicker('${it.id}')" title="Add reaction">👍+</button>
        <div class="emoji-picker" id="picker-${it.id}">${emojiPickerBtns}</div>
      </div>
    </div>
    ${viewsHtml}
    ${responsesSectionHtml}
    <div class="card-tools">
      <button class="tool-btn" data-action="save" data-id="${it.id}">${isSaved?'⭐ Saved':'☆ Save'}</button>
      <button class="tool-btn" data-action="copy" data-id="${it.id}">📋 Copy Text</button>
      <button class="tool-btn" data-action="share" data-id="${it.id}">🔗 Share</button>
    </div>
    ${adminRow}
  </div>`;
}

/* ============================================================
   READ, SAVE & VIEW TRACKING
============================================================ */
function saveReadIds(){
  localStorage.setItem('notif_read_ids', JSON.stringify(Array.from(readIds).slice(-500)));
}
function saveSavedIds(){
  localStorage.setItem('notif_saved_ids', JSON.stringify(Array.from(savedIds)));
}
function markRead(id){
  if(readIds.has(id)) return;
  readIds.add(id);
  saveReadIds();
  const el = document.querySelector(`[data-card-id="${id}"]`);
  if(el) el.classList.remove('unread');
  updateUnreadBadge();
  if(activeTab==='unread') renderFeed();
}
function markAllRead(){
  Object.keys(cache).forEach(id=>readIds.add(id));
  saveReadIds();
  updateUnreadBadge();
  renderFeed();
  toast('All marked as read', 'blue');
}
function updateUnreadBadge(){
  const count = Object.values(cache).filter(it=>!readIds.has(it.id)).length;
  const badge = $('unreadBadge');
  if(count>0){ badge.textContent = count>99?'99+':count; badge.classList.add('show'); }
  else badge.classList.remove('show');
}
function registerView(id){
  if(!id || viewedIds.has(id)) return;
  viewedIds.add(id);
  getUid().then(uid => {
    const viewsRef = db.ref(`notifications/${id}/views`);
    viewsRef.once('value').then(snap => {
      const all = snap.val() || {};
      const alreadyOnThisDevice = Object.values(all).some(v => v && v.deviceId === deviceId);
      if(alreadyOnThisDevice) return; // this device already has a view here, under ANY identity — stop, permanently
      db.ref(`notifications/${id}/views/${uid}`).set({at: firebase.database.ServerValue.TIMESTAMP, uid: uid, name: displayName, deviceId: deviceId}).catch(err=>console.warn('[views] failed', err.code));
    });
  });
}
function setupObserver(){
  observer = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const id = entry.target.dataset.cardId;
        setTimeout(()=>markRead(id), 1200);
        registerView(id);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
}

/* ============================================================
   TABS & SEARCH
============================================================ */
function setTab(tab){
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  renderFeed();
}
function toggleSearch(){
  $('searchWrap').classList.toggle('open');
  if($('searchWrap').classList.contains('open')) $('searchInput').focus();
}
function onSearchInput(v){
  searchQuery = v;
  renderFeed();
}

/* ============================================================
   INTERACTIONS: REACTIONS, VOTES, QUIZ, RESPONSES
============================================================ */
function toggleEmojiPicker(id){
  document.querySelectorAll('.emoji-picker').forEach(p=>{ if(p.id!=='picker-'+id) p.classList.remove('show'); });
  $('picker-'+id).classList.toggle('show');
}
document.addEventListener('click', e=>{
  if(!e.target.closest('.reaction-add') && !e.target.closest('.emoji-picker')){
    document.querySelectorAll('.emoji-picker').forEach(p=>p.classList.remove('show'));
  }
});

function vote(notifId, optIdx){
  const it = cache[notifId];
  if(!it || !it.poll) return;
  const isMultiple = !!it.poll.allowMultiple;
  const myName = displayName || ('Scholar'+deviceId.slice(-4));

  getUid().then(uid => {
    const votesRef = db.ref(`notifications/${notifId}/poll/votes/${uid}`);
    if(isMultiple){
      votesRef.once('value').then(snap => {
        const cur = normalizeVote(snap.val());
        const arr = cur.choices.slice();
        const pos = arr.indexOf(optIdx);
        if(pos >= 0) arr.splice(pos, 1);
        else arr.push(optIdx);
        if(!arr.length){ votesRef.remove().catch(err=>toast('Vote failed: '+err.message,'orange')); return; }
        votesRef.set({opts: arr, name: myName, uid: uid, ts: firebase.database.ServerValue.TIMESTAMP, deviceId: deviceId})
          .catch(err=>toast('Vote failed: '+err.message,'orange'));
      }).catch(err=>toast('Vote failed: '+err.message,'orange'));
    } else {
      votesRef.set({opt: optIdx, name: myName, uid: uid, ts: firebase.database.ServerValue.TIMESTAMP, deviceId: deviceId})
        .catch(err=>toast('Vote failed: '+err.message,'orange'));
    }
  });
}

function answerQuiz(notifId, optIdx){
  const myName = displayName || ('Scholar'+deviceId.slice(-4));
  getUid().then(uid => {
    db.ref(`notifications/${notifId}/quiz/votes/${uid}`)
      .set({opt: optIdx, name: myName, uid: uid, ts: firebase.database.ServerValue.TIMESTAMP, deviceId: deviceId})
      .catch(err=>toast('Quiz answer failed: '+err.message,'orange'));
  });
}

// WhatsApp-style "View responses" — lists every option with who picked it and when,
// newest first. Works for both polls and quizzes off the same normalized vote shape.
function openVoteViewer(itemId, kind){
  if(!isAdmin) return;
  const it = cache[itemId];
  if(!it) return;
  const data = kind==='poll' ? it.poll : it.quiz;
  if(!data) return;
  const votesRaw = data.votes || {};
  const entries = Object.keys(votesRaw).map(dId=>({dId, ...normalizeVote(votesRaw[dId])})).filter(e=>e.choices.length);
  const correctIdx = kind==='quiz' ? data.correctIndex : null;
  $('voteViewerTitle').textContent = kind==='quiz' ? 'Quiz Responses' : 'Poll Responses';
  $('voteViewerQ').innerHTML = esc(data.question);
  $('voteViewerBody').innerHTML = data.options.map((opt,idx)=>{
    const optVoters = entries.filter(e=>e.choices.includes(idx)).sort((a,b)=>(b.ts||0)-(a.ts||0));
    return `<div class="vv-opt">
      <div class="vv-opt-head">${String.fromCharCode(65+idx)}. ${esc(opt)} ${idx===correctIdx?'<span class="vv-correct-badge">✓ Correct</span>':''}<span class="vv-count">${optVoters.length}</span></div>
      ${optVoters.length ? optVoters.map(v=>`
        <div class="vv-row">
          <div class="vv-avatar">${esc((v.name||'?').trim().slice(0,1).toUpperCase()||'?')}</div>
          <div class="vv-meta"><div class="vv-name">${esc(v.name||'Anonymous Scholar')}${v.deviceId===deviceId?' (you)':''}</div><div class="vv-time">${v.ts?relTime(v.ts):'just now'}</div></div>
        </div>`).join('') : '<div class="vv-empty">No one yet</div>'}
    </div>`;
  }).join('');
  $('voteViewerModal').classList.add('show');
}
function closeVoteViewer(){ $('voteViewerModal').classList.remove('show'); }
function openViewsViewer(itemId){
  const it = cache[itemId];
  if(!it) return;
  const viewsObj = it.views || {};
  const entries = Object.keys(viewsObj).map(uid=>({uid, ...viewsObj[uid]})).sort((a,b)=>(b.at||0)-(a.at||0));
  $('viewsViewerBody').innerHTML = entries.length ? entries.map(v=>`
    <div class="vv-row">
      <div class="vv-avatar">${esc((v.name||'?').trim().slice(0,1).toUpperCase()||'?')}</div>
   <div class="vv-meta"><div class="vv-name">${esc(v.name||'Anonymous Scholar')}${v.deviceId===deviceId?' (you)':''}</div><div class="vv-time">${v.at?relTime(v.at):'just now'}</div></div>
    </div>`).join('') : '<div class="vv-empty">No one yet</div>';
  $('viewsViewerModal').classList.add('show');
}
function closeViewsViewer(){ $('viewsViewerModal').classList.remove('show'); }

function toggleReaction(notifId, emoji){
  getUid().then(uid => {
    const path = `notifications/${notifId}/reactions/${uid}`;
    const currentObj = cache[notifId] && cache[notifId].reactions && cache[notifId].reactions[uid];
    const curEmoji = typeof currentObj === 'string' ? currentObj : (currentObj && currentObj.emoji);

    if(curEmoji === emoji){
      db.ref(path).remove().catch(err=>console.warn('[reaction] remove failed', err.code));
    } else {
      db.ref(path).set({ emoji: emoji, name: displayName || ('Scholar'+deviceId.slice(-4)), uid: uid, deviceId: deviceId }).catch(err=>console.warn('[reaction] set failed', err.code));
    }
  });
  document.querySelectorAll('.emoji-picker').forEach(p=>p.classList.remove('show'));
}

function sendResponse(notifId){
  const inputEl = $(`respInput-${notifId}`);
  if(!inputEl) return;
  const text = inputEl.value.trim();
  if(!text) return;

  getUid().then(uid => {
    const respRef = db.ref(`notifications/${notifId}/responses`).push();
    respRef.set({
      authorName: displayName || ('Scholar'+deviceId.slice(-4)),
      text: text,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      deviceId: deviceId,
      uid: uid
    }).then(()=>{
      inputEl.value = '';
      toast('Response sent ✓', 'blue');
    }).catch(e=>toast('Response failed: '+e.message, 'orange'));
  });
}

let replyTargetName = '';
function replyToResponse(notifId, authorName){
  replyTargetName = authorName;
  const inputEl = $(`respInput-${notifId}`);
  if(inputEl){
    inputEl.value = `@${authorName} `;
    inputEl.focus();
  }
}
function toggleSavePost(id){
  if(savedIds.has(id)){
    savedIds.delete(id);
    toast('Removed from saved', 'orange');
  } else {
    savedIds.add(id);
    toast('Saved to favorites ⭐', 'blue');
  }
  saveSavedIds();
  renderFeed();
}
function copyCardText(id){
  const it = cache[id];
  if(!it) return;
  const txt = it.text || (it.poll && it.poll.question) || (it.quiz && it.quiz.question) || 'Notification';
  navigator.clipboard.writeText(txt).then(()=>toast('Copied to clipboard ✓', 'blue'));
}
function shareCard(id){
  const it = cache[id];
  if(!it) return;
  const txt = it.text || (it.poll && it.poll.question) || (it.quiz && it.quiz.question) || 'Elite Scholar Institute Notification';
  if(navigator.share){
    navigator.share({ title: 'Elite Scholar Institute', text: txt, url: window.location.href }).catch(()=>{});
  } else {
    copyCardText(id);
  }
}
function deleteNotif(id){
  if(!isAdmin) return;
  if(!confirm('Delete this broadcast for everyone?')) return;
  db.ref('notifications/'+id).remove()
    .then(()=>toast('Broadcast deleted','blue'))
    .catch(e=>toast('Delete failed: '+e.message,'orange'));
}
function togglePin(id){
  if(!isAdmin) return;
  const cur = !!(cache[id] && cache[id].pinned);
  db.ref('notifications/'+id+'/pinned').set(!cur).catch(e=>toast('Pin failed: '+e.message,'orange'));
}
function openEditModal(id){
  if(!isAdmin) return;
  const it = cache[id];
  if(!it) return;
  $('editNotifId').value = id;
  $('editTextContent').value = it.text || (it.poll && it.poll.question) || (it.quiz && it.quiz.question) || '';
  $('editModal').classList.add('show');
}
function closeEditModal(){
  $('editModal').classList.remove('show');
  $('editNotifId').value = '';
  $('editTextContent').value = '';
}
function saveEditedNotification(){
  const id = $('editNotifId').value;
  const val = $('editTextContent').value.trim();
  if(!id || !val) return;
  const it = cache[id];
  if(!it) return;

  let updatePayload = { edited: true };
  if(it.type==='poll') updatePayload['poll/question'] = val;
  else if(it.type==='quiz') updatePayload['quiz/question'] = val;
  else updatePayload['text'] = val;

  db.ref('notifications/'+id).update(updatePayload)
    .then(()=>{
      closeEditModal();
      toast('Broadcast updated successfully ✓', 'blue');
    })
    .catch(e=>toast('Update failed: '+e.message, 'orange'));
}

document.addEventListener('DOMContentLoaded', ()=>{
  const feedEl = document.getElementById('feedList');
  feedEl.addEventListener('click', e=>{
    const target = e.target.closest('[data-action]');
    if(!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if(action==='vote') vote(id, parseInt(target.dataset.opt,10));
        else if(action==='quiz-ans') {
      const it = cache[id];
      if (it && it.quiz && it.quiz.votes && it.quiz.votes[myUid()] !== undefined) {
        toast('Your answer is final and cannot be changed!', 'orange');
        return;
      }
      answerQuiz(id, parseInt(target.dataset.opt,10));
    }
    
    else if(action==='react') toggleReaction(id, target.dataset.emoji);
    else if(action==='delete') deleteNotif(id);
    else if(action==='pin') togglePin(id);
    else if(action==='edit') openEditModal(id);
    else if(action==='save') toggleSavePost(id);
    else if(action==='copy') copyCardText(id);
    else if(action==='share') shareCard(id);
    else if(action==='lightbox') openLightbox(target.dataset.url);
  });

  try{
    readIds = new Set(JSON.parse(localStorage.getItem('notif_read_ids')||'[]'));
    savedIds = new Set(JSON.parse(localStorage.getItem('notif_saved_ids')||'[]'));
  }catch(e){ readIds = new Set(); savedIds = new Set(); }
});

/* ============================================================
   COMPOSE & BASE64 IMAGE UPLOAD WORKAROUND
============================================================ */
function onFabClick(){
  if(isAdminBanned()) return;
  if(!isAdmin){ openAdminLogin(); return; }
  openCompose();
}
function openCompose(){ $('composeModal').classList.add('show'); }
function closeCompose(){ $('composeModal').classList.remove('show'); resetComposeForm(); }
function switchComposeTab(tab){
  document.querySelectorAll('.compose-tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.ct===tab));
  document.querySelectorAll('.compose-section').forEach(s=>s.classList.remove('active'));
  $('composeSection-'+tab).classList.add('active');
}
function toggleImgMode(){
  const mode = document.querySelector('input[name=imgMode]:checked').value;
  $('imgUploadField').style.display = mode==='upload' ? 'block' : 'none';
  $('imgUrlField').style.display = mode==='url' ? 'block' : 'none';
}
function addPollOption(){
  const wrap = $('pollOptionsContainer');
  if(wrap.children.length>=6){ toast('Maximum 6 options','orange'); return; }
  const row = document.createElement('div');
  row.className = 'poll-opt-row';
  const input = document.createElement('input');
  input.type='text'; input.className='pollOptionInput'; input.placeholder='Option '+(wrap.children.length+1);
  const rm = document.createElement('button');
  rm.type='button'; rm.className='opt-remove'; rm.textContent='✕';
  rm.onclick = ()=>row.remove();
  row.appendChild(input); row.appendChild(rm);
  wrap.appendChild(row);
}

function addQuizOption(){
  const wrap = $('quizOptionsContainer');
  if(wrap.children.length>=6){ toast('Maximum 6 options','orange'); return; }
  const row = document.createElement('div');
  row.className = 'poll-opt-row';
  const input = document.createElement('input');
  input.type='text'; input.className='quizOptionInput'; input.placeholder='Option '+(wrap.children.length+1);
  const sel = document.createElement('select');
  sel.className = 'quizCorrectSelect';
  sel.style.cssText = 'width:70px;background:var(--card2);color:var(--text);border:1px solid var(--border);border-radius:9px;font-size:10px';
  sel.innerHTML = '<option value="correct">Correct</option><option value="wrong" selected>Wrong</option>';
  const rm = document.createElement('button');
  rm.type='button'; rm.className='opt-remove'; rm.textContent='✕';
  rm.onclick = ()=>row.remove();
  row.appendChild(input); row.appendChild(sel); row.appendChild(rm);
  wrap.appendChild(row);
}

function resetComposeForm(){
  $('composeText').value='';
  $('composeImgCaption').value='';
  $('composeImgUrl').value='';
  $('composeImgFile').value='';
  $('composePollQ').value='';
  $('composePollImgFile').value='';
  $('composePollImgUrl').value='';
  $('composePollMultiple').checked = false;
  $('composeQuizQ').value='';
  $('composeQuizImgFile').value='';
  $('composeQuizImgUrl').value='';
  $('composeQuizExplanation').value='';
  $('pollOptionsContainer').innerHTML =
    '<div class="poll-opt-row"><input type="text" class="pollOptionInput" placeholder="Option 1"></div>'+
    '<div class="poll-opt-row"><input type="text" class="pollOptionInput" placeholder="Option 2"></div>';
  $('quizOptionsContainer').innerHTML =
    '<div class="poll-opt-row"><input type="text" class="quizOptionInput" placeholder="Option A"><select class="quizCorrectSelect" style="width:70px;background:var(--card2);color:var(--text);border:1px solid var(--border);border-radius:9px;font-size:10px"><option value="correct">Correct</option><option value="wrong" selected>Wrong</option></select></div>'+
    '<div class="poll-opt-row"><input type="text" class="quizOptionInput" placeholder="Option B"><select class="quizCorrectSelect" style="width:70px;background:var(--card2);color:var(--text);border:1px solid var(--border);border-radius:9px;font-size:10px"><option value="correct">Correct</option><option value="wrong" selected>Wrong</option></select></div>';
  $('uploadProgressWrap').style.display='none';
  switchComposeTab('message');
}

function fileToDataUrl(file, callback){
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const maxDim = 900;
      if(w > h && w > maxDim){ h *= maxDim/w; w = maxDim; }
      else if(h > maxDim){ w *= maxDim/h; h = maxDim; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function pushNotif(data){
  const ref = db.ref('notifications').push(data);
  ref.then(()=>{
      closeCompose();
      toast('Broadcast sent successfully ✓', 'blue');
      cache[ref.key] = { ...data, id: ref.key, timestamp: Date.now() };
      renderFeed();
    })
    .catch(e=>toast('Send failed: '+e.message,'orange'));
}

function sendMessage(){
  const text = $('composeText').value.trim();
  if(!text){ toast('Type a message first','orange'); return; }
  pushNotif({
    type:'message', text, priority:$('composePriority').value, pinned:false,
    authorName: displayName || 'Elite Scholar Institute',
    timestamp: firebase.database.ServerValue.TIMESTAMP, reactions:{}, responses:{}, views:{}
  });
}

function sendImage(){
  const caption = $('composeImgCaption').value.trim();
  const priority = $('composeImgPriority').value;
  const mode = document.querySelector('input[name=imgMode]:checked').value;

  if(mode==='url'){
    const url = $('composeImgUrl').value.trim();
    if(!url){ toast('Paste an image URL','orange'); return; }
    pushNotif({
      type:'image', imageUrl:url, text:caption, priority, pinned:false,
      authorName: displayName || 'Elite Scholar Institute',
      timestamp: firebase.database.ServerValue.TIMESTAMP, reactions:{}, responses:{}, views:{}
    });
  } else {
    const file = $('composeImgFile').files[0];
    if(!file){ toast('Choose an image file','orange'); return; }
    $('uploadProgressWrap').style.display='block';
    $('uploadProgressLabel').textContent = 'Processing image...';
    fileToDataUrl(file, dataUrl => {
      pushNotif({
        type:'image', imageUrl:dataUrl, text:caption, priority, pinned:false,
        authorName: displayName || 'Elite Scholar Institute',
        timestamp: firebase.database.ServerValue.TIMESTAMP, reactions:{}, responses:{}, views:{}
      });
      $('uploadProgressWrap').style.display='none';
    });
  }
}

function sendPoll(){
  const question = $('composePollQ').value.trim();
  const options = Array.from(document.querySelectorAll('.pollOptionInput')).map(i=>i.value.trim()).filter(Boolean);
  const priority = $('composePollPriority').value;
  const allowMultiple = $('composePollMultiple').checked;

  if(!question){ toast('Add a poll question','orange'); return; }
  if(options.length<2){ toast('Add at least 2 options','orange'); return; }

  const pollImgFile = $('composePollImgFile').files[0];
  const pollImgUrlInput = $('composePollImgUrl').value.trim();

  const finalizePoll = (imgUrl = '') => {
    pushNotif({
      type:'poll', poll:{ question, options, allowMultiple, imageUrl: imgUrl, votes:{} }, priority, pinned:false,
      authorName: displayName || 'Elite Scholar Institute',
      timestamp: firebase.database.ServerValue.TIMESTAMP, reactions:{}, responses:{}, views:{}
    });
  };

  if(pollImgFile){
    $('uploadProgressWrap').style.display='block';
    $('uploadProgressLabel').textContent = 'Processing poll image...';
    fileToDataUrl(pollImgFile, dataUrl => {
      $('uploadProgressWrap').style.display='none';
      finalizePoll(dataUrl);
    });
  } else if(pollImgUrlInput){
    finalizePoll(pollImgUrlInput);
  } else {
    finalizePoll('');
  }
}

function sendQuiz(){
  const question = $('composeQuizQ').value.trim();
  const explanation = $('composeQuizExplanation').value.trim();
  const optionRows = Array.from(document.querySelectorAll('#quizOptionsContainer .poll-opt-row'));
  const options = [];
  let correctIndex = -1;

  optionRows.forEach((row, idx) => {
    const val = row.querySelector('.quizOptionInput').value.trim();
    const isCorrect = row.querySelector('.quizCorrectSelect').value === 'correct';
    if(val){
      options.push(val);
      if(isCorrect) correctIndex = idx;
    }
  });

  const priority = $('composeQuizPriority').value;
  if(!question){ toast('Add a quiz question','orange'); return; }
  if(options.length < 2){ toast('Add at least 2 options','orange'); return; }
  if(correctIndex === -1){ toast('Please mark at least one correct option','orange'); return; }
  if(!explanation){ toast('Provide an explanation','orange'); return; }

  const quizImgFile = $('composeQuizImgFile').files[0];
  const quizImgUrlInput = $('composeQuizImgUrl').value.trim();

  const finalizeQuiz = (imgUrl = '') => {
    pushNotif({
      type:'quiz',
      quiz: { question, options, correctIndex, explanation, imageUrl: imgUrl, votes: {} },
      priority, pinned: false,
      authorName: displayName || 'Elite Scholar Institute',
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      reactions: {}, responses: {}, views: {}
    });
  };

  if(quizImgFile){
    $('uploadProgressWrap').style.display='block';
    $('uploadProgressLabel').textContent = 'Processing quiz image...';
    fileToDataUrl(quizImgFile, dataUrl => {
      $('uploadProgressWrap').style.display='none';
      finalizeQuiz(dataUrl);
    });
  } else if(quizImgUrlInput){
    finalizeQuiz(quizImgUrlInput);
  } else {
    finalizeQuiz('');
  }
}

/* ============================================================
   ADMIN AUTHENTICATION
   Real enforcement is this Firebase sign-in + the security rules (which
   check auth.token.email) — not a password string sitting in this file.
   IMPORTANT ONE-TIME SETUP: this only works once an admin user actually
   exists in this Firebase project — Firebase Console → Authentication →
   Users → Add user → email admin@elitescholarinstitute.app with your
   password. Until that user exists, every password attempt fails with
   "Incorrect password" no matter what's typed, because there's no account
   to sign in to yet — that's almost certainly what's happening right now.
============================================================ */
const ADMIN_EMAIL = "admin@elitescholarinstitute.app";

// Bump BAN_VERSION (e.g. to 'v2') to reset every device's ban/attempt count —
// old records just live under the old version's key and stop being read.
const BAN_VERSION = 'v3';
const BAN_KEY = 'notif_admin_banned_' + BAN_VERSION;
const ATTEMPTS_KEY = 'notif_admin_attempts_' + BAN_VERSION;

function isAdminBanned(){ return localStorage.getItem(BAN_KEY) === '1'; }
function recordFailedAdminAttempt(){
  const n = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) + 1;
  localStorage.setItem(ATTEMPTS_KEY, String(n));
  if(n >= 3){
    localStorage.setItem(BAN_KEY, '1');
    updateAdminUI();
    toast('You have been permanently banned from this access', 'orange');
    return true;
  }
  return false;
}
async function tryAdminLogin(){
  const pw = $('adminPwInput').value;
  await attemptAdminSignIn(pw, closeAdminLogin);
}
async function trySettingsAdminLogin(){
  const pw = $('settingsAdminPw').value;
  await attemptAdminSignIn(pw, closeSettings);
}
async function attemptAdminSignIn(pw, onSuccessClose){
  if(isAdminBanned()) return;
  if(!pw){ toast('Enter the admin password', 'orange'); return; }
  try{
    await auth.signInWithEmailAndPassword(ADMIN_EMAIL, pw);
    isAdmin = true;
    sessionStorage.setItem('notif_is_admin', 'true');
    if(onSuccessClose) onSuccessClose();
    toast('Admin access granted ✓', 'blue');
    updateAdminUI();
    renderFeed();
  }catch(err){
    console.warn('[admin auth] sign-in failed', err.code);
    if(err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed'){
      toast('Email/Password sign-in isn\'t enabled for this project yet — check Firebase Console → Authentication → Sign-in method', 'orange');
    }else if(err.code === 'auth/user-not-found'){
      toast('No admin account exists yet', 'orange');
    }else{
      if(!recordFailedAdminAttempt()) toast('Incorrect password', 'orange');
    }
  }
}
function adminLogout(){
  auth.signOut();
  isAdmin = false;
  sessionStorage.removeItem('notif_is_admin');
  updateAdminUI();
  renderFeed();
  toast('Admin mode logged out','blue');
}
// Firebase Auth sessions persist across reloads on their own. If this device
// previously proved it was the admin, re-sync isAdmin with what Firebase
// actually thinks on every load, rather than trusting the old sessionStorage
// flag blindly forever (e.g. after a manual sign-out from another tab).
auth.onAuthStateChanged(user=>{
  const reallyAdmin = !!(user && user.email === ADMIN_EMAIL);
  if(reallyAdmin !== isAdmin){
    isAdmin = reallyAdmin;
    updateAdminUI();
    renderFeed();
  }
  if(reallyAdmin) sessionStorage.setItem('notif_is_admin','true');
  else sessionStorage.removeItem('notif_is_admin');
});
function openAdminLogin(){ $('adminLoginModal').classList.add('show'); }
function closeAdminLogin(){ $('adminLoginModal').classList.remove('show'); $('adminPwInput').value=''; }
function updateAdminUI(){
  $('fab').style.display = isAdminBanned() ? 'none' : '';
  $('fabIcon').textContent = '＋';
  $('fabLock').classList.toggle('show', !isAdmin);
  refreshSettingsAdminSection();
}


/* ============================================================
   SETTINGS MODAL & EXPORT
============================================================ */
// Settings-modal admin login/logout intentionally disabled.
// Overrides app.js's refreshSettingsAdminSection() (later script,
// same global scope, wins) so the settings admin section never
// renders. The lock-icon login (tryAdminLogin/openAdminLogin) is
// untouched and still works exactly as before.
function refreshSettingsAdminSection(){}
function openSettings(){
  $('soundToggle').checked = soundOn;
  refreshSettingsAdminSection();
  $('settingsModal').classList.add('show');
}
function closeSettings(){ $('settingsModal').classList.remove('show'); }
function toggleSound(e){
  soundOn = e.target.c
  hecked;
  localStorage.setItem('notif_sound_on', soundOn?'1':'0');
}
function requestPush(){
  if(!('Notification' in window)){ toast('Push not supported','orange'); return; }
  Notification.requestPermission().then(p=>{
    if(p==='granted') toast('Push notifications enabled ✓','blue');
    else toast('Permission denied','orange');
  });
}
function clearReadHistory(){
  readIds = new Set();
  saveReadIds();
  updateUnreadBadge();
  renderFeed();
  toast('Read history cleared','blue');
}
function exportSavedPosts(){
  const savedArr = Array.from(savedIds).map(id=>cache[id]).filter(Boolean);
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedArr, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "saved_notifications.json");
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  toast('Saved posts exported ✓', 'blue');
}

/* ============================================================
   LIGHTBOX VIEWER
============================================================ */
let activeLightboxUrl = '';
function openLightbox(url){
  activeLightboxUrl = url;
  $('lightboxImg').src = url;
  $('lightboxModal').classList.add('show');
}
function closeLightbox(){
  $('lightboxModal').classList.remove('show');
  $('lightboxImg').src = '';
  activeLightboxUrl = '';
}
function downloadLightboxImage(){
  if(!activeLightboxUrl) return;
  const a = document.createElement('a');
  a.href = activeLightboxUrl;
  a.download = 'announcement_image.jpg';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Downloading image...', 'blue');
}

/* ============================================================
   INITIALIZATION
============================================================ */
function init(){
  initIdentity();
  isAdmin = sessionStorage.getItem('notif_is_admin')==='true';
  soundOn = localStorage.getItem('notif_sound_on') !== '0';
  updateAdminUI();
  setupObserver();
  subscribe();
}
window.addEventListener('DOMContentLoaded', init);
