# Mon Jardin Français V2

Complete static PWA rebuilt around French Content Core V2.

## Run
Serve this folder over HTTP(S). For a quick local preview:
`python3 -m http.server 8080`

Then open `http://localhost:8080`.

## Content integrity
- `question-bank.json`: 1,502 source questions; ordinary practice only loads `enabledByDefault: true`.
- `vocab-bank.json`: 617 learned vocabulary rows.
- `writing-bank.json`: 19 checklist-marked writing tasks.
- `reference-marker.js`: copied unchanged from Content Core V2.
- Medium/manual-review questions are never automatically marked wrong.
- Wrong answers are scheduled for review after 48 hours and do not immediately repeat in-session.
- Progress is saved under `monJardinFrancais.progress.v2` and service worker updates do not clear it.

All supplied image assets are stored in `assets/`.


## QA pass 1
- JavaScript syntax checked for app, marker and service worker.
- All JSON data files parsed successfully; duplicate content IDs checked.
- 12/12 Content Core marking regression tests pass.
- Local asset references verified.
- Fixed vocabulary topic filtering for sections with no vocabulary rows.
- Fixed mobile navigation state and desktop resize recovery.
- Fixed local-day streak calculation around midnight/time zones.
- Added writing autosave when typing or switching tasks.
- Hardened offline service-worker fallback and precached page-header assets.
