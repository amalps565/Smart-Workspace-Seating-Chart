---
name: triage-issue
description: Triage GitHub issues for this project. Classifies each issue's type, area, severity, and roadmap milestone, checks for duplicates, missing information, and dependencies, and recommends labels and next steps; changes the issue only after the user approves. Use when the user asks to triage, sort, prioritize, label, or assess an issue or the issue backlog, or runs /triage-issue.
argument-hint: "[issue number or URL | --all]"
allowed-tools: Bash(gh issue view:*), Bash(gh issue list:*), Bash(gh label list:*), Bash(gh pr list:*), Bash(gh auth status:*), Bash(gh repo view:*), Bash(git log:*), Bash(git grep:*)
---

# Triage Issue

Triage the issue given in `$ARGUMENTS` (a number like `12` or `#12`, or a full URL). With `--all`, or with no argument, triage every open issue that hasn't been triaged yet.

Triage produces a recommendation. It never changes an issue until the user approves (step 6).

## Steps

1. **Check prerequisites.**
   - `gh auth status`: if the user isn't logged in, tell them to run `! gh auth login` and stop.
   - Read the root `CLAUDE.md` for the domain rules, the API and WebSocket contract, and the three known problems.
   - Run `gh label list` to learn which labels exist.

2. **Pick the issues.**
   - For one issue: `gh issue view <n> --comments --json number,title,body,labels,assignees,state,comments,createdAt,author`.
   - For `--all` or no argument: `gh issue list --state open --limit 50 --json number,title,labels,assignees`. Keep issues that have no type label (`bug`, `enhancement`, `documentation`, `question`) or that carry `question` or `help wanted`, and view each one as above. If there are more than 10, tell the user the count and ask whether to go ahead with all of them.

3. **Gather context for each issue.**
   - **Duplicates:** `gh issue list --search "<key terms>" --state all --limit 10`, and `gh pr list --search "<key terms>" --state all --limit 5` for work already in progress.
   - **Code:** if the issue names code, endpoints, or behavior that exists, find it with `git grep` and read it so you can judge the problem and cite `path:line`.
   - **Dependencies:** find open issues this one depends on or blocks, following the roadmap order on the wiki's Roadmap page: scaffold → schema and auth → snapshot → spacing rule → race fix → WebSocket → frontend grid → end-to-end tests.

4. **Assess each issue.**
   - **Type:** bug, feature (`enhancement`), task, docs, or question.
   - **Area:** backend, frontend, both, database, CI or tooling, or docs. Use `CLAUDE.md` to decide. For example, booking, locking, or the spacing rule is backend; grid rendering or the socket client is frontend; a contract change is both.
   - **Link to the known problems:** say whether it's part of Problem 1 (the adjacent-seat race), Problem 2 (the spacing rule), or Problem 3 (live grid updates), or none of them.
   - **Severity:**
     - **Critical:** data integrity or security. Double bookings, spacing-rule violations that reach the database, auth bypass, one user able to change another's booking, or leaked tokens.
     - **High:** a core flow is broken for everyone, meaning booking, cancelling, loading the floor, or live updates.
     - **Medium:** broken for some cases, or a workaround exists. Includes accessibility barriers.
     - **Low:** cosmetic, minor, or nice to have.
   - **Readiness:** is the issue actionable? For a bug, check that it has reproduction steps, expected versus actual behavior, and exact error text or HTTP status and error code. A race-condition bug must say which requests, for which desks and date, were sent at the same moment. For a feature, check that it has acceptance criteria. List exactly what's missing.
   - **Rule conflicts:** flag any request that contradicts `CLAUDE.md`. Examples: relying only on client-side validation, in-memory locks, publishing before commit, exposing entities, or using H2 for concurrency tests. Recommend how to reshape the request so it fits the rules.
   - **Size:** small (a single file or rule), medium (one layer, a few files), or large (crosses backend and frontend, or should be split). For large issues, propose how to split them.
   - **Suggested agent:** `senior-java-engineer`, `senior-frontend-engineer`, or `senior-qa-engineer`, based on the area.

5. **Report.** For each issue, give a short block:
   ```
   #<n> <title>
   Type: <type> · Area: <area> · Severity: <level> · Size: <S/M/L>
   Problem link: <1/2/3/none> · Milestone: <roadmap step>
   Duplicates / related: <#… or none>
   Depends on / blocks: <#… or none>
   Ready: <yes | no: what's missing>
   Recommended: labels +<…> −<…>; <close as duplicate | ask for info | ready for /start-issue>; agent: <name>
   ```
   With several issues, finish with a table sorted by severity, then roadmap order. Give the recommended order to work on them.

6. **Apply (only after approval).** Show the exact changes, then wait for the user to approve all, some, or none. Changing issues is visible to others. Then:
   - Labels: `gh issue edit <n> --add-label "<a>" --remove-label "<b>"`. Use only labels that already exist. If a useful label is missing (for example `backend`, `frontend`, `concurrency`, `priority: critical`, or `needs info`), list it and ask before creating it with `gh label create`.
   - Missing information: post one comment listing exactly what's needed, with `gh issue comment <n> --body-file -` and a heredoc.
   - Duplicates: comment with a link to the original. Close the issue with `gh issue close <n> --reason "not planned"` only if the user confirms.
   - Dependencies: if they aren't already in the body, add them in a comment such as `Depends on #4`.
   - Never assign people, change milestones, or edit the issue body unless the user asks.

7. **Wrap up.** Summarize what changed per issue, and which issues are ready for `/start-issue`.
