# DISPATCHER — Video Production Prompts

Prompts for AI video generation (Kling / Runway / Veo / Pika). Every `background`
key in `dispatcher-editor.json` maps to one entry here. Style anchors for ALL
clips: **9:16 portrait, night palette (deep navy #0A0E1A, cyan #22D3EE accents,
amber #F59E0B warmth), cinematic grain, no readable text, no identifiable faces
unless specified.**

| Role | Duration | Loop | Max size |
|---|---|---|---|
| Background loop (`bg_*`) | 5–8 s | seamless | ~3 MB, 720p H.264 |
| Memory cinematic (`bg_memory_*`) | 10–15 s | no | ~5 MB, 720p H.264 |
| Weekly intro (optional) | 5–8 s | no | ~3 MB |

---

## 1. Ambient background loops

### bg_dispatch — the dispatch floor (the game's home)
> Interior of a 911 dispatch center at night, rows of glowing monitors in deep
> blue darkness, a lone operator silhouette in a headset seen from behind,
> cyan screen-light rim on shoulders, dust motes in a projector beam, slow
> 5-second push-in, cinematic, moody, seamless loop.

### bg_apartment — Charlie's apartment
> A small dim apartment at night, city lights through rain-streaked window,
> a couch with a worn dent, takeout box and a notebook on the table, one warm
> amber lamp against blue darkness, curtains breathing slightly, static camera,
> melancholic and intimate, seamless loop.

### bg_cafe — the after-hours café
> A tiny corner café at 3 a.m., warm tungsten light, steam rising from two
> coffee cups on a counter, neon glow bleeding through the window from the
> street, empty stools, gentle flicker of a fluorescent sign, cozy loneliness,
> static camera, seamless loop.

### bg_street_night — walking home
> Empty city street after midnight, wet asphalt reflecting traffic lights,
> steam from a vent, a distant figure walking away under sodium lamps, slow
> lateral dolly, cinematic noir, quiet and contemplative, seamless loop.

### bg_glassroom — the Internal Affairs interview room
> A cold glass-walled interview room, fluorescent light, a metal table with a
> closed manila folder and an untouched glass of water, venetian-blind shadows
> crawling slowly across the wall, institutional teal-grey palette, faint hum,
> static camera, tense, seamless loop.

### bg_stadium_lot — container rows behind Gate C
> A stadium parking lot at night, rows of shipping containers under harsh
> sodium floodlights, one flickering lamp, chain-link fence in foreground,
> fog low to the ground, distant stadium silhouette, slow creep forward,
> ominous industrial thriller mood, seamless loop.

### bg_hale_office — the Director's office
> A wood-paneled director's office at night, green banker's lamp, framed
> commendations on the wall (unreadable), city lights behind venetian blinds,
> a heavy desk with a single envelope, cigar-smoke haze in the lamplight,
> slow push-in, power and rot, seamless loop.

### bg_hearing — City Hall hearing room
> A municipal hearing chamber, long wooden dais, microphones with small red
> lights, empty public seating in shadow, one projector beam cutting the dark,
> marble and dust, wide static shot, weighty institutional atmosphere,
> seamless loop.

---

## 2. Memory cinematics (Charlie's origin — the Batman beats)

These four clips ARE the emotional spine. Grade them differently from the
present-day scenes: **desaturated except for red emergency light, soft 16mm
film grain, shallow focus, child's-eye-level camera.** No dialogue; the game
text carries the words.

### bg_memory_phone — Prologue + Week 1 hint (10 s)
> 16mm film look, desaturated: a child's small hand dialing a corded phone in
> a dark kitchen, rain hammering the window, the coiled cable trembling,
> extreme close-up, red light sweeping across the wall once, cut to the
> rotary dial spinning back, melancholic dread, no faces.

### bg_memory_window — Weeks 1/5 (12 s)
> 16mm film look: a nine-year-old boy's silhouette at a rain-streaked bedroom
> window at night, red and blue emergency lights approach, wash over his face
> — and slide past, shrinking down the street toward the wrong house, his
> breath fogging the glass, camera slowly pulling back into the dark room,
> heartbreak, no identifiable face.

### bg_memory_report — Weeks 7/11 (10 s)
> 16mm film look: teenage hands holding a photocopied incident report under a
> desk lamp, a thumb rubbing over two circled numbers (unreadable), a
> highlighter line trembling, dust in the lamplight, extreme close-up, quiet
> obsession, documents deliberately blurred beyond two circled marks.

### bg_memory_full — Week 11 reveal (15 s)
> 16mm film look, one continuous slow shot: a dark hallway in a small house,
> a child's hand holding an adult woman's hand on the floor just out of
> frame, phone receiver dangling and swinging on its cord, red light pulsing
> through the window growing brighter then dimming as sirens pass, the
> child's grip tightening, fade to black on the dangling receiver,
> devastating restraint, no faces, nothing graphic.

---

## 3. Weekly intro cinematics (optional, 5–8 s each)

One establishing beat per week, played before the plot call. Same night
palette as the loops.

1. **W1 The Call That Drops** — A quiet suburban street sign reading nothing legible, one porch light dying, a front door left open into darkness, wind in the trees.
2. **W2 The Voice** — An audio waveform monitor in the dark distorting into jagged spikes as a red REC dot blinks, screen glow on an empty chair.
3. **W3 Vans at Night** — Three white vans gliding through an empty intersection at 3 a.m., headlights off, seen from a high window through blinds.
4. **W4 The Envelope** — A thick envelope sliding under a keyboard in slow motion, fluorescent light flicker, no hands visible above the wrist.
5. **W5 Her Voice Again** — A phone screen glowing inside a moving van's dark cargo area, road lights strobing through a vent, a hand cupping the light.
6. **W6 The Audit** — A badge and a folder placed on a glass table in perfect symmetry, venetian shadows, a chair pulled back by an unseen hand.
7. **W7 The Wrong Address** — Two house numbers on opposite doors — 84 and 48 — rain between them, a fire truck's light growing in the wet street.
8. **W8 The Partner** — Two coffee cups on a dispatch desk, one printout face-down between them, a phone lighting up with UNKNOWN CALLER.
9. **W9 Two Alarms** — A wall of monitors splitting: left half chaos of headlights and rain, right half one silent grey warehouse camera feed, a cursor blinking between them.
10. **W10 The Raid** — Bolt cutters closing on a chain in extreme close-up, floodlights igniting one by one down a container row, breath fog.
11. **W11 The Name on the Log** — A cardboard archive box opening in a dark records room, dust rising through a flashlight beam onto an old cassette tape.
12. **W12 The Last Shift** — An empty hearing room filling with light as doors open, one microphone's red light clicking on, motes in the beam.

---

## 4. Character portrait stills (for avatars, 1:1)

Generate as stills (Layer.ai / GPT-Image), then optionally animate 3–4 s idle
loops. Telenovela-real style, consistent lighting: cyan key + amber rim.

- **Charlie (player, seen in memories only)** — never show his adult face; the player IS Charlie.
- **Mara** — early 20s, tired but unbroken, hoodie, phone-light on her face from below, defiant eyes.
- **The Voice** — never a face: a waveform, a shadow behind frosted glass, a chair turned away.
- **Director Hale** — 60s, silver hair, immaculate uniform cardigan, grandfather warmth with cold eyes, banker's-lamp lighting.
- **Detective (IA)** — 40s, rumpled precision, cardboard coffee cup, eyes that file everything.
- **Partner** — 30s, dispatch polo, sleeve tattoo, the only person who laughs on the night shift.
- **Date** — warm counterlight in a café window, mid-laugh, holding two cups.
- **Friend** — burger-joint neon, leaning back, five years of stories in one grin.

---

## 5. Production notes

- Compress to 720p H.264, target ≤3 MB loops / ≤5 MB cinematics (matches the
  bundled-intro pipeline in `src/game/assets.ts`).
- Loops must cut on a still frame or matched motion — test the seam.
- The four memory clips are the season's premium assets: spend the generation
  budget there first, in this order: `bg_memory_window` → `bg_memory_full` →
  `bg_memory_phone` → `bg_memory_report`.
- Every clip works muted (the game plays them muted); never rely on audio.
