# Requests checklist

Every feature the site's owner has asked for, one line each. Read this before saying
whether something was or wasn't requested, and add new requests here as they come in.

Status key:
- **Built** = in the code. **Sandbox-checked** = also played or looked at in a real browser on a local copy.
- Nothing here has been checked on an iPad/Safari, in light mode, or against the live site unless it says so.

This file is public, so it holds no last names, school, teacher, grades or personal email.

## Basics

| Request | Status |
|---|---|
| Free hosting (GitHub Pages) and free sync (Firebase Firestore, Spark plan) | Built, live |
| Progress syncs between Dad's home, Mom's home and the iPad, with a local copy if sync fails | Built; sync pill checked on the live site earlier |
| Separate from Laila's Lab (own repo, own Firebase project, no links) | Built |
| Named "Brain Lab" (not "Math Lab"), display name "Emmett" | Built |
| No-password entry, parent PIN stored only on the device | Built |
| Public repo with no identifying information | Built |
| Firestore rules saved in the repo: add-only, validated fields, no update/delete | Built; published by the owner |
| Locations to choose from: Dad's home, Mom's home, iPad | Built |

## Math

| Request | Status |
|---|---|
| Homework-set topics: number words to digits, multiply thousands/hundreds, division word problems, division with remainders, mode/mean/median/range | Built |
| Fractions, GCF, LCM, factors and multiples | Built |
| Guided Practice (hints, second try), Smart Practice (targets weak skills), Practice Exam | Built |
| Practice = 15 questions, exam = 20 questions | Built |
| Hints with worked steps and distractors based on real mistakes; mistake-pattern tracking | Built |
| Parent area (PIN): goal line, accuracy by skill, no-hint percentage, mistake patterns, practice log | Built |
| Stars, day streak, badges, unlockable avatar closet | Built |

## Spelling (Emmett reads fine; writing and spelling are the weak spot)

| Request | Status |
|---|---|
| A spelling section like the math one, with lessons | Built (14 lessons), sandbox-checked |
| All games listed on the main Spelling screen (not only inside each lesson) | Built, sandbox-checked |
| Game: Complete the word | Built, sandbox-checked |
| Game: Unscramble | Built, sandbox-checked |
| Game: Word hunt | Built, sandbox-checked |
| Game: Fill the sentence | Built, sandbox-checked |
| Game: Write a sentence | Built, sandbox-checked |
| Game: Spot the right spelling | Built, sandbox-checked |
| Extra games not asked for: Look/Cover/Write, Practice Test | Built |
| Parent can add the school's weekly list as a custom list | Built |

## Avatar and bedroom

| Request | Status |
|---|---|
| Default look: peanut-butter skin, short wavy hair (waves must not go sideways, no bald spot) | Built, sandbox-checked |
| Jaguars colors are the avatar defaults; headband and jersey colors can be changed | Built |
| Site theme stays Detroit Lions blue | Built |
| Avatar has a full torso, arms and legs at the same scale as the room items | Built, sandbox-checked |
| Legs shorter than the torso; arms never lift above the shoulders | Built, sandbox-checked |
| Avatar stands forward in the room | Built, sandbox-checked |
| Avatar shown in the bedroom so changes can be seen | Built |
| "Closet" label above the door; bed and rug centered | Built |
| Every room item (except Halloween details) is editable and can be earned as a prize | Built |
| More advanced graphics; wardrobe item art redone | Built, sandbox-checked |
| Desk fixed | Built, sandbox-checked (only some option combinations viewed) |
| Fourth wall poster | Built |
| Curtains reach the floor, behind the dresser | Built, sandbox-checked |
| Unlockables: football helmet and trophy | Built |
| Closet prizes are a marathon: items Emmett already had stay unlocked; every other shirt, hat and extra needs more stars (first at 400, last at 8,000), with 8 new items added | Built, sandbox-checked (his 10 current items unchanged on his real session data) |

## Football

| Request | Status |
|---|---|
| Football field with a scoreboard instead of planets; gain yards, score a touchdown | Built, sandbox-checked |
| Field progress moves ONLY with Emmett's math and spelling stars (400 stars = one 100-yard drive) | Built, sandbox-checked |
| Preseason / Regular Season / Playoffs / Super Bowl follow ONLY the real 2026-27 NFL calendar, never stars | Built, sandbox-checked |
| The two are independent: no yards needed to reach the playoffs or the Super Bowl | Built |
| Meet the Teams: 3-4 well-known offensive and 2-3 defensive current players | Built |
| Actual 2026 team helmets with logos | Built |
| Football bracelet spelled "football" | Fixed |
| Favorite team is the Jacksonville Jaguars | Built |

## Fun facts

| Request | Status |
|---|---|
| Topics: dinosaurs, NFL football, Pokemon, Minecraft, Madden, Call of Duty, outer space | Built |
| Facts must be verified | Super Bowl date looked up; the rest were chosen from well-known facts, not each looked up |
| A different fact every day, never the same one all day | Built, sandbox-checked |

## Geography

| Request | Status |
|---|---|
| U.S. state capitals practice | Built |
| A deeper Florida section | Built |

## Other

| Request | Status |
|---|---|
| Scroll bar reaches the bottom of every screen; bottom not blocked | Addressed in an earlier session; not re-checked for this file |
| Recurring reminder every 30 days to review the site | Google Calendar event every 30 days, from 2026-11-03 |

## Open items

- Prize pacing lives in the `ITEMS` list (`at:` = stars). The room prizes (bed, desk, posters and so on) were not changed.
- Season dates need a yearly update (`SEASON` in the code); after Feb 14 2027 the bar says "Season over" until the next schedule is added.
- Preseason end date is unconfirmed, so it runs until the Sep 9 kickoff.
- Three leaked test sessions in Firestore `sessions` ("Mom's home") must be deleted by the owner; the rules block client deletes.
- Not tested: iPad/Safari, light mode, live-site sync after the poster 4 room setting was added.
