/* PipMessenger: rule-based chat in Pip's voice (Tier 3: "character chats back"). */
(() => {
  'use strict';
  const P = window.PipSite;
  P.safe('chat', () => {
    const { $, $$ } = P;
    const log = $('#chatLog'), form = $('#chatForm'), input = $('#chatInput');

    const go = (id) => () => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: P.reduced() ? 'auto' : 'smooth', block: 'start' }); };
    const RULES = [
      { re: /\b(my name is|call me|i'?m called|name'?s)\s+([a-z][\w'-]{0,15})/i, fn: (m) => { const n = m[2].charAt(0).toUpperCase() + m[2].slice(1); P.visitor.setName(n); return [n + '! what a cozy name. I\'ll remember it, even after a nap. 💛']; } },
      { re: /\b(hi|hello|hey|hiya|heyy+|yo|namaste|hola|sup)\b/i, say: ['hiii! *yawn* oh, sorry. HI!! 👋', 'hello hello! you found my homepage! 🌙', 'hi friend! wanna hear a lullaby? say “sing”!'] },
      { re: /\b(who are you|what are you|your name|about you)\b/i, say: ['I\'m Pip! a baby with a skull face. smooth and round, like a little moon. 💀🌙 totally not spooky, promise.'] },
      { re: /\b(job|work|do you do|engineer|profession|career)\b/i, say: ['I\'m a Junior Dream Engineer at the Midnight Nursery! I build dreams, lullabies, nightlights and bedtime stories. 🛠️'] },
      { re: /\b(skull|scary|spooky|bones?|creepy|dead)\b/i, say: ['my face is a skull but my heart is a marshmallow. bones are just… sturdy cuddles. 🦴💛', 'not scary! I\'m 0% spooky, 100% snuggly. ask the ghosts!'] },
      { re: /\b(old|age|born|birthday)\b/i, say: ['0 years, 11 months and about 4,000 naps. 🍼'] },
      { re: /\b(sing|lullaby|song|music|hum)\b/i, say: ['okay okay… la la laaa… 🎵 (winding up my music box!)'], act: () => { if (P.playLullaby) P.playLullaby(); if (P.audio.isMuted()) P.toast('🔇 Turn sound on to hear Pip sing!'); } },
      { re: /\b(dream|dreams|dreaming)\b/i, say: ['tonight\'s special: a dream where your socks are made of clouds. ☁️🧦', 'I have a dream about a library where all the books read YOU to sleep. 📚', 'fresh dream, just baked: you\'re a whale who teaches the moon to swim. 🐋🌙'] },
      { re: /\b(scared|afraid|nightmare|sad|lonely|can'?t sleep|cannot sleep|anxious|worried)\b/i, say: ['come here. I\'ll switch on the Bone-Bulb for you. you\'re safe. breathe in… and ouuut. 💛', 'it\'s okay to feel like that. I\'ll hum quietly until it feels softer. 🎵'] },
      { re: /\b(joke|funny|laugh)\b/i, say: ['why didn\'t the skeleton go to the party? he had no BODY to go with! …I have a body though. a small one. 🤭', 'what do you call a sleeping dinosaur? a dino-SNORE! 🦖💤', 'why do I never lie? because you can see right through my eye holes! hehe'] },
      { re: /\b(game|play|catch)\b/i, say: ['wanna catch falling dreams with me? taking you there! 🎮'], act: go('game') },
      { re: /\b(secret|easter|egg|hidden|hint|clue)\b/i, fn: () => { const h = P.eggs.nextHint(); return [h ? 'psst… here\'s a hint: ' + h + ' 🤫' : 'you found ALL my secrets!! you\'re a real Dream Detective. 🏆']; } },
      { re: /\b(bye|goodnight|good night|gn|see you|later)\b/i, say: ['nighty night! 🌙 don\'t let the bedbugs start a band.', 'bye bye! come back soon, I\'ll save you a dream. 💤'] },
      { re: /\b(night|dark|bedtime|sleepy)\b/i, say: ['ooh bedtime! dimming the lights… 🌙'], act: () => P.setMood('night', { save: true }) },
      { re: /\b(day|morning|wake|awake|sun)\b/i, say: ['good morning! opening the curtains! ☀️'], act: () => P.setMood('day', { save: true }) },
      { re: /\b(chaos|wild|crazy)\b/i, say: ['CHAOS MODE?! hold my bottle. 🌀'], act: () => P.setChaos(true) },
      { re: /\b(lamp|light|nightlight)\b/i, say: ['my Nightlight Collection is my pride and joy. go switch them on! 🏮'], act: go('lights') },
      { re: /\b(story|book|read)\b/i, say: ['I wrote a book! “The Moon Who Couldn\'t Sleep”. opening it for you 📖'], act: go('book') },
      { re: /\b(guestbook|sign|wish)\b/i, say: ['yes please!! sign my guestbook and leave a dream wish ✍️'], act: go('guestbook') },
      { re: /\b(love|cute|adorable|sweet|best)\b/i, say: ['eeee 🥹 *giggles uncontrollably*', 'you\'re making my cheeks go pink! (they were already pink. but MORE.)'], act: () => { P.pipExpr && P.pipExpr('giggle', 2000); P.sfx.giggle(); } },
      { re: /\b(who (made|built|coded)|creator|developer|hackathon|haX)\b/i, say: ['a builder at the haX.baby “Baby\'s First Website” hackathon made my homepage in 48 hours! I helped. mostly by napping. 💤'] },
      { re: /\b(favou?rite|like best)\b/i, say: ['favourite colour: nightlight orange. favourite food: warm milk with a sprinkle of stardust. favourite sound: YOU typing. 💛'] },
      { re: /\b(food|eat|hungry|milk|snack)\b/i, say: ['warm milk with stardust sprinkles. sometimes a crayon. don\'t tell the Night Nanny. 🖍️'] },
      { re: /\b(thanks?|thank you|ty)\b/i, say: ['you\'re welcome! *happy rattle noises* 🪇'], act: () => P.sfx.rattle() },
      { re: /\?$/, say: ['hmm, good question! I\'m only 11 months old though. ask me about dreams, my job, or say “sing”! 🤔'] }
    ];
    const FALLBACK = ['*yawn* sorry, I was half asleep. try asking about my dreams, my job, or say “sing”! 💤', 'hehe I don\'t know that word yet. I\'m still a baby! try “tell me a joke”. 🍼', 'ooh! that sounds important. I\'ll dream about it tonight. 🌙'];

    function bubble(text, who) {
      const d = document.createElement('div');
      d.className = 'msg ' + who;
      const w = document.createElement('span'); w.className = 'who'; w.textContent = who === 'pip' ? 'Pip 💀' : (P.visitor.data.name || 'You');
      const t = document.createElement('span'); t.textContent = text;
      d.append(w, t); log.appendChild(d); log.scrollTop = log.scrollHeight;
      return d;
    }
    let busy = false;
    function reply(text) {
      let out = null, act = null;
      for (const r of RULES) {
        const m = text.match(r.re);
        if (m) { out = r.fn ? r.fn(m) : r.say; act = r.act || null; break; }
      }
      const line = P.pick(out || FALLBACK);
      busy = true;
      const typing = document.createElement('div');
      typing.className = 'msg pip typing'; typing.textContent = 'Pip is typing with tiny fingers…';
      log.appendChild(typing); log.scrollTop = log.scrollHeight;
      setTimeout(() => {
        typing.remove(); bubble(line, 'pip'); P.sfx.pop(); busy = false;
        if (act) setTimeout(act, 500);
      }, Math.min(1500, 450 + line.length * 12));
    }
    function send(text) {
      text = String(text).trim().slice(0, 160);
      if (!text || busy) return;
      bubble(text, 'you'); P.sfx.click();
      reply(text);
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); input.value = ''; });
    $$('#chatQuick .qr').forEach((b) => b.addEventListener('click', () => send(b.textContent)));

    const nm = P.visitor.data.name;
    bubble(nm ? 'hi again, ' + nm + '! 💛 what should we talk about?' : 'hi! I\'m Pip. ask me anything! (or tap a bubble below) 🍼', 'pip');
  });
})();
