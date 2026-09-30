---
name: merge-pr
description: Merge a GitHub pull request for this project after checking that it's ready. Verifies CI, reviews, conflicts, and the linked issue, merges only when the user confirms, then cleans up the branch locally. Use when the user asks to merge, land, or ship a PR, or runs /merge-pr.
argument-hint: "<PR number or URL> [--squash|--merge|--rebase]"
allowed-tools: Bash(gh pr view:*), Bash(gh pr list:*), Bash(gh pr checks:*), Bash(gh issue view:*), Bash(gh auth status:*), Bash(gh repo view:*), Bash(git status:*), Bash(git branch:*), Bash(git fetch:*), Bash(git log:*), Bash(git switch:*), Bash(git pull:*)
---

# Merge PR

Merge the pull request given in `$ARGUMENTS`, which can be a number like `34` or `#34`, or a full PR URL. An optional `--squash`, `--merge`, or `--rebase` sets the merge method.

## Steps

1. **Check prerequisites.**
   - If no PR is given, run `gh pr list --state open --limit 20` and ask the user which one to merge.
   - `gh auth status`: if the user isn't logged in, tell them to run `! gh auth login` and stop.

2. **Read the PR.** Run `gh pr view <n> --json number,title,url,state,isDraft,author,baseRefName,headRefName,mergeable,mergeStateStatus,reviewDecision,closingIssuesReferences,files`.
   - If it's already merged or closed, say so and stop.

3. **Check readiness.** Go through each check and record whether it passes:
   - **Draft:** `isDraft` must be false.
   - **Conflicts:** `mergeable` must be `MERGEABLE`. If it's `CONFLICTING`, stop and tell the user the branch needs to be rebased on `main` or have `main` merged in. Don't resolve conflicts as part of this skill. If it's `UNKNOWN`, GitHub is still calculating, so wait a few seconds and check again.
   - **CI:** run `gh pr checks <n>`. Every required check must pass. Report any that are failing or still pending by name. If the repo has no CI checks yet, say so. Don't treat it as a pass.
   - **Reviews:** `reviewDecision` must be `APPROVED`, or empty if the repo doesn't require reviews. `CHANGES_REQUESTED` blocks the merge. If the PR changes booking, locking, spacing-rule, or WebSocket code and nobody has reviewed it, recommend running `/pr-review` first.
   - **Branch protection:** `mergeStateStatus` of `BLOCKED` or `BEHIND` means GitHub itself will refuse the merge. Explain why.
   - **Migrations:** if the PR adds Flyway migrations under `backend/`, check that their version numbers don't clash with migrations already on `main`. Two PRs can each add the same `V<n>__` number and both pass CI on their own.
   - **Linked issue:** for each issue in `closingIssuesReferences`, run `gh issue view <N>` and confirm it's the intended one, since merging will close it. If no issue is linked, mention that.

4. **Report and confirm.** Show the user a short checklist of the results, then:
   - If anything is blocking, list what needs fixing and stop. Never use `--admin` or otherwise bypass branch protection, even if the user has permission, unless they explicitly ask for it in this conversation.
   - If everything passes, ask for confirmation, since merging is visible to others and hard to undo. Name the merge method: the one from `$ARGUMENTS`, or squash by default. If the repo disallows that method (check with `gh repo view --json squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed`), use an allowed method and say which.

5. **Merge.** Once the user confirms, run:
   ```bash
   gh pr merge <n> --squash --delete-branch
   ```
   Replace `--squash` with the chosen method. `--delete-branch` removes the remote branch, and the local one if it's safe to. If the repo uses a merge queue and `gh` reports the PR was queued instead of merged, tell the user rather than retrying.

6. **Clean up locally.**
   - Run `git status`. If there are uncommitted changes, skip local cleanup and say so.
   - Otherwise switch to `main` and pull: `git switch main` then `git pull`.
   - If the local PR branch still exists, delete it with `git branch -d <head>`. Only use `-d`, never `-D`. If `-d` refuses (common after a squash merge), tell the user the branch is left in place and they can remove it with `git branch -D <head>` themselves.

7. **Wrap up.** Reply with the merged PR's URL, the merge method used, and which issues were closed. If the PR added dependencies or migrations, remind the user to reinstall dependencies or restart the backend so the migrations run.
