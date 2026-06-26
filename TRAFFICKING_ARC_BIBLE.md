# DISPATCHER — "The Quiet Frequency"
### A 12-week main-story arc: psychological tension + a human-trafficking ring with an inside man

This is the authored backbone (`game_plot`) that runs alongside the daily call pool.
Two beats per week: a **plot_call** (the story call) and a **weekend** (a life beat).
The arc is written for restraint — trafficking is implied through dread, paperwork, and
silence, never depicted graphically. The horror is what the city *doesn't* let you see.

---

## Logline
You're a rookie 911 dispatcher. The veteran on the next console, **Mara Vance**, takes you
under her wing — warm, funny, the person who teaches you which calls to chase and which to
"let go." Over twelve weeks you slowly realize the calls she tells you to drop are the same
ones: scared young women, the same block, the same dead air. Mara isn't lazy. Mara is the
ring's ear inside the room. The arc is the quiet war between the trust she's built in you
and the trust the city has placed in you.

---

## The insider — Mara Vance
- **Role:** Senior dispatcher, your assigned mentor. Reuses the warmth players associate with
  a friend, which is exactly why the betrayal lands.
- **Method:** She doesn't commit crimes on the floor. She *mislabels* them — reclassifies a
  trafficking call as a prank, reroutes the nearest unit "to balance the board," loses a
  location in a transfer. Plausible-deniable sabotage.
- **Why she's compelling:** She believes she's protecting you. Her recurring line —
  *"This city eats rookies. I'm keeping you whole."* — is half threat, half love. She is the
  game's antagonist and its most caring voice at the same time.
- **Her boss:** never seen, only felt — **the Don**. Money, leverage, and the sense that the
  room itself is owned.

## Recurring anchors
- **Grandma** — existing warm recurring caller. Her granddaughter **Lily** becomes the arc's
  personal stake at the midpoint, turning an abstract horror into someone you know.
- **The Voice** — used for the rotating victims/callers so each plot call still feels like a
  real shift, not a cutscene.

---

## Variable map (how the existing stats carry the arc)
| Variable | In-arc meaning | Goes up when… |
|---|---|---|
| `trust` | City's faith in you (weekly goal, +3/wk) | you dispatch right, stay on the line |
| `integrity` | Your spine | you push the call Mara told you to drop |
| `don` | How owned you are by the ring | you take money, look away, play along |
| `pawn` | How much leverage *they* have on you | you get compromised, accept favors, stay silent |
| `loose_thread` | Informal clues about the ring | you notice the pattern, keep notes |
| `case_file` | Hard, documented evidence | you log it properly, build a real case |
| `grandma_bond` | Your bond with Grandma/Lily | you take her seriously, follow up |
| `money` | Cash | bribes, "gifts," the easy path |
| `mara_trust` *(new)* | How close Mara thinks you are | you defer to her, accept the mentorship |
| `lily_safe` *(new)* | Lily's fate flag | you act in the rescue beats |
| `girls_saved` *(new)* | Running tally of rescues | each successful intervention |

The moral engine is the tension between **(integrity + case_file + loose_thread)** — the
*whistle* path — and **(don + pawn + money)** — the *owned* path. `mara_trust` is the lever
she pulls; high `mara_trust` makes her warmth more convincing and her betrayal sharper.

---

## Week-by-week

**Prologue — First Shift.** The console, the hum, the city. Mara introduces herself and the
one rule: *"Not every voice wants saving. You'll learn the difference."* Sets `is_rookie`.

**W1 — The Call That Drops (goal trust 3).** A young woman, an address half-spoken, then dead
air. Mara says prank, marks it closed. You can let it go or quietly keep the address
(`loose_thread`). *Weekend:* Grandma calls to thank you for last week — warmth established.

**W2 — Same Block (trust 6).** Different girl, same dead air, an address one door down from
W1. Mara reassigns the nearest unit "to balance the board." Push or defer.
*Weekend:* Mara buys you coffee. She's genuinely good company (`mara_trust`).

**W3 — The House Where Girls Come and Go (trust 9).** A neighbor whispers a tip. First hard
fork: dispatch on your own authority (`integrity`, `case_file`) or let Mara talk you down
(`mara_trust`, `pawn`).

**W4 — The Envelope (trust 12).** Cash shows up — a "thank-you from a grateful citizen,"
left at your station. Keep it (`money`, `don`, `pawn`) or log it (`integrity`, `case_file`).
*Weekend:* you can't sleep; the address from W1 is a sticky note you haven't thrown away.

**W5 — Grandma's Girl (trust 15).** Grandma calls: Lily didn't come home. The map clicks —
Lily's last ping is the block. The horror has a name now (`grandma_bond`).

**W6 — What Mara Types (trust 18).** Midpoint reveal. You catch Mara feeding an address to an
outside number and mislabeling Lily's case. *You* now know. Confront her, report up the chain
(`case_file`), or go quiet to gather proof (`loose_thread`, `pawn`).

**W7 — "We're the Same" (trust 21).** Mara knows you saw. Warm threat. She offers you *in*
(`don`) or marks you as a liability to be managed (`pawn`). Either way the mentorship curdles.

**W8 — The Coded Call (trust 24).** A call that's really a message from the Don — a test. Wear
the wire / build the file (`case_file`, `integrity`) or take the deal (`money`, `don`). They
name Grandma's street to remind you what's reachable.

**W9 — The Whisper (trust 27).** A girl escapes and calls *you* directly, hidden, terrified —
and Mara is on the floor, listening. Highest-tension single call: dispatch help without
tipping Mara. Success sets `girls_saved`, maybe `lily_safe`.

**W10 — The Price (trust 30).** Retaliation. A unit is sent to the wrong address; someone you
covered for is exposed; Grandma gets a knock on the door. Integrity has a cost, and you pay it.

**W11 — The Trap (trust 33).** You set the sting. Everything you logged (`case_file`,
`loose_thread`) becomes a live operation run from your console — or, if you went the owned
path, Mara runs *you*. Branches hard on what you've become.

**W12 — Open Frequency (trust 36).** Climax + endings, reached by the final on-console choice:
- **The Whistle** — high integrity/case_file: the ring falls, Mara is exposed, Lily comes home.
- **The Pawn** — high don/money: the ring survives, you're kept, the frequency stays quiet.
- **Loose Threads** — mixed/pawn: you survive compromised; Mara walks; some girls saved, some not.
- **Dead Air** — neglect path: the block goes silent for the worst reason. The city never knows.

*Weekend beats* throughout modulate the bond/temptation axis: Grandma, Mara's friendship, the
sticky note, the sleepless nights, the envelope you did or didn't keep.

---

## Tone guardrails (kept in the writing)
- Victims are people with names and fear, never described as cargo or with graphic detail.
- The dread comes from **dispatcher POV**: dead air, a dropped pin, a reclassified ticket.
- Mara is never a cartoon. Her care is real; that's the knife.
- No instructions, logistics, or anything that reads as a how-to. The crime stays off-screen.
