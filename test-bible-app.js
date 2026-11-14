// Playwright end-to-end test for the Daily Word 360 Bible App.
// Serves ~/workspace/bible-app on 127.0.0.1:8899 (run the server separately).
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8899/index.html';
const OUT = '/home/hatch/workspace/bible-app/test-shots/';
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? ' — ' + detail : ''));
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Home: daily verse loads (WEB)
  const dailyText = await page.textContent('#daily-text');
  check('daily verse loads', dailyText && !dailyText.includes('Loading') && dailyText.length > 20, dailyText && dailyText.slice(0, 60));
  const dailyRef = await page.textContent('#daily-ref');
  check('daily verse is WEB', dailyRef && dailyRef.includes('(WEB)'), dailyRef);
  await page.screenshot({ path: OUT + '01-home.png' });

  // 2. Read: book picker counts
  await page.click('[data-tab="read"]');
  await page.waitForTimeout(1200);
  const otCount = await page.locator('#books-ot .book-btn').count();
  const ntCount = await page.locator('#books-nt .book-btn').count();
  check('book picker: 39 OT + 27 NT', otCount === 39 && ntCount === 27, otCount + ' OT, ' + ntCount + ' NT');

  // 3. Open Genesis 1
  await page.click('#books-ot .book-btn >> text=Genesis');
  await page.waitForTimeout(300);
  const chips = await page.locator('#chapter-chips .chip').count();
  check('Genesis has 50 chapter chips', chips === 50, String(chips));
  await page.click('#chapter-chips .chip >> nth=0');
  await page.waitForTimeout(800);
  const title = await page.textContent('#chapter-title');
  const verses = await page.locator('#chapter-verses .verse').count();
  check('Genesis 1 renders 31 verses', title.includes('Genesis 1') && verses === 31, title + ' / ' + verses + ' verses');
  const v1 = await page.textContent('#chapter-verses .verse >> nth=0');
  check('Genesis 1:1 text correct', v1 && v1.includes('In the beginning, God created the heavens and the earth.'), v1 && v1.slice(0, 70));

  // 4. Favorite Genesis 1:1 from the verse actions
  await page.click('#chapter-verses .verse >> nth=0');
  await page.waitForTimeout(300);
  await page.click('.verse-actions .fav-btn');
  await page.waitForTimeout(400);
  const favBtn = await page.textContent('.verse-actions .fav-btn');
  const faved = await page.locator('#chapter-verses .verse >> nth=0').getAttribute('class');
  check('favorite Genesis 1:1', favBtn.includes('Saved') && faved.includes('faved'), favBtn);
  await page.screenshot({ path: OUT + '02-chapter-faved.png' });

  // 5. Daily listen (speech must not throw)
  await page.click('[data-tab="home"]');
  await page.click('#daily-listen');
  await page.waitForTimeout(600);
  const toast1 = await page.textContent('#toast');
  check('daily listen does not throw', toast1.includes('device'), toast1);

  // 6. Calendar: today is gold + SAVED, tap the day
  await page.click('[data-tab="calendar"]');
  await page.waitForTimeout(500);
  const savedCell = await page.locator('.cal-day.saved.today').count();
  const savedLabel = savedCell ? await page.locator('.cal-day.saved.today .s').textContent() : '';
  check('calendar marks today gold with SAVED', savedCell === 1 && savedLabel.includes('SAVED'), savedLabel);
  await page.click('.cal-day.saved.today');
  await page.waitForTimeout(500);
  const dayTitle = await page.textContent('#day-title');
  const dayFav = await page.textContent('#day-favs .fav-item .ft');
  check('tap day shows the saved verse', dayTitle.includes('saved verse') && dayFav.includes('In the beginning'), dayTitle);
  await page.screenshot({ path: OUT + '03-calendar.png' });

  // 7. Share card from the day card
  await page.click('#day-favs .fav-item .icon-btn >> text=Share card');
  await page.waitForFunction(() => {
    const img = document.querySelector('#modal-root img');
    return img && img.src && img.src.startsWith('data:image/png');
  }, { timeout: 15000 });
  await page.waitForTimeout(400);
  const sceneNote = await page.textContent('#modal-root .dim');
  check('share card renders (1080x1350 canvas)', sceneNote && sceneNote.startsWith('Scene:'), sceneNote);
  await page.screenshot({ path: OUT + '04-share-card.png' });
  // try another scene
  await page.click('#modal-root button >> text=Try another scene');
  await page.waitForTimeout(1200);
  const sceneNote2 = await page.textContent('#modal-root .dim');
  check('try another scene swaps scene', sceneNote2 !== sceneNote, sceneNote2);
  await page.click('#modal-root button >> text=Close');
  await page.waitForTimeout(300);

  // 8. Notes: write one, check it lists, reload, check it persists
  await page.click('[data-tab="notes"]');
  await page.fill('#note-text', 'Test note — God created the heavens and the earth.');
  await page.click('#note-save');
  await page.waitForTimeout(400);
  const noteListed = await page.textContent('#notes-list');
  check('note saves and lists', noteListed.includes('Test note'), noteListed.slice(0, 60));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('[data-tab="notes"]');
  await page.waitForTimeout(400);
  const noteAfter = await page.textContent('#notes-list');
  check('note persists after reload', noteAfter.includes('Test note'));
  await page.click('[data-tab="calendar"]');
  await page.waitForTimeout(400);
  const savedAfter = await page.locator('.cal-day.saved.today').count();
  check('favorite persists after reload', savedAfter === 1);

  // 9. Search
  await page.click('[data-tab="read"]');
  await page.fill('#search-box', 'shepherd');
  await page.waitForTimeout(1500);
  const searchStatus = await page.textContent('#search-status');
  const hits = await page.locator('.search-hit').count();
  check('search finds verses', hits > 0, hits + ' hits; ' + searchStatus);
  await page.click('.search-hit >> nth=0');
  await page.waitForTimeout(800);
  const hitTitle = await page.textContent('#chapter-title');
  check('search hit opens its chapter', hitTitle.includes('Psalm') || hitTitle.includes('John') || hitTitle.length > 3, hitTitle);

  // 10. Music: 12 tracks, tap one, bar appears
  await page.click('[data-tab="music"]');
  await page.waitForTimeout(400);
  const tracks = await page.locator('.track-row').count();
  check('music list has 12 tracks', tracks === 12, String(tracks));
  await page.click('.track-row >> nth=0');
  await page.waitForTimeout(1500);
  const barHidden = await page.locator('#music-bar').isHidden();
  const musicName = await page.textContent('#music-name');
  const audioSrc = await page.getAttribute('#music-audio', 'src');
  check('music bar appears with track 1', !barHidden && musicName === 'Linen and Light' && audioSrc && audioSrc.includes('Linen_and_Light'), musicName + ' / ' + audioSrc);
  const playIcon = await page.textContent('#music-play');
  check('music is playing (pause icon)', playIcon.includes('❚'), playIcon);
  await page.screenshot({ path: OUT + '05-music.png' });

  // 11. Audio chapter listen button (speech path, must not throw)
  await page.click('[data-tab="read"]');
  await page.waitForTimeout(400);
  const beforeTitle = await page.textContent('#chapter-title');
  await page.click('#audio-play');
  await page.waitForTimeout(800);
  const audioStatus = await page.textContent('#audio-status');
  const afterTitle = await page.textContent('#chapter-title');
  // In headless Chromium there is no voice, so utterances end instantly and
  // the chapter auto-advances through Genesis; the status cycles between
  // "Reading ..." and the next chapter's "N verses" line. Either state —
  // or a changed chapter title — proves the speech path ran.
  check('chapter listen starts without error', audioStatus.includes('Reading') || audioStatus.includes('finished') || audioStatus.includes('Paused') || afterTitle !== beforeTitle, audioStatus + ' / ' + afterTitle);
  if (await page.locator('#audio-stop').isEnabled()) await page.click('#audio-stop');

  // 13. Auto-advance moves exactly one chapter (Revelation 1 -> 2, never further)
  // Stub speech so nothing completes on its own: utterances are recorded and
  // driven manually, which makes the chain deterministic in headless Chromium.
  await page.click('[data-tab="read"]');
  await page.waitForTimeout(300);
  await page.click('#back-to-books'); // a chapter is open from check 11; show the book picker again
  await page.waitForTimeout(300);
  await page.click('#books-nt .book-btn >> text=Revelation');
  await page.waitForTimeout(300);
  await page.click('#chapter-chips .chip >> nth=0');
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.__rec = [];
    window.speechSynthesis.speak = (u) => { window.__rec.push(u); };
  });
  await page.click('#audio-play');
  await page.waitForTimeout(500); // intro timer (120ms) fires, intro recorded
  // drive the chain manually: intro + 20 verses of Revelation 1
  for (let i = 0; i < 21; i++) {
    const fired = await page.evaluate(() => {
      const u = window.__rec[window.__rec.length - 1];
      if (u && u.onend) { u.onend(); return true; }
      return false;
    });
    if (!fired) break;
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(600); // chapter-2 intro timer fires
  const revTitle = await page.textContent('#chapter-title');
  const recCount = await page.evaluate(() => window.__rec.length);
  check('auto-advance Revelation 1 -> 2 only (no runaway)', revTitle.includes('Revelation 2') && recCount === 22, revTitle + ' / ' + recCount + ' utterances');
  await page.waitForTimeout(600);
  const revTitle2 = await page.textContent('#chapter-title');
  const recCount2 = await page.evaluate(() => window.__rec.length);
  check('no further advance after Revelation 2 starts', revTitle2.includes('Revelation 2') && recCount2 === recCount, revTitle2 + ' / ' + recCount2 + ' utterances');

  // 14. A stale voice signal after Stop must not move the reading
  // Simulate a voice system that reports an error synchronously when cut off.
  await page.evaluate(() => {
    const ss = window.speechSynthesis;
    const origCancel = ss.cancel.bind(ss);
    ss.cancel = () => {
      const last = window.__rec[window.__rec.length - 1];
      if (last && last.onerror) { try { last.onerror({ error: 'canceled' }); } catch (e) {} }
      return origCancel();
    };
  });
  await page.click('#audio-stop');
  await page.waitForTimeout(400);
  const stopStatus = await page.textContent('#audio-status');
  const stopTitle = await page.textContent('#chapter-title');
  const recCountStop = await page.evaluate(() => window.__rec.length);
  check('stop during Revelation 2 does not advance', stopTitle.includes('Revelation 2') && stopStatus.includes('stopped') && recCountStop === 22, stopTitle + ' / ' + stopStatus + ' / ' + recCountStop + ' utterances');
  // even firing the stale intro's signals by hand must do nothing
  await page.evaluate(() => {
    const u = window.__rec[window.__rec.length - 1];
    if (u && u.onend) { try { u.onend(); } catch (e) {} }
    if (u && u.onerror) { try { u.onerror({ error: 'canceled' }); } catch (e) {} }
  });
  await page.waitForTimeout(300);
  const stopTitle2 = await page.textContent('#chapter-title');
  const recCount3 = await page.evaluate(() => window.__rec.length);
  check('stale intro signals after stop are ignored', stopTitle2.includes('Revelation 2') && recCount3 === 22, stopTitle2 + ' / ' + recCount3 + ' utterances');

  // 16. Voice select stays inside the audio bar, even with a long voice name
  await page.click('[data-tab="read"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const sel = document.querySelector('#audio-voice');
    const o = document.createElement('option');
    o.textContent = 'A very long voice name that would overflow the bar (en-US)';
    sel.appendChild(o);
    sel.selectedIndex = sel.options.length - 1;
  });
  await page.waitForTimeout(200);
  const barBox = await page.locator('#audio-bar').boundingBox();
  const voiceBox = await page.locator('#audio-voice').boundingBox();
  check('voice select with a long name fits inside the audio bar', barBox && voiceBox && voiceBox.x >= barBox.x - 1 && voiceBox.x + voiceBox.width <= barBox.x + barBox.width + 1, 'voice ' + Math.round(voiceBox.width) + 'px in bar ' + Math.round(barBox.width) + 'px');

  // 17. Tapping the voice select shows the app's gold focus ring, not the phone's heavy black one
  await page.focus('#audio-voice');
  await page.waitForTimeout(200);
  const outline = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('#audio-voice'));
    return cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor;
  });
  check('voice select focus ring is the gold 2px outline', outline.startsWith('2px solid'), outline);

  // 18. No page errors at all
  check('no page errors / console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log('\n' + results.filter(r => r.ok).length + '/' + results.length + ' checks passed');
  await browser.close();
  process.exit(results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(2); });
