# Brain Lab

A practice and exam-simulator site for a 5th grader. One file, no build step. Apple-style iOS look with a space journey, closet and Football Club.

- **Math**: pick one skill or play a mix. Modes: Smart Practice (leans toward long division and word problems until there is history), Guided Practice (hints and a second try), Practice Exam (20 questions, no hints, review screen, results only at the end; optional 3:00 timer per question, off by default)
- **Skills**: number words to digits, thousands × hundreds, multi-digit multiplication, division word problems, division with remainders, mode, mean, median, range, adding unlike fractions, simplifying fractions, GCF, LCM, counting factors
- **Answers**: tap a choice or type the answer, to get comfortable with computer-based tests
- **Hints**: a right answer after a hint or second try counts as correct and is logged as "Needed a hint" in the mistake patterns. A perfect session needs zero hints.
- **Spelling**: 14 lessons, each with a rule, a memory trick and 10 words (silent letters, i before e, doubling, dropping the e, y to i, -tion/-sion, -able/-ible, sound-alike words, prefixes, endings, ough words, plurals, tricky everyday words, words from class). Eight activities built around WRITING the word from memory: Look-Cover-Write, Practice Test (typed from dictation), Fill the Sentence, Write a Sentence, Unscramble, Complete the Word, Word Hunt, and Spot the Right Spelling. Words are read aloud with the browser's voice. Mistake patterns (doubled letter, ie/ei, missing letter, wrong ending) are tracked for the parent area, and parents can add the school's weekly list.
- **Football Club** (extra, just for fun): NFL teams, divisions, rules, a card collection and closet prizes. Parent setting can hide it.
- **Rewards**: stars, day streak, bracelet badges, a space-journey progress bar, high scores and a closet avatar
- **Fun facts**: dinosaurs, NFL and the Lions, Madden, Minecraft, Pokémon and space (sources below)
- **Parent area**: PIN created on first use and stored only on the device. Score history with a goal line, accuracy by skill, "right with no hint" percent, mistake patterns, practice log, print summary, settings.
- Progress syncs through Firestore, and a copy stays in the browser so it works offline.

## What is inside
- **Math, Spelling, Geography, Football Club** practice with hints, second tries and a parent area.
- **Football field progress:** every 400 stars is a 100-yard drive (Preseason, Regular Season, Playoffs, Super Bowl, touchdown), with a scoreboard.
- **My Room:** a bedroom Emmett decorates with prizes. The closet door opens the wardrobe (skin, hair, outfit and headband colors, shirts, hats, extras).
- **Prizes take effort:** only the first 100 stars per day count (70 per subject), star costs climb steeply, and the best prizes need mastery, strong practice-exam scores or practice streaks.
- **Geography:** the 50 state capitals (typing is the lead activity) plus a Florida corner.
- **Halloween:** an automatic seasonal theme from October 1 to November 2. Nothing to earn.
- Team helmets use real team colors. Team logos load from ESPN's public image host; player lists come from ESPN depth charts (checked October 2026) and change during the season.

## Florida fact sources
Britannica, EBSCO, World Atlas, VisitFlorida, Wikipedia (St. Augustine, counties, Britton Hill, St. Johns River, Lake Okeechobee). Kennedy Space Center and Apollo 11 (July 16, 1969) are standard NASA history.

## Privacy

No last name, school, teacher or grades in this repo. The only personal detail is the first name used in the greeting. The sync database holds scores, skill names, mistake labels and the avatar choices, and it is readable by anyone who knows the project's address, so it deliberately holds nothing identifying.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app |
| `firestore.rules` | Security rules: sessions are add-only with validated fields, one profile document, everything else denied |
| `tests/generator.test.js` | Checks the question generator: `node tests/generator.test.js` |

## Setup

1. Host `index.html` on GitHub Pages (Settings → Pages → `main` / root).
2. Create a Firebase project, add a Firestore database, register a web app, and paste its config into `FB_CONFIG` near the top of the script in `index.html`.
3. Publish `firestore.rules` in the Firebase console (Firestore Database → Rules).
4. Restrict the Firebase API key to the site's address in Google Cloud Console (Credentials → the browser key → Websites).

## Monthly review (every 30 days)

Check that the site loads and says Synced, Firebase usage is inside the free Spark limits, and that Firestore holds only `sessions` and `profile`.

## Fun fact sources

- T. rex name: dictionary.com; UCL (ucl.ac.uk/news/headlines/2025/jun/what-tyrannosaurus-rex-means)
- NFL field size: Wikipedia "American football field"
- Lions championships and Ford Field: Wikipedia, Britannica, Detroit Historical Society
- Madden: Pro Football Hall of Fame; Wikipedia "Madden NFL"
- Minecraft release: Rolling Stone; Minecraft release history
- Pokémon: Bulbapedia; Serebii (generation I)
- Sunlight and Venus: NASA Astrobiology quick facts; Jupiter: Caltech/IPAC solar system brochure

## The football field and fun facts
- The field on the home screen follows the real 2026-27 NFL calendar, not Emmett's stars. Dates are from Wikipedia's "2026 NFL season" article, checked in October 2026: Hall of Fame Game Aug 6, regular season Sep 9 to Jan 10 (18 weeks), Wild Card Jan 16-18, Divisional Jan 23-24, Conference Championships Jan 31, Super Bowl LXI Feb 14, 2027 at SoFi Stadium. Update `SEASON` in the page script each year.
- The home screen shows one fun fact per day, from a pool that does not repeat until every fact has been shown.
