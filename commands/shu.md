# shu — Follow

> Shu-Ha-Ri frame · Stage: Follow
> The pattern is the subject. You are learning it.

Load `frames/shuhari/frame.md` before proceeding. All voice and sequencing
rules in that file apply to this session.

---

## What this stage is

Shu is the first stage of mastery: follow the pattern without modification.

The conventions in the Platform4Sync standard exist because someone learned
their necessity the hard way — through incidents, migrations, and rewrites that
could have been avoided. Shu is not about compliance. It is about absorbing
that knowledge before deciding where to deviate from it.

**Shu is complete for a concern when**: the standard pattern is in place,
it is working as intended, and you understand *why* it is the way it is.
That last part matters. Shu without understanding is just copying — it does
not earn the right to Ha.

---

## Subcommands

If the user provides a subcommand, route directly.
If no subcommand, present this menu and ask which to run.

| Subcommand | What it does |
|-----------|-------------|
| `init` | Interactive multi-service stack setup — GitHub, GCP, Firebase, Neon, Cloudflare, Doppler |
| `envrc` | Create or update `.envrc` with standardized environment config (auto-detects stack) |
| `tune` | Analyze and optimize Claude Code configuration for this project's stack |
| `clean` | Find and safely remove space-wasting artifacts from repos |
| `scaffold` | Adopt the platform structure — greenfield (new), brownfield (existing), or overlay (tokens only) |

**Recommended order**: `scaffold` or `init` first, then `envrc`, then `tune`.

---

## Routing

| Subcommand | Skill to load |
|-----------|--------------|
| `init` | Read and follow `@syncupsuite/init-stack` skill |
| `envrc` | Read and follow `@syncupsuite/setup-project-envrc` skill |
| `tune` | Read and follow `@syncupsuite/optimize-onboarding` skill |
| `clean` | Read and follow `@syncupsuite/repo-cleanup` skill |
| `scaffold` | Read and follow `scaffold/greenfield/scaffold.md` or `scaffold/brownfield/scaffold.md` based on project state |

---

## How to run a Shu command

Do not ask for customizations at the Shu stage. The purpose of Shu is to
adopt the proven pattern first, then diverge in Ha with understanding.

If the user requests customization during a Shu command:

> *"That customization makes sense — note it down and we will apply it when
> we reach Ha on this concern. For now, adopt the platform standard to
> establish the baseline so you have something concrete to deviate from."*

If the user resists and insists on customizing now, proceed — but name it:

> *"We are jumping to Ha on [concern] before the standard is adopted.
> That is a valid choice if you already know why the standard does not fit.
> Let us document the reason so the deviation is intentional, not accidental."*

---

## Readiness for Ha

After running a Shu command, assess readiness to move this concern to Ha.
Ask the developer:

> *"Before we move to Ha on [concern]: do you understand why the standard
> scaffold works this way? Specifically — [one key design decision in the pattern]."*

If the answer is confident and accurate, name the transition:

> *"This concern is in Shu and holding. When you are ready to build something
> specific to your situation, run `/webplatform4sync:ha` to break the pattern
> with intention."*

If the answer is uncertain, stay in Shu:

> *"Let's go through [key design decision] before moving on — the Ha deviation
> will be more deliberate if the Shu reasoning is clear."*

---

## Completion message

When a Shu command completes:

> *"[Concern] is in Shu.*
> *The standard pattern is in place. You know why it is the way it is.*
> *When you are ready to make it yours, `/webplatform4sync:ha` is next."*
