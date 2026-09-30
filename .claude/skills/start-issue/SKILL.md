---
name: start-issue
description: Start work on an existing GitHub issue in this project. Reads the issue, assigns it, creates a branch for it, plans the change, and implements it. Use when the user asks to start, pick up, work on, or tackle an issue (for example "start issue 12" or "work on #12"), or runs /start-issue.
argument-hint: "<issue number or URL>"
allowed-tools: Bash(gh issue view:*), Bash(gh issue list:*), Bash(gh issue edit:*), Bash(gh auth status:*), Bash(gh repo view:*), Bash(git status:*), Bash(git branch:*), Bash(git switch:*), Bash(git fetch:*), Bash(git pull:*), Bash(git remote:*), Bash(git log:*)
---

# Start Issue

Start working on the GitHub issue given in `$ARGUMENTS`, which can be a number like `12` or `#12`, or a full issue URL.

## Steps

1. **Check prerequisites.**
   - If `$ARGUMENTS` is empty, run `gh issue list --assignee @me --state open --limit 20` (fall back to all open issues if that's empty) and ask the user which one to start.
   - `gh auth status`: if the user isn't logged in, tell them to run `! gh auth login` and stop.
   - `git status`: if there are uncommitted changes, tell the user and ask how to proceed. Never stash or discard their changes yourself.

2. **Read the issue.** Run `gh issue view <n> --comments --json number,title,body,labels,assignees,state,comments`.
   - If it's closed, ask before continuing.
   - If someone else is assigned, point that out and ask before continuing.
   - Read the whole issue, including comments. Later comments often change the scope.

3. **Assign it.** Run `gh issue edit <n> --add-assignee @me`.

4. **Create a branch.**
   - Run `git fetch`, `git switch main`, then `git pull`.
   - Pick a prefix from the labels and content: `fix/` for bugs, `feat/` for features, `chore/` for scaffolding, tooling, tests, and docs.
   - Name the branch `<prefix><n>-<slug>`, where the slug is 3–5 lowercase, hyphenated words from the title. For example: `fix/12-neighbour-booking-race`.
   - If a branch for this issue already exists (`git branch --list "*/<n>-*"`), switch to it instead of creating a new one.
   - Otherwise run `git switch -c <branch>`.

5. **Plan.** Read `CLAUDE.md`, then explore the code the issue touches. Give the user a short plan that covers:
   - what the issue asks for, in one or two sentences
   - the files you expect to change and how
   - which rules from `CLAUDE.md` apply, for example locked check-and-save, publishing after commit, or per-desk versions
   - any open questions or ambiguities in the issue

   Wait for the user to approve or adjust the plan before editing code. If the issue has acceptance criteria or a definition-of-done checklist, treat those as the requirements.

6. **Implement.** Make the change, following `CLAUDE.md`.
   - Add or update tests for the changed behavior. Any change to booking, locking, or the spacing rule needs the concurrency test described in `CLAUDE.md`.
   - Run the build, lint, and tests for every part you touched (`backend/`, `frontend/`, or both), using the commands in `CLAUDE.md`. If `CLAUDE.md` doesn't list commands yet, use the project's own tooling (the Maven wrapper in `backend/`, the `package.json` scripts in `frontend/`) and tell the user which commands you ran.
   - Fix any failures. Report honestly anything you couldn't run, such as tests that need Docker when it isn't available.

7. **Wrap up.** Summarize what changed and how you verified it, and flag any acceptance criteria that aren't met. Suggest a commit message that ends with `Closes #<n>`. Don't commit, push, or open a PR unless the user asks.
