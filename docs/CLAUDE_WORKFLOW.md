# Claude Code workflow (with Cursor)

Use this when you want to edit the same codebase from **Claude Code** (e.g. in another terminal or IDE) while keeping **Cursor** as your main editor. Follow the steps below so Claude has the right context and you keep a safe, reviewable workflow.

---

## 1) Launch Claude Code from the repo root

- Open a terminal and go to the repo root:
  ```bash
  cd /Users/user/Downloads/starter-1770256869
  ```
- Start Claude Code so its working directory is this repo:
  - **Claude Code desktop app:** Open the app, use “Open folder” or “Open project” and choose `starter-1770256869` (this folder).
  - **Claude Code CLI:** If you have a CLI, run it from inside the repo, e.g.:
    ```bash
    cd /Users/user/Downloads/starter-1770256869
    claude-code
    ```
- Confirm in the UI or welcome text that the project path is `.../starter-1770256869` so Claude has access to all project files.

---

## 2) Confirm Claude can read and write (safe test)

Before making real changes, run a harmless test:

1. In Claude Code, ask: *“Create a new file `docs/CLAUDE_FIRST_TEST.txt` with exactly this content: `Claude can read and write this repo.` Do not change any other files.”*
2. In your terminal (or Cursor), run:
   ```bash
   git status
   ```
   You should see `docs/CLAUDE_FIRST_TEST.txt` as untracked (or modified if it already existed).
3. Open `docs/CLAUDE_FIRST_TEST.txt` in Cursor and confirm the content.
4. To clean up the test: delete the file and run `git status` again, or leave it and add it to `.gitignore` if you prefer.

If the file appears and has the right content, Claude has read/write access. You can delete `docs/CLAUDE_FIRST_TEST.txt` before committing.

---

## 3) Safe workflow: status → Claude change → review → test → commit

Use this loop every time you have Claude make changes:

1. **Before asking Claude to change anything**
   - In the repo root:
     ```bash
     git status
     ```
   - Make sure the working tree is clean or you know what’s already changed.

2. **Ask Claude to make the change**
   - Describe the task clearly.
   - Remind Claude: “Only touch the files needed for this task. List the files you changed when done.”

3. **Review the diff in Cursor**
   - In terminal:
     ```bash
     git status
     git diff
     ```
   - In Cursor, open the changed files and review the diff (or use Cursor’s source control view).
   - Confirm only intended files were changed and no secrets or unrelated code were modified.

4. **Run tests**
   - From repo root, run your usual test command(s), e.g.:
     ```bash
     npm test
     npm run build
     npm run dev:mobile
     ```
   - Fix any failures before committing.

5. **Commit (and push if you want)**
   - Stage and commit from Cursor or terminal:
     ```bash
     git add -A
     git commit -m "Brief description of the change"
     git push   # optional
     ```

---

## 4) Repo rules for Claude

When giving instructions to Claude, you can say: “Follow the repo rules in `docs/CLAUDE_WORKFLOW.md`.” Those rules are:

- **Do not touch `.env` or any file that contains secrets** (e.g. `.env`, `.env.local`, `.env.*.local`). Do not read, edit, or suggest committing them.
- **Keep changes small and focused:** Prefer one logical change per task; avoid unrelated edits.
- **Always list which files you changed** at the end of your response (e.g. “Files changed: `src/foo.ts`, `docs/bar.md`”).
- **Do not commit or run destructive git commands** unless the user explicitly asks (e.g. no `git push --force`, no `git reset --hard`).

---

## 5) First test (already done in Cursor)

This file (`docs/CLAUDE_WORKFLOW.md`) was created in Cursor and describes the workflow above. No other code changes were made.

**Optional first test in Claude Code:** Ask Claude to create `docs/CLAUDE_FIRST_TEST.txt` with the single line `Claude can read and write this repo.` and no other changes, then follow section 2 and 3 to review and clean up.
