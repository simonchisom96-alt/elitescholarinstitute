/* Elite Scholar Institute — Multiplayer loader
   The original multiplayer engine lives in multiplayer-core.js.
   This file keeps the existing quiz.html script path unchanged and
   makes Multiplayer immediately free after the engine finishes loading.
*/
(function(){
  const core = document.createElement('script');
  core.src = './multiplayer-core.js';
  core.onload = function(){
    window.isUnlocked = function(){ return true; };

    window.updateUI = function(){
      const multiBtn = document.getElementById('multiBtn');
      const multiSub = document.getElementById('multiSub');
      const multiTitle = document.getElementById('multiTitle');
      const multiIcon = document.getElementById('multiIcon');
      const multiArrow = document.getElementById('multiArrow');
      const unlockCard = document.getElementById('unlockCard');
      const statusPill = document.getElementById('statusPill');
      const faq = document.getElementById('faqSection');

      if(multiBtn) multiBtn.className = 'mode-btn multi';
      if(multiIcon) multiIcon.textContent = '👥';
      if(multiTitle) multiTitle.textContent = 'Multiplayer';
      if(multiSub) multiSub.textContent = 'Free • Tap to enter';
      if(multiArrow) multiArrow.textContent = '→';
      if(unlockCard) unlockCard.style.display = 'none';
      if(statusPill){
        statusPill.className = 'status-pill unlocked';
        statusPill.textContent = '👥 Multiplayer Free';
      }
      if(faq) faq.style.display = 'none';
    };

    window.handleMultiClick = function(){
      if(typeof window.enterMultiplayer === 'function') window.enterMultiplayer();
    };

    window.openWhatsApp = function(){};
    window.redeemPasscode = function(){};
    window.applyUnlockKey = function(){};

    /*
       LEADERBOARD SAFETY FIX
       The core leaderboard historically orders by the stored rankScore, while
       the table displays the current ELO. rankScore can be stale after ELO
       changes, which can make a low/current ELO player appear above a higher one.
       Do not rewrite or delete any Firebase data here. After the core finishes
       its normal load, reorder only the rendered leaderboard by the CURRENT ELO.
       This also keeps the podium aligned with the corrected table order.
    */
    const originalOpenLB = window.openLB;
    if(typeof originalOpenLB === 'function'){
      window.openLB = async function(){
        const result = await originalOpenLB.apply(this, arguments);

        try{
          const body = document.getElementById('lbBody');
          if(!body) return result;

          const rows = Array.from(body.querySelectorAll('tr'))
            .filter(row => row.cells && row.cells.length >= 3);

          rows.sort((a,b)=>{
            const ae = parseFloat(String(a.cells[2].textContent||'').replace(/[^0-9.+-]/g,''));
            const be = parseFloat(String(b.cells[2].textContent||'').replace(/[^0-9.+-]/g,''));
            return (Number.isFinite(be)?be:-Infinity) - (Number.isFinite(ae)?ae:-Infinity);
          });

          rows.forEach((row, index)=>{
            row.cells[0].textContent = String(index + 1);
            body.appendChild(row);
          });

          /* The core renders podium as [silver, gold, bronze]. Move the same
             existing cards (never recreate/delete data) so they match the
             corrected current-ELO table: [2nd, 1st, 3rd]. */
          const podium = document.getElementById('lbPodium');
          if(podium && rows.length >= 3){
            const topNames = rows.slice(0,3).map(r=>String(r.cells[1].textContent||'').trim());
            const cards = Array.from(podium.children);
            const ranked = cards.map(card=>{
              const text = String(card.textContent||'');
              const idx = topNames.findIndex(name=>name && text.includes(name));
              return {card, idx};
            }).filter(x=>x.idx >= 0);

            if(ranked.length >= 3){
              ranked.sort((a,b)=>a.idx-b.idx);
              const byRank = ranked.reduce((acc,x)=>{ acc[x.idx]=x.card; return acc; },{});
              [byRank[1], byRank[0], byRank[2]].forEach(card=>{
                if(card) podium.appendChild(card);
              });
            }
          }
        }catch(e){
          console.warn('[MP-LB] current-ELO reorder failed:', e);
        }

        return result;
      };
    }

    window.updateUI();
  };
  core.onerror = function(){
    console.error('[Multiplayer] core failed to load.');
  };
  document.head.appendChild(core);
})();
