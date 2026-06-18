# Cognitive Design Map — 911 Dispatch

Applying *Thinking, Fast and Slow* (Daniel Kahneman) across the whole player
journey. Each bias is mapped to a concrete touchpoint, with how we use it for
**engagement** (pro‑player) and **monetization** (standard, transparent), plus
the **ethical guardrail** we won't cross.

> Kahneman's framing: System 1 is fast, automatic, emotional, and easy to fool.
> System 2 is slow, deliberate, and lazy. Good game feel rides System 1.
> Trust (and ethical monetization) requires we never *abuse* it. The video is
> ultimately about *defending* against manipulation — we design accordingly.

## System 1 vs System 2 in our loop

- **System 1 should drive the core loop**: ringing call → read → tap → dispatch.
  Fast feedback (<100ms), vivid outcomes, clear causation. This is where "juice"
  lives.
- **System 2 must be respected at decisions of consequence**: spending money,
  canceling, difficulty. Here we slow things down, show real numbers, and never
  rush the player.

---

## The 18 biases, mapped

| # | Bias | Where in the game | Engagement use | Monetization use | Guardrail |
|---|------|-------------------|----------------|------------------|-----------|
| 1 | **Anchoring** | Paywall pricing | — | Show annual total as the high anchor so weekly $4.99 reads as accessible; show per‑week math | Real plans, real prices. No struck‑through "fake" original price |
| 2 | **Framing** | Paywall + results | Frame results as gains ("+12 XP earned") | "$0.71/day" and "what you keep" rather than "$4.99/week" | Never hide the real recurring cost; show it plainly |
| 3 | **Loss aversion** | Trial → paywall, streaks | Streak that hurts to break = motivation | Trial creates something to *lose*; paywall shows progress at risk | The loss must be real (their actual progress), never fabricated |
| 4 | **Endowment** | Rank, badge, streak | "YOUR rank", "YOUR badge" — owned identity | Paywall surfaces the rank/badge they *own* | Don't gate already‑earned progress behind payment retroactively |
| 5 | **Sunk cost** | Shift progress, paywall | "You're 3/5 through your shift — finish it" | "Don't lose your career" | Frame as *their* momentum, not guilt |
| 6 | **WYSIATI / Halo / Confirmation** | First impression, 3D officer | Polished boot + officer primes competence/trust | A clean store screen feels trustworthy | Substance must match the polish (no bait‑and‑switch) |
| 7 | **Hindsight / Outcome bias** | Result screen | Judge the *decision*, teach why the right unit was right | — | Teach, don't shame wrong answers |
| 8 | **Availability** | Vivid wins, SFX | Make correct dispatches vivid + memorable (peak‑end) | — | Don't manufacture false urgency from rare events |
| 9 | **Availability cascade** | Streak/combo hype | Escalating feedback as streak grows | — | No fake "everyone is playing" social proof |
| 10 | **Negativity bias** | Incoming‑call urgency | Red ring + buzz = threat salience pulls attention | — | Urgency is diegetic (it's a 911 call), not a sales timer |
| 11 | **Optimism / Planning fallacy** | Our balancing process | Use a *premortem* when tuning difficulty | — | Internal design discipline, not a player‑facing trick |
| 12 | **Law of small numbers** | Difficulty system | Don't drop difficulty after ONE bad call (it's noise) | — | Tune on aggregates, not single sessions |
| 13 | **Representativeness** | Call scenarios | Stereotype‑matching makes calls readable & teachable | — | Avoid harmful real‑world stereotypes in content |
| 14 | **Conjunction fallacy** | Call writing | Rich detail makes scenarios feel real | — | Detail serves story, never to obscure the right answer |
| 15 | **Regression to the mean** | Streaks, difficulty | Expect averages; don't over‑reward a lucky streak | — | Reward consistency, not single lucky outcomes |
| 16 | **Ego depletion** | Session pacing | Keep calls short; the decision is the only heavy lift | Don't surface the paywall when the player is drained mid‑loop | Show offers at calm moments, never mid‑emergency |
| 17 | **Cognitive ease** | All UI, CTA copy | Clean fonts, high contrast, simple words = trust + flow | Dead‑simple CTA, pronounceable plan names | Ease must not paper over a bad deal |
| 18 | **Priming** | Boot, lobby, music, role | "ON DUTY", red urgency, music prime the operator role; prime competence ("X emergencies resolved") before an offer | Competence priming before the paywall | Prime the *role*, don't prime fear to sell |

---

## Peak‑End Rule (Kahneman's experienced vs remembered self)

Players remember a session by its **peak** and its **end**, not the average.
- **Peak** = the dispatch decision under the timer (tension).
- **End** = the result + XP/rank‑up celebration.
Design both to be highs. A session that ends on a rank‑up is remembered as great
even if some calls were missed.

## Lines we will NOT cross (dark patterns)

- ❌ Fake/looping countdown timers or "only 3 left!" scarcity
- ❌ Hidden or hard cancellation; unclear recurring price
- ❌ Pay‑to‑win (buying the correct answer)
- ❌ Loot boxes / gacha with real money (Belgium ban, COPPA risk)
- ❌ Priming fear/anxiety to drive a purchase
- ❌ Confusing decline buttons / disguised ads

These align with the `monetization-systems` skill's ethical DO/DON'T list and
keep refund rate < 5% and store ratings healthy.
