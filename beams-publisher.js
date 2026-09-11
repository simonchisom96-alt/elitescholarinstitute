/* Elite Scholar Institute — Pusher Beams publisher helper
 * Client-side helper only. The Beams Secret Key stays on Render.
 */
async function publishBeamsAnnouncement(data, firebaseAuth, adminEmail) {
  try {
    if (!firebaseAuth || !firebaseAuth.currentUser) return;
    if (firebaseAuth.currentUser.email !== adminEmail) return;

    const idToken = await firebaseAuth.currentUser.getIdToken(true);

    const body = String(
      (data && data.poll && data.poll.question) ||
      (data && data.quiz && data.quiz.question) ||
      (data && data.text) ||
      (data && data.caption) ||
      'New ESI announcement'
    ).replace(/\s+/g, ' ').trim().slice(0, 500);

    const response = await fetch('https://esi-beams-api.onrender.com/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        title: 'Elite Scholar Institute',
        body,
        priority: data && data.priority ? data.priority : 'normal'
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `Beams API ${response.status}`);
    }

    console.log('[beams] announcement published', result.publishId || '');
  } catch (error) {
    console.error('[beams] publish failed', error);
    // Firebase remains the source of truth if push publishing fails.
  }
}
