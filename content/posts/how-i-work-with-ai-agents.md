+++
title = "One AI setup for every repo: how I work with coding agents, and why it became a factory"
date = 2026-07-11
description = "The concrete setup behind my AI-assisted development: local sessions, cloud sessions, and CI agents sharing one set of committed rules and memory — and why maintaining it across repos turned into a stamped, versioned platform (ai-factory)."
keywords = ["ai development workflow", "claude code setup", "ai coding agents", "claude github action", "ai pair programming workflow", "platform engineering ai", "llm development setup", "repo memory agents"]
tags = ["ai", "platform-engineering", "developer-tooling", "workflow"]
draft = false
+++

I write software with AI agents in three places: a terminal session while
I work, cloud sessions I fire off and forget, and agents that live in my
repos' CI. All three follow the same committed rules, read the same
committed memory, and hand everything to me as a pull request that I
merge. This post is a tour of that setup — what each piece is for, what
actually changed in how I work, and why keeping it consistent across
repositories eventually forced me to build a small platform for it
([ai-factory](https://github.com/onurcelep/ai-factory)).

The reliability chapter — the day this pipeline failed silently and what
that taught me — is its own post:
[The green check that did nothing]({{< relref "ai-agents-in-ci-silent-failures" >}}).

## The three surfaces

**Local sessions** are where real pair work happens: a CLI agent
([Claude Code](https://claude.com/claude-code)) with full access to the
working tree, the browser, and my tools. I use it for anything with
unknowns — debugging, design, verification that needs eyes. It can drive
a headless Chrome to check its own frontend work instead of asking me to
look.

**Cloud sessions** run the same agent on a hosted machine, detached from
my laptop. I use them for well-scoped tasks I can describe in a
paragraph, often filed from a phone. They push branches under my account
and the result is a PR waiting when I'm back.

**CI agents** live in GitHub Actions, in every repo. Two workflows:

- An **interactive responder**. I open an issue describing a change and
  tag `@claude`; an agent checks out the repo, does the work, pushes a
  `claude/` branch, and posts a "create PR" link. It cannot touch `main`
  — a branch ruleset requires a pull request for everything, and the
  agent holds no bypass.
- An **automatic reviewer**. Every PR — mine or an agent's — gets one
  review from a strong model before I look at it, checking both bugs and
  compliance with the repo's rules. It has caught real bugs in code that
  another agent wrote the same day.

A human merges everything, everywhere. That is the one rule that never
bends, and it is enforced by branch protection rather than by trust.

## The pieces that make agents useful

The agents themselves are a commodity; the leverage is in what they're
given to work with. Four things, all committed to the repo:

**A contract: `CLAUDE.md`.** Every repo carries one file stating how work
ships here: branch-and-PR discipline, what a merge triggers, project
hard rules, domain gotchas. Local, cloud, and CI agents all read it. Mine
are layered: a standard block shared by all repos, and a `## Project`
section the repo owns forever — more on that split below.

**Committed memory: `docs/memory/`.** An index plus one small fact file
per hard-won lesson ("this service worker caches aggressively, bump the
version"; "this failure signature means the token, not the code").
Agents read the index before nontrivial work and append new facts in the
same PR as the fix. Because it's in the repo, a cloud agent on a fresh
machine knows what my laptop session learned last week. Machine state
carries nothing; the repo carries everything.

**Process skills.** Reusable playbooks (debugging discipline, review
checklists, release flow, incident response for the agents themselves)
packaged as a plugin that every session loads. Skills update centrally
and reach all repos at once — no copying.

**Model routing.** Not every task deserves the expensive model. Cheap
models transcribe fully-specified plans, mid-tier models handle judgment
and fixes and the interactive responder (turn-capped as a circuit
breaker), and the strongest models do research, design, and the
once-per-PR review, where depth pays. The routing policy is itself a
skill, so every agent knows it.

## What actually changed

The honest version, not the demo version:

- **Small, well-specified work leaves my plate entirely.** "Add the
  Firefox store link to the README" is an issue I file in thirty
  seconds; a reviewed PR exists minutes later. The bar for delegation is
  "can I specify it in a paragraph" — anything with real unknowns stays
  in a local session where I'm in the loop.
- **Review is no longer something I schedule.** Every PR arrives
  pre-reviewed. I still read the diff, but I read it after a strong
  model already flagged the obvious and the subtle. As a solo
  consultant, that's the closest thing to a second pair of senior eyes
  on everything.
- **Knowledge stops evaporating.** The memory convention sounds trivial
  and is the piece I'd defend hardest. Sessions end, context windows
  fill, machines differ — but the fact files accumulate, and every agent
  type reads them.
- **I merge more and type less.** My recurring interaction with most
  changes is reading a diff and clicking merge. The judgment work —
  what to build, whether it's right, whether it ships — stays mine.

## Why it became a factory

All of the above is roughly ten files of configuration per repository:
two workflows with the right permissions and model pins, settings wiring
for the plugin, the CLAUDE.md contract, the memory index, a secret, an
app installation, a branch ruleset. The first repo, you write by hand.
The second repo, you copy from the first — and now you have drift. The
third repo, the copies disagree in ways nobody notices, because
misconfigured agent pipelines don't fail loudly; they
[fail silently]({{< relref "ai-agents-in-ci-silent-failures" >}}).

I've spent years building internal platforms and CI at scale, and this
is the same problem shape: shared configuration that must stay
consistent across many consumers, evolve centrally, and never destroy
local customization. So it got the same treatment, as a public repo:

- **One command stamps a repo** — new or existing. Existing content is
  never overwritten: the CLAUDE.md standard block is marker-fenced, and
  everything outside the markers belongs to the repo forever. Setup ends
  with a mandatory smoke test: file a trivial issue, watch the full
  issue → branch → PR → review loop complete once. A pipeline that has
  never completed one loop is not set up.
- **Skills update everywhere at once** (they load from the plugin
  marketplace at session start); **templates are versioned snapshots**
  per repo, with a machine-readable version stamp.
- **Updates propagate as PRs.** When the standard changes, a workflow
  finds stale repos by their stamp and files each one an update task —
  addressed to that repo's own CI agent, which prepares the PR. I keep
  the merge button; the toil is gone.
- **A validation suite guards the whole thing**, and the repo dogfoods
  its own templates, so the standard can't silently drift from what it
  stamps.

None of the mechanism is exotic — it composes official Claude Code
features (the GitHub Action, plugins, skills, CLAUDE.md). Plenty of
public templates wire up something similar. What I wanted, and couldn't
fork from anywhere, was the *platform* semantics: versioned, validated,
propagated, with ownership boundaries that survive updates. That's
[ai-factory](https://github.com/onurcelep/ai-factory) — opinionated,
maintained, and forkable (one script repoints it at your own GitHub
user, and the reasoning behind every default is written down).

## The costs, honestly

- **It runs on a subscription**, and heavy agent use consumes it. Model
  routing exists precisely because sending everything to the strongest
  model is neither necessary nor cheap.
- **Reviews take minutes, not seconds** — a thorough model review of a
  large diff runs 10+ minutes. Worth it once per PR; you wouldn't want
  it per keystroke.
- **It's a single-vendor bet.** I consolidated on one ecosystem
  deliberately: the integration surface (action + plugins + skills +
  memory conventions) is where the value lives, and splitting it across
  vendors would halve the leverage. The committed artifacts — rules,
  memory, workflows — are plain text and would port.
- **The reliability work is real.** Agents in CI fail in ways dashboards
  don't show, and the guardrails for that had to be earned —
  [that story is part two]({{< relref "ai-agents-in-ci-silent-failures" >}}).

## Where to start

Not with the factory. Start with one repo: a `CLAUDE.md` that states how
work ships, the two workflows, branch protection, and the smoke test.
Live with it for a week; let the review gate and the memory convention
prove themselves. The factory step only makes sense when the second and
third repo make you copy files — but when that day comes, you'll want
the platform treatment from the start:
[github.com/onurcelep/ai-factory](https://github.com/onurcelep/ai-factory).
