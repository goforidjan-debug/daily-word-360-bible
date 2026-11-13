# Daily Word 360 Bible App (v1)

A phone-first web app for reading the whole Bible — built in the same visual
language as the Daily Word 360 prayer journal app (cream, deep green, gold;
Georgia serif; official Daily Word 360 logo).

## Features

1. **Read the Bible** — the full Bible in the **World English Bible (WEB)**,
   66 books, 31,098 verses. Book + chapter navigation, verse numbers, and a
   search box across every verse. Books are lazy-loaded per book so the first
   load stays light.
2. **Audible Bible** — reads the current chapter (or a single verse) aloud
   with the device's built-in speech synthesis (Web Speech API — free, no
   server). Play / pause / resume / stop, speed control (0.75×–1.5×), and the
   verse being read is highlighted. The app says plainly it uses the device's
   own voice, not a recording.
3. **Notes** — write notes attached to a verse, or free notes. Saved on the
   device in localStorage under `dw360-bible-v1` (a new key — never the
   journal app's key). No sync between devices; a JSON backup/export
   downloads everything (notes + favorites + last-read position).
4. **Shareable verses** — verse cards rendered on canvas, **1080×1350**,
   Daily Word 360 devotional style: white serif verse with a deep dark
   shadow, gold reference, thin gold rule, small "DAILY WORD 360" branding,
   over a beautiful nature scene with a soft dark gradient behind the text.
   Preview modal with Share (Web Share API) and Download image, plus
   "Try another scene".
5. **Music player** — the same 12 gentle instrumentals as the prayer journal
   app. Fixed player bar above the tab bar, play/pause/next/previous,
   persisted volume, auto-advance to the next track when one ends. The 4
   louder tracks are never used.
6. **Home** — a daily verse (deterministic by date, from a 30-verse rotation)
   plus quick links into Read / Calendar / Notes / Music.
7. **Calendar with saved favorite verses** — tap the heart on any verse (in
   Read or on the daily verse) to save it. The Calendar page shows a month
   grid; days with saved verses turn gold with a small "SAVED" label and a
   count. Tapping a day opens that day's verse(s) with the reference, and
   each can be opened in Read, listened to, shared as a card, or
   un-favorited. An "All favorites" list sits below the calendar. Favorites
   live in the same `dw360-bible-v1` key and are included in the backup.

## Translation note

The Bible text is the **World English Bible (WEB)**, which is public domain.
The NIV is copyrighted and cannot be used for a full Bible — the app uses
the WEB throughout, and says so on the home page. Source: the public
`thiagobodruk/bible` JSON (`json/en_web.json`), cleaned of spacing and
footnote artifacts by `build_data.py`. Outputs: `books.json` (index) and
`books/<slug>.json` × 66.

## Scene library (share cards)

21 scenes in `scenes/`, listed in the `SCENES` array in `index.html`
(file + one-line description + keywords). Every scene is visibly different
and cinematic — night sky, foggy sunrise, mountain sunset, forest stream,
golden field, aurora, misty lake, ocean dusk, snowy forest, desert dunes,
waterfall, rain lake, autumn forest, foggy valley, alpine lake, twilight
town, poppies. Sources: 5 Christian Live Wallpaper pack stills + 4
candidates, 3 still frames from real Pexels devotional background-pool
videos, and 10 AI-generated cinematic stills in the Ep 5 podcast style.
To add a scene: drop the file into `scenes/` and add one line to `SCENES`.
The card picker matches a scene to the verse by keyword (peace → forest
stream, light → sunrise, and so on), or rotates deterministically by verse.
**Weekly scenes:** a few new scenes arrive every Monday for both the Bible
app and the journal app (cron `weekly-share-verse-scenes`, first run Mon
Nov 16, 2026). New scenes get `isNew: true` in the `SCENES` array so the
share modal shows them as "✦ NEW" until the next batch arrives.

## Files

- `index.html` — the whole app (single file: CSS + JS inline)
- `manifest.json`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`,
  `apple-touch-icon.png`, `logo.jpg` — add-to-home-screen support
- `books.json`, `books/*.json` — WEB text (66 books)
- `daily-verses.json` — 30 curated single verses for the daily rotation
- `music/*.mp3` — the 12 journal-app instrumentals
- `scenes/*.jpg` — 21 share-card backgrounds
- `build_data.py` — rebuilds `books.json` / `books/` / `daily-verses.json`
  from the upstream WEB JSON

## Deploy (GitHub Pages, goforidjan-debug)

Same method as the journal app:

1. Create a new **public** repo under the **goforidjan-debug** account
   (e.g. `daily-word-360-bible`). The connected GitHub account is
   `goforidjan`, so this step needs the browser — create the repo in the
   goforidjan-debug account on github.com.
2. On a temp branch, add all files in this folder, open a PR, squash-merge
   with the exact commit message (strip the auto `(#N)` suffix, clear the
   extended description), delete the temp branch.
3. Enable GitHub Pages from main / root.
4. Verify live with curl: the page loads, a book JSON loads
   (`books/genesis.json`), and all 12 track titles are present in
   `index.html`. Then a Playwright check: open a chapter, write a note and
   confirm it persists after reload, favorite a verse and check the
   calendar marks the day gold, render a share card, confirm the music bar
   is present.

**Upload these (61 MB total):** `index.html`, `manifest.json`, `logo.jpg`,
`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`,
`apple-touch-icon.png`, `books.json`, `daily-verses.json`, `books/` (66
JSON files), `music/` (12 MP3s), `scenes/` (21 JPGs), `README.md`,
`build_data.py`. **Do NOT upload:** `test-bible-app.js`, `test-shots/`,
`scenes-contact-sheet.jpg` (local test/review artifacts only).

## Status

**Not priced, not listed, not posted anywhere.** Godwin reviews first.
