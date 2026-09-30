---
name: create-issue
description: Draft and create a GitHub issue for this project with the gh CLI. Use when the user asks to create, file, open, or log an issue, bug report, feature request, or task, or runs /create-issue.
argument-hint: "[short description of the issue]"
allowed-tools: Bash(gh issue create:*), Bash(gh issue list:*), Bash(gh label list:*), Bash(gh repo view:*), Bash(gh auth status:*), Bash(git remote:*)
---

# Create Issue

Turn the user's request (`$ARGUMENTS`, or the conversation if that's empty) into a well-formed GitHub issue and file it on this repo (`amalps565/Smart-Workspace-Seating-Chart`, the `origin` remote).

## Steps

1. **Check prerequisites.**
   - `gh auth status`: if the user isn't logged in, tell them to run `! gh auth login` and stop.
   - `gh repo view --json nameWithOwner`: confirm the repo. If it fails, pass `--repo amalps565/Smart-Workspace-Seating-Chart` from then on.

2. **Gather context.** Read `CLAUDE.md` so the issue uses the project's terms and rules: the spacing rule, `neighbour_mode`, the 409 error codes, and the milestones. If the description is too vague to act on, ask one short question to fill the gap. When the issue refers to code, read the relevant files so you can cite paths and line numbers.

3. **Check for duplicates.** Run `gh issue list --search "<key terms>" --state all --limit 10`. If an existing issue looks like the same thing, show it to the user and ask whether to go ahead.

4. **Classify the issue** as a bug, a feature, or a task, and draft it using the matching template below.
   - Title: under 70 characters, imperative or descriptive, no trailing period.
   - Labels: run `gh label list` and use only labels that already exist. Don't create new labels.
   - If the issue belongs to a milestone from the plan (for example, booking rules or live updates), say so in the body.

5. **Confirm before creating.** Show the user the title, labels, and body, and wait for approval. Creating an issue is visible to others.

6. **Create the issue.** Pass the body through a heredoc so the markdown survives:
   ```bash
   gh issue create --title "<title>" --label "<label>" --body "$(cat <<'EOF'
   <body>
   EOF
   )"
   ```
   Leave out `--label` if no existing label fits. Reply with the issue URL that `gh` prints.

## Templates

**Bug**
```markdown
## Description
<what is wrong>

## Steps to reproduce
1. ...

## Expected behavior
<what should happen>

## Actual behavior
<what happens instead, including exact error text or HTTP status and error code>

## Environment
<OS, browser, backend/frontend version, if relevant>
```

For race conditions, the reproduction steps must include the timing: which requests, for which desks, sent at the same moment.

**Feature**
```markdown
## Summary
<the capability being requested>

## Motivation
<the problem it solves or who benefits>

## Proposed solution
<how it could work>

## Acceptance criteria
- [ ] ...
```

**Task**
```markdown
## Summary
<what needs doing>

## Details
<context, relevant files, constraints>

## Definition of done
- [ ] ...
```

Leave out any section you have nothing real to put in. Don't invent reproduction steps, environments, or criteria.
