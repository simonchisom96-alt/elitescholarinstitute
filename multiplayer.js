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
       IMPORTANT LEADERBOARD RULE:
       multiplayer-core.js owns the single master ranking order.
       Its openLB() calculates rankScore, sorts the players once, then uses
       that same ordered array for:
         1) the 1–100 leaderboard table,
         2) the visible Top 3 podium (2nd | 1st | 3rd visually),
         3) the previous-month Top 3 dashboard.
       This loader must never reorder, renumber, or rebuild any leaderboard
       display after openLB() finishes. Doing so would create a second ranking
       source and could make the podium disagree with the table.
    */

    window.updateUI();
  };
  core.onerror = function(){
    console.error('[Multiplayer] core failed to load.');
  };
  document.head.appendChild(core);
})();