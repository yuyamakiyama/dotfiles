---
name: quiz
description: Use when the user says "quiz me", "/quiz", or "check I understand this change", and whenever the quiz-gate hook tells Claude to run /quiz. Asks 3 questions about the current branch diff and the ticket notes, one at a time, grades the user's typed answers against the code, and records the result in the notes file's Quiz section.
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
2. **Build 3 questions.**
   - At least one on a randomly picked hunk: "what does this line do, and why". Pick the hunk with a random index, not the most interesting one: with N hunks, run `echo $((RANDOM % N))` in the shell and use that index.
   - At least one on a decision or deviation from the notes file.
   - One "what would break if…" question, naming a concrete change to the code.
   Each question names its `path:line`.
3. **Ask one at a time.** Print one question, then stop and wait for the user's typed reply. Do not show the next question or any expected answer until the reply arrives. Do not use AskUserQuestion; the answers are free text.
4. **Grade each answer.** After each reply, mark PASS or FAIL with a one-line reason citing `path:line`. Grade against what the code and notes actually say. A vague or partial answer is FAIL.
5. **Record.** Append to the notes file's `## Quiz` section with the Edit or Write tool (never through the shell), keeping everything else intact. The line must start exactly as follows, with today's date as `YYYY-MM-DD`:
   - All 3 passed: `Quiz: passed (YYYY-MM-DD)`
   - Otherwise: `Quiz: failed (YYYY-MM-DD) — <topics missed>`

   A hook matches `/^Quiz: passed/m`, so the line begins at column 0 with no bullet, quote or other prefix, and a failed run never contains that text.
6. **Reply.** State the result in one line. After a fail, say the user can rerun `/quiz` to retake it; a retake appends a new line and builds new questions.
