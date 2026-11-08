# ESI Google account data — Realtime Database rules addition

The Google identity and private single-player backup use the `project-76067` Realtime Database.

Merge this child into the existing root `rules` object in Firebase Console → Realtime Database → Rules:

```json
"esi_account_data": {
  "$uid": {
    ".read": "auth != null && auth.uid === $uid",
    ".write": "auth != null && auth.uid === $uid"
  }
}
```

Do **not** replace the existing rules with this fragment. Keep all current multiplayer, leaderboard, tournament, and notification rules intact. Add the fragment as a sibling of those existing root paths, validate the complete JSON, then publish.

This rule allows each signed-in Google account to read/write only its own single-player backup at:

`esi_account_data/{googleAuthUid}/singlePlayer`

The client code deliberately does not fall back to a public path if this rule is missing. Until the rule is merged and published, Google sign-in can succeed but the single-player cloud backup will report a database-permission warning. Existing local data is not deleted.
