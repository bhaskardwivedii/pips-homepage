# 💀🌙 Pip's Homepage

**Track 1 · haX.baby "Baby's First Website" 2026**

> "I build the dreams you fall asleep inside."

Pip is a sleepy, cute skull-faced baby and Junior Dream Engineer at the Midnight Nursery. This is Pip's portfolio as a cozy early-web homepage: marquee, hit counter, guestbook, webring, 88×31 badges. Every part of it is playable.

**Live site:** https://pip-test-swart.vercel.app/
**Repo:** https://github.com/bhaskardwivedii/pips-homepage
**Stack:** plain HTML, CSS and JavaScript. No framework, no build step, no runtime libraries — open `index.html` and read it.

---

## 👋 For judges: the 60-second tour

1. **Move your cursor near Pip** in the hero — his eyes and head follow you. Tap him 5 times fast for a reaction.
2. **Scroll down** — his origin story plays as a sticky, scene-by-scene illustration.
3. **Play with all six portfolio projects** in *My portfolio*: wind the music box, light up the dark room, scroll the dream map, flip the storybook, play the mini-game, check the growth chart.
4. **Talk to Pip** in the chat near the bottom — try "sing me a song", "any secrets?", or "tell me a joke".
5. **Sign the guestbook**, then check the 🥚 counter in the top bar — 5 Easter eggs are hidden across the page (list below).
6. **Click 🌙 and 🌀** in the top bar for day/night and "Chaos Mode" (drag the windows!). Resize the browser and watch the size name change.

Everything above works with mute on or off, keyboard-only, and on a phone.

---

## ✅ Brief coverage, at a glance

### Required (Section 5)
| Requirement | Where |
|---|---|
| What Pip is | Hero, the **Nursery ID card**, and personality stickers in *What I am* |
| What Pip does (3+ projects) | **Six** playable projects in *My portfolio* |
| Pip's story through scroll | *My story*: a sticky, scroll-driven 5-scene illustrated story |
| Immersion | Eyes/head follow the cursor or finger; clicks, sounds and the narrator react everywhere |
| Mobile-friendly | Tested at 320, 390, 820, 1366, 1440 px, no horizontal scroll |
| Hidden Easter egg | **Five**, tracked live in the 🥚 counter |

### Tier 1 — all done
Cursor/touch reaction · scroll-driven story · day/night toggle · full responsiveness (see Chaos Mode) · 5 Easter eggs + a certificate for finding them all.

### Tier 2 — all 5 slots built (+1 bonus)
| Toy | What it does |
|---|---|
| 🎵 Lullaby Lab | Web Audio music box, 8 notes (keys 1–8), Pip's original lullaby, generative "new tune", synthesized reverb |
| 🏮 Nightlight Collection | Canvas dark room — your cursor/finger is the light; lamps stay lit; Boo is hiding |
| 🚀 Dream Delivery map | SVG path synced to scroll; houses light up (with a chime) as Pip flies past |
| 📖 Storybook | 3D page-turn flip — buttons, ← → keys, or swipe |
| 🎮 Mini-game | *Catch the Falling Dreams* — drag, touch or arrow keys, combo sounds, lives, saved best score |
| 📏 Growth chart *(bonus)* | Crayon bar chart of Pip's skills |

### Tier 3
Visitor memory (visit count, remembers your name) · a real rule-based chatbot (*PipMessenger*, 25+ intents, some replies take actions) · a live Supabase-backed guestbook with an honest local fallback · documented Lighthouse scores.

### Side quests (+13 claimed)
Live Guestbook (+2) · Sparkle Cursor Trail (+2) · Hit Counter Odometer (+1) · Click Sounds + always-visible Mute (+3) · Responsive Chaos Mode (+5, named breakpoints + a full draggable alternate theme).

---

## 🥚 The five Easter eggs
1. ⭐ **Star-struck** — click the big star on Pip's nightcap.
2. 🤭 **Tickle monster** — tap Pip 5 times fast, or type `pip` anywhere.
3. 👻 **Hide and Boo** — find Boo hiding in the dark Nightlight room.
4. 😴 **Shh, naptime** — sit still ~22 seconds; Pip falls asleep. Move to wake him.
5. 🗝️ **Secret Dream Room** — Konami code (↑↑↓↓←→←→BA), or **hold** the moon in the footer on a phone.

Find all 5 → nightcap turns gold → *Dream Detective* certificate pops up.

---

## 📊 Quality
- **Lighthouse** (served with compression, like Vercel): mobile 99/100/100/100, desktop 100/100/100/100 — performance, accessibility, best practices, SEO.
- **Zero console errors**, verified with automated browser runs clicking every control at 5 screen sizes.
- **Accessibility:** real buttons/labels/live regions, a skip link, visible focus, full keyboard support, `prefers-reduced-motion` respected.
- **Resilience:** each feature starts in isolation — one failure can't break the page. Storage calls never throw (private browsing is fine).

## ▶️ Run it locally
```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## 🚀 Deploy (about 2 minutes)
- **Vercel:** "Add New → Project" → import the repo → Framework **Other** → Deploy.
- **GitHub Pages:** repo Settings → Pages → Deploy from branch → `main` / root.

## 🗄️ Make the guestbook and counter live (~10 min, optional, +2)
1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste `supabase.sql` → **Run**.
3. **Project Settings → API** → copy the **Project URL** and **anon public** key into `js/config.js`.
4. Commit, push, redeploy — the guestbook now shows **🟢 Live guestbook**.

Row-level security only lets visitors read, add one wish, and bump the counter by exactly one. Without this setup the site still works fully, saving locally and saying so honestly in the UI.

## 📁 Project structure
```
index.html        markup, inline SVG art for Pip and all scenes
css/style.css     palettes, layout, retro chrome, responsive + Chaos Mode
img/              4 official reference renders (see Credits)
js/core.js        storage, events, Web Audio engine, sparkles/confetti, eggs, mood, mute, chaos, visitor memory
js/pip.js         Pip: eye tracking, expressions, naps, tickles, narrator, secret room
js/toys.js        Lullaby Lab, Nightlights, Dream Routes, Storybook, Growth Chart, scroll story
js/game.js        Catch the Falling Dreams
js/chat.js        PipMessenger
js/guestbook.js   guestbook + hit counter (Supabase or local)
js/config.js      optional Supabase keys
fonts/            self-hosted Fraunces, Fredoka, VT323 (OFL)
```

## 🙏 Credits
- **Pip** is the canon Track 1 character from the [haX.baby brief](https://hax.baby/baby-problem). The 4 official studio renders in `img/` (and shown in *What I am*) are provided by the **haX.baby organizers**, used here for reference/credit — everything playable on the page is otherwise hand-coded SVG and CSS.
- **Sound:** every sound is synthesized live with the Web Audio API. No audio files. The lullaby, secret lullaby, storybook and all writing are original.
- **Fonts:** [Fraunces](https://github.com/undercasetype/Fraunces), [Fredoka](https://github.com/hafontia-zz/Fredoka), [VT323](https://fonts.google.com/specimen/VT323) — SIL Open Font License, via [Fontsource](https://fontsource.org).
- **Backend:** [Supabase](https://supabase.com) (optional).
- Built with help from an AI coding assistant (permitted by the event rules).

Keyboard: `M` sound · `N` night · `C` chaos · `1`–`8` music box · `←` `→` storybook and game.
