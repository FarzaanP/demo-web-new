# Contributing to NewRamCentral

This document is the team's shared workflow for GitHub Source Control and GitHub Projects.
Every task in the sprint plan follows this exact process.

## Branching

- Never commit directly to `main`.
- One branch per issue, named `feature/[short-kebab-name]` (e.g. `feature/login-page`).
- Branch from an up-to-date `main` (`git pull` or VS Code's "Pull" button before creating a branch).

## Commit messages

Use the conventional-commits style: `type(scope): message`

- `feat` - a new feature (e.g. `feat(auth): add login page`)
- `fix` - a bug fix
- `chore` - config, tooling, or non-feature changes (e.g. `chore(setup): add vite config`)
- `docs` - documentation only

## Pull Requests

1. Push your branch ("Publish Branch" in VS Code's Source Control panel).
2. Open a PR on GitHub targeting `main`. Link the PR to its GitHub Projects issue/card.
3. At least **one teammate** must approve before merging - no self-merges.
4. Use "Squash and merge" to keep `main`'s history one commit per issue.
5. Delete the branch after merging.

## GitHub Projects board columns

`Backlog -> To Do -> In Progress -> In Review -> Done`

Move your card to `In Progress` when you start a task and `In Review` when your PR is open, so
the whole team can see status at a glance during stand-ups.

## Task order

Tasks are numbered in dependency order in the sprint plan - do not start an issue until its
listed prerequisites are merged into `main`. This is what keeps five people working in the same
repo without merge conflicts.
