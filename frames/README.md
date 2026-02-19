# Frames

A **frame** is a named mental model applied to the full Platform4Sync skill surface.

**Same tools. Different approaches.**

Frames change: command names, stage groupings, instructional voice, help text.
Frames do not change: underlying skill logic, generated templates, validation rules, stack conventions.

## Available frames

| Frame | Stages | Philosophy |
|-------|--------|-----------|
| **Construction** | site → pour → frame → wire → finish | Physical build sequence. Hard dependencies. What gets built and in what order. |
| **Shu-Ha-Ri** | shu → ha → ri | Mastery progression. Your relationship to the pattern, not what you're building. |

## Activation

Frames activate on the first bare-stage command. No configuration required.

```bash
/webplatform4sync:site      # activates Construction frame, runs onboard wizard
/webplatform4sync:shu       # activates Shu-Ha-Ri frame, runs onboard wizard
```

On subsequent runs, Claude detects the active frame from `.claude/frame` in the project root.

## Frame files

Each frame directory contains three files:

```
frames/<name>/
├── frame.json    # command → skill routing manifest
├── frame.md      # Claude activation prompt + language guide
└── onboard.md    # first-run wizard instructions
```

`frame.md` is the critical file. It is the prompt Claude loads when a frame is active.
It defines the voice, stage model, routing table, and sequencing rules for the session.
