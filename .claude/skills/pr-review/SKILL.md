---
name: pr-review
description: Review a GitHub pull request for this project. Reads the PR, its linked issue, and the diff, checks correctness and the project rules in CLAUDE.md against the issue's requirements, and reports findings; posts the review to GitHub only when the user approves. Use when the user asks to review a PR, look over a pull request, or check #N before merging, or runs /pr-review.
argument-hint: "<PR number or URL> [--post]"
allowed-tools: Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr list:*), Bash(gh pr checks:*), Bash(gh issue view:*), Bash(gh auth status:*), Bash(gh repo view:*), Bash(git status:*), Bash(git fetch:*), Bash(git log:*), Bash(git diff:*), Bash(git show:*)
---

# PR Review

Review the pull request given in `$ARGUMENTS`, which can be a number like `34` or `#34`, or a full PR URL. If `--post` is included, the user has asked for the review to be posted to GitHub, but you still show it to them before posting (step 7).

## Steps

1. **Check prerequisites.**
   - If no PR is given, run `gh pr list --state open --limit 20` and ask the user which one to review.
   - `gh auth status`: if the user isn't logged in, tell them to run `! gh auth login` and stop.

2. **Read the PR.** Run `gh pr view <n> --comments --json number,title,body,author,baseRefName,headRefName,headRefOid,files,additions,deletions,commits,reviews,comments,closingIssuesReferences`.
   - If the PR is very large (roughly more than 1,000 changed lines), tell the user and ask whether to review all of it or focus on specific files.

3. **Read the requirements.**
   - For each issue in `closingIssuesReferences`, or any `#N` mentioned in the PR body, run `gh issue view <N> --comments`. Its acceptance criteria or definition of done are the requirements the PR must meet. If there's no linked issue, use the PR description.
   - Read `CLAUDE.md`. Its domain rules and "Rules any fix must follow" apply to every PR.

4. **Read the diff and its context.**
   - Run `gh pr diff <n>`.
   - Read the surrounding code, not just the changed lines. If the PR branch isn't checked out, use `git fetch origin pull/<n>/head` and `git show FETCH_HEAD:<path>` to read files at the PR's version. Don't switch branches in the user's working tree.
   - Run `gh pr checks <n>` and note any failing CI.

5. **Review.** Check the PR for, in priority order:
   - **Correctness:** logic errors, unhandled edge cases, broken error handling, and regressions in callers of changed code.
   - **Project rules.** For backend changes, check that:
     - booking checks and saves as one transaction that locks the target desk and its neighbours in ascending ID order, with no in-memory locks
     - neighbour logic goes through the single neighbour policy and reads the floor's `neighbour_mode`
     - conflicts and constraint violations return 409 with a `{code, message}` body, never 500
     - WebSocket updates are published only after commit, and include the per-desk version
     - schema changes go through Flyway migrations
     - users can cancel only their own bookings, and the JWT is checked on REST calls and the WebSocket handshake

     For frontend changes, check that:
     - the store is keyed by desk ID and drops out-of-date versions
     - the map reloads the full floor after a reconnect
     - cells are memoized and each reads only its own desk
     - bookings shown instantly roll back after a 409
     - cells work by keyboard, and status isn't shown by colour alone
   - **Requirements:** each acceptance criterion from step 3 is either met or explicitly missing.
   - **Security:** injection, unvalidated input, leaked secrets or tokens, and authorization gaps in the changed code.
   - **Tests:** whether the changed behavior is covered, and whether the tests would actually catch a regression. Any change to booking, locking, or the spacing rule needs a concurrency test that fires simultaneous requests for the same desk *and* for neighbouring desks, repeats many times, and runs against Testcontainers Postgres, not H2.

   Before reporting a finding, confirm it against the code. Name the concrete input or interleaving that triggers the problem. Drop anything you can't back up, and skip style nitpicks a linter would catch.

6. **Report.** Give the user:
   - a verdict: **Approve**, **Request changes**, or **Comment**
   - a one-paragraph summary of what the PR does and whether it meets its requirements
   - findings ordered most severe first, each tagged **blocking** or **suggestion**, with a `path:line` reference, what's wrong, the scenario that triggers it, and a suggested fix
   - any acceptance criteria that aren't met, plus failing CI checks

7. **Post the review (only when asked).** Only continue if the user asked with `--post` or asks now. Show them exactly what will be posted and wait for confirmation, because the review is visible to the PR author. Then post it with a heredoc so the markdown survives:
   ```bash
   gh pr review <n> --request-changes --body "$(cat <<'EOF'
   <review body>
   EOF
   )"
   ```
   Use `--approve`, `--request-changes`, or `--comment` to match the verdict. If the PR's author is the current user, use `--comment`, since GitHub doesn't let authors approve or request changes on their own PRs. Reply with the PR URL.
