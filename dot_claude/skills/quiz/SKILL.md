---
name: quiz
description: Use when the user says "quiz me", "/quiz", or "check I understand this change", and whenever the quiz-gate hook tells Claude to run /quiz. Asks 4 questions (Predict, Counterfactual, Root cause, Trade-off) about the current branch diff and the ticket notes, one at a time, grades the user's typed answers against the code, and records the result in the notes file's Quiz section.
---

# quiz — check the user understands the change

The point is that the user understands what they are about to ship. The answers must come from the user: never answer for them, hint at the answer, or grade a question the user has not answered.

## Steps

1. **Collect material.**
   - Notes path: `bun ~/.claude/hooks/notes-path.ts`. Read the file's Brief, Decisions and assumptions, and Deviations.
   - Diff: `git diff $(git merge-base HEAD origin/<default>)` (default branch from `git symbolic-ref refs/remotes/origin/HEAD`, falling back to `main`), plus untracked files from `git status --short`.
   - If the diff is empty, say so and stop.
   - If the notes file is missing, do not stop. Create the directory if needed, then create a minimal file with the Write tool:

     ```
     # <KEY or branch> — <latest commit subject>

     ## Brief
     (no kickoff — created by /quiz)

     ## Decisions and assumptions

     ## Deviations

     ## Quiz
     ```

     Then run the quiz, building the questions from the diff alone.
2. **Build 4 questions, one per type, in this order.** Each asks ONE thing (never "X and Y") and names its `path:line`. One question means one ask: before you show a question, check it has a single interrogative clause; asking about the same outcome before and after counts as one ask. Good: "What happens to the wall at the doorway before and after this PR?" Bad: "What does X return, what does Y return, and what does that mean for Z?" Rewrite any bundled question before showing it.

   | Type           | Asks                                                                               | Example                                                                                     |
   | -------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
   | Predict        | Given a concrete input, walk through what happens before and after the PR          | "Venue renamed `Aegix` -> `aegix`. What does the floor plan show before and after?"         |
   | Counterfactual | If one part of the change were reverted or altered, what would break or still work | "If line 190 went back to `Equals(t.VenueId)` but the name repair stayed, what breaks?"     |
   | Root cause     | Why the bad state could arise in the first place                                   | "Why could a floor hold a stale venue name?"                                                |
   | Trade-off      | What a design choice in the PR costs or risks, and why it was still chosen         | "Names are repaired during floor-plan generation, not at rename time. What does that cost?" |

   Ground them in the diff, and in the notes file's decisions and deviations where they fit. Prepare for each a hint (points to where to look, such as a file, line or concept, without stating the answer) and a rubric. Keep both to yourself until needed. The rubric may require only what the question text asks for. If you want the mechanism or the reason, the question must ask for it; never grade a "what happens" question on why it happens.
3. **Ask one at a time.** Print one question, then stop and wait for the user's typed reply. Do not show the next question, the rubric or any expected answer until the reply arrives. Do not use AskUserQuestion; the answers are free text.
   - **Hint:** before answering, the user may type `hint`, once per question. Reply with a hint that points to where to look without stating the answer, count it, and wait again. No penalty. A second `hint` request on the same question gets no new hint.
4. **Grade each first answer immediately.** After the reply, mark PASS or FAIL with a one-line reason citing `path:line`. Grade against what the code and notes actually say. A vague or partial answer is FAIL. Grade only against what the question asks: an answer that states the correct observable result passes a question that asks what happens, even if it does not explain the cause. A vague answer is one that does not answer the question asked, not one that omits detail the question did not request.
   For every FAIL, after the verdict add:
   1. **What was wrong**: 2-5 plain sentences naming the specific wrong claim or missing point versus the code, citing `path:line` where useful and explaining any class or method names in plain words.
   2. **Example answer**: a short model answer (2-4 sentences) that would pass, written in the first person as the PR author would say it in review.

   A PASS needs neither. Give these only after that question is graded, never before the user answers.
   - **Retry (FAIL only):** ask for a one-sentence retry restating the corrected chain, then stop and wait. Grade only against what the question asks. Grade it PASS or FAIL with one line. The retry never changes the outcome. Then move to the next question.
5. **Record** after all 4 are finished. Passed = all 4 FIRST answers PASS (retries and hints do not matter). Append to the notes file's `## Quiz` section with the Edit or Write tool (never through the shell), keeping everything else intact. The line must start exactly as follows, with today's date as `YYYY-MM-DD` and N the number of hints used:
   - Passed: `Quiz: passed (YYYY-MM-DD) — hints: N`
   - Otherwise: `Quiz: failed (YYYY-MM-DD) — <types missed> — hints: N`

   A hook matches `/^Quiz: passed/m`, so the line begins at column 0 with no bullet, quote or other prefix, and a failed run never contains that text.
6. **Reply.** State the result in one line. After a fail, say the user can rerun `/quiz` to retake it; a retake appends a new line and builds new questions.
