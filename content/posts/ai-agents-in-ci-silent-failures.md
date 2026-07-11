+++
title = "The green check that did nothing: a postmortem of AI agents in CI"
date = 2026-07-11
description = "My AI code reviewer reported success for a day while doing no work at all. A four-layer postmortem: what failed, what I misdiagnosed, and the platform guardrails that make the whole class of failure impossible to miss again."
keywords = ["ai agents ci", "claude code github action", "ai code review pipeline", "llm agents devops", "ci postmortem", "silent failure", "ai platform engineering", "github actions ai"]
tags = ["ai", "ci-cd", "platform-engineering", "postmortem", "github-actions"]
draft = false
+++

I run AI coding agents in CI across my repositories. The loop looks like
this: I open a GitHub issue describing a change and tag the agent; it reads
the repo, makes the change on a branch, and hands me a pull request. A
second agent reviews every PR automatically before I look at it. A human
merges everything. The setup is stamped from a single template repo
([ai-factory](https://github.com/onurcelep/ai-factory)) so all my projects
run the same configuration.

One morning I filed a small, well-specified task and got back a comment:
*"I'll analyze this and get back to you."* Then nothing. The workflow run:
green. The PR review check on another repo: also green, with no review
posted. Everything reported success, and nothing had done any work.

This is a postmortem of that day. It turned out to be **four independent
failures stacked behind one symptom**, and I misdiagnosed the first one
publicly before getting it right. I'm writing it up because every team
adopting AI agents in CI will eventually meet some version of this, and
the fixes generalize: they're platform engineering, not prompt
engineering.

## The symptom: success theater

The failing runs shared one signature, visible in the run log's result
JSON:

```json
{
  "type": "result",
  "subtype": "success",
  "is_error": true,
  "duration_ms": 2186,
  "num_turns": 1,
  "total_cost_usd": 0
}
```

Read that carefully: `subtype: "success"`, `is_error: true`, one turn, two
seconds, zero dollars. The agent died on its very first model call — and
the GitHub check still rendered **green**. A required "AI review" gate
that is green regardless of whether the review ran is worse than no gate:
it's a false positive you've wired into your merge process.

That's lesson zero, and it applies to any agent-in-CI product you use:
**never let the check color be your health signal.** The honest signals
are the run's turn count and cost, and the presence of the artifact you
expected — a pushed branch, a posted review. A one-turn zero-cost run did
nothing, whatever the dashboard says.

## Layer 1: a dead credential, and a detour I earned

The real error text was hidden by default (the action suppresses model
output in logs "for security"). So I did what people do with partial
information: I found a correlation. The action's floating version tag had
moved overnight; the last good run used the old build, every bad run used
the new one. Case closed — I pinned the old version across three repos and
wrote up the "regression".

The pinned build failed identically two minutes later.

The correlation was real; the inference was garbage. There had been **no
runs at all in the 22-hour window** between last-good and first-bad, so
*every* variable that changed in that window was an equally valid suspect.
A bisection is only evidence when the timeline is dense. What had actually
changed, silently, in the same window: the repo's OAuth token had gone
bad.

What finally cut through was not archaeology but a **discriminating
experiment**: the same credential was configured in a sibling repo, so I
filed a trivial "reply pong" issue there. It answered in eight seconds.
Same token value, same workflow config, different repo — that one run
isolated the failure to the repo, and after a proper rotation, to the
token itself. Ten minutes of controlled experiment beat two hours of log
reading, and it would have beaten them harder if I'd run it *first*.

One trap worth naming, because it will bite anyone verifying credentials
for a CLI-based agent: the obvious local check

```bash
CLAUDE_CODE_OAUTH_TOKEN='<new token>' claude -p "say ok"
```

**passes with any garbage value**, because the CLI silently prefers the
credentials in your OS keychain over the environment variable. I only
noticed when a deliberately wrong token also printed "ok". A verification
step that cannot fail is worse than none, because it launders confidence.
Credentials for CI get verified *in CI*, full stop.

## Layer 2: the cap that killed a healthy run

With a working token and the log output finally surfaced (one merged line
of config: `show_full_output: true`), the next run failed honestly:
`error_max_turns`. The agent had been given a budget of 10 reasoning
turns; a realistic implement-and-open-a-PR task needs 15–25. It had done
the work — read the files, made correct edits — and hit the ceiling
before it could push.

Turn caps are the right idea (they're a circuit breaker against runaway
runs), but a cap below the task's natural cost converts every real task
into a guaranteed failure. Worse, in my case the too-small number lived in
the *template* that stamps every repo, so the failure was fleet-wide by
construction. Budget circuit breakers for roughly twice a realistic heavy
run, not for the demo task you tested with.

## Layer 3: the assumption nobody had ever tested

Next honest failure: the agent finished its work and died at `git push`
with a 403. This one had been latent since day one. The GitHub App that
powers the agent posts *comments* with its own token, but pushes branches
with the **workflow's token** — and my stamped workflows granted that
token read-only contents. Result: every "the agent will open a PR for
you" promise in my own documentation had never once been true. All the
agent-authored branches in my history had come from a different execution
path (cloud sessions running under my account), which made the broken
path look proven when it had simply never run.

The lesson isn't about GitHub token plumbing, it's this: **an advertised
capability that has never been exercised end to end is not a capability;
it's a hypothesis.** The fix is one boring sentence in my setup checklist
now: after wiring any agent pipeline, run one full loop — issue, agent,
branch, PR, review — before declaring it operational. That single smoke
test, run on installation day, would have surfaced layers two and three
immediately and the token issue the first time it recurred.

## Layer 4: the guarantee that was an accident

Fixing layer 3 meant granting the workflows write permissions, and that
exposed a design smell: my "the agent can never push to `main`" guarantee
had been enforced *by the same broken permission* that prevented it from
pushing anywhere at all. Fix the bug, lose the guarantee.

Safety properties that fall out of a misconfiguration disappear when the
misconfiguration is fixed. If the property matters, enforce it on
purpose: `main` now has a branch ruleset requiring a pull request for
everything, with the agent holding no bypass. The agent physically cannot
touch `main`; I merely review and merge. The guarantee survived the fix
only because it stopped being an accident.

## What I institutionalized

A postmortem that ends in a document nobody reads is a ritual. Every
lesson above now lives somewhere that *triggers*:

- **A playbook in the agents' own context.** The diagnosis order (surface
  the error, suspect credentials first, run a cross-repo discriminator,
  distrust gap-correlations), the health signals, and the smoke-test
  procedure ship as a skill that loads into every agent session — local
  and CI — across all repos. The agent that debugs the next incident
  starts with this one's conclusions.
- **Seeded repo memory.** Each repo carries a short fact file describing
  the silent-failure signature and what to do, indexed where agents look
  before nontrivial work. New repos are born with it.
- **A mandatory smoke test in the setup procedure.** "A pipeline that has
  never completed one loop is not set up" is now a checklist item, not a
  war story.
- **Version-stamped configuration with automatic propagation.** Every
  stamped repo carries a machine-readable version marker; when the
  standard changes, a workflow finds stale repos and files each one an
  update task — addressed to the agent, which prepares the PR. Humans
  keep the merge button and lose the toil.

The epilogue makes the point better than I can: the *first* automated
review to run on the propagation workflow itself caught a real bug in my
shell — a `set -e` pipeline that would have aborted the fleet update on
exactly the repos that needed it most. The pipeline I had spent the day
repairing paid for the repair before the day ended.

## If you're adopting AI agents in CI

The compressed version, from one incident but I'd bet on its generality:

1. **Define agent health as artifacts, not check colors.** Turn count,
   cost, and "did the PR/review actually appear" are the signals. Alert
   on their absence.
2. **Make hidden errors visible before you fix anything**, and prefer one
   discriminating experiment over any amount of correlation.
3. **Verify credentials where they're used.** A local check that can't
   fail is negative information.
4. **Smoke-test the full loop on installation day**, and again after any
   change to tokens, permissions, or caps.
5. **Enforce safety properties explicitly.** If an agent must not touch
   `main`, write that as branch protection, not as a side effect of some
   other setting.
6. **Put the lessons where they load**, not where they're filed. Agents
   can carry their own operational playbooks; use that.

None of this is AI magic. It's the same discipline platform teams have
always applied to CI — applied to a new kind of unreliable, very
productive worker. The setup that came out the other side is public and
forkable: [ai-factory](https://github.com/onurcelep/ai-factory), one
command to stamp a repo, one merged PR at a time after that.
