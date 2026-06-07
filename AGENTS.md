# Coding Agent Rules

These rules are repo-local behavior guidelines for coding agents working on this project. They are adapted from the public Karpathy-style coding-agent guidance: keep changes surgical, avoid invented success criteria, avoid unnecessary diffs, and verify before claiming success.

## Think Before Coding

- Restate assumptions when requirements are ambiguous.
- Define concrete verification commands before implementation.
- Prefer the smallest production-grade change that satisfies the task.
- Do not invent broad refactors to make a narrow change easier.

## Surgical Changes

- Touch only files required for the current task.
- Preserve existing style and ownership boundaries.
- Avoid drive-by cleanup outside the changed behavior.
- Keep diffs readable enough for a senior engineer to review quickly.

## Simplicity

- Prefer explicit, readable code over clever abstractions.
- Add abstractions only when they remove real duplication or clarify a contract.
- Do not create generic frameworks for one use case.

## Verification

- Every feature needs a test or a deterministic verification command.
- Do not claim that code works until the relevant command has just run.
- If a command fails, report the failure and fix the root cause.

