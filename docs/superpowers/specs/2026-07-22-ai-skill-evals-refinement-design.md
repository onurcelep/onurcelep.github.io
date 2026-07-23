# Design: ai-skill-evals post refinement

Date: 2026-07-22
Status: approved (interactive brainstorm, 2026-07-22)

## Problem

The published post `content/posts/ai-skill-evals.md` is hard to digest for
readers who don't already work with AI agents: dense prose, undefined
jargon (skills, evals, routing, behavioral tier, trace grading), and no
visuals. The value of the work is buried.

## Decisions

- **Audience**: AI-curious developers who do not run agents themselves.
  Every AI term gets a plain-language gloss or analogy on first use.
  Anchor analogy, promoted to the front: skills are code whose
  interpreter is a language model, so they need tests like code does.
- **Length**: similar (~1,500-1,700 words), restructured for
  scannability. Nothing of substance cut: all facts, numbers (20/21,
  sixth of seven, five iterations), verbatim grader quote, git command,
  and links survive.
- **Visuals**: three diagrams using the existing `{{< diagram >}}`
  shortcode (no new CSS or layout work, consistent with the
  how-i-work-with-ai-agents post):
  1. After the intro: skill lifecycle (rule written as markdown ->
     loaded into context -> agent acts) with the two silent failure
     points marked.
  2. In the tiers section, alongside the kept table: the three-tier
     eval pipeline with cost labels.
  3. In the loophole section: the local-merge story from rule to
     regression test.
- **Style**: plain ASCII punctuation (no em/en dashes, curly quotes,
  ellipsis), matching the how-I-work post's refinement pass.

## Verification

`hugo server -D` (or `hugo --minify` build) renders the post; visually
check all three diagrams in light and dark mode before committing.
