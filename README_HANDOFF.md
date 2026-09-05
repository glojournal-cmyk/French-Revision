# French Content Core V3 — Codex handoff

This package is the content and marking layer. It does not redesign the PWA.

## Non-negotiable source boundary

Use only the parent-confirmed `Year8_French_COMPLETE_Teacher_Coverage_Final(6).docx`. Do not add outside vocabulary or grammar.

## Required consumption

1. Load `question-bank.json`; ordinary practice uses only `enabledByDefault: true`.
2. Display `task.label`, `task.instruction` and `task.answerFormat` on every card. Do not hide the direction in metadata.
3. Display the complete `notes-by-section.json` note before a lesson and `notes-by-date.json` before dated revision.
4. Balance session selection by task label. A 15-question session must not contain more than 6 cards with the same label and should contain at least 4 different task labels when available.
5. Use `block-question-map.json` for dated pools.
6. Use checklist scoring for `writing-bank.json`; models are examples, not the only correct answers.
7. Show `explanation.breakdown`, `commonError` and `remember` after every answer.

## Marking

Retain the V2 normalisation and multi-answer behaviour. Accents are corrected but not deducted. Base spelling, articles, agreement, verb person, auxiliary, tense and negative order remain marked. Bare verb and correct subject+verb are both accepted on conjugation cards when stated. Never auto-mark `manual_atomic_split_required` rows.

## Key files

- `question-bank.json`: expanded questions with self-contained instructions.
- `vocab-bank.json`: 617 verified source rows.
- `notes-by-section.json`: detailed lesson notes for the page shown before practice.
- `notes-by-date.json`: detailed dated-block preparation.
- `writing-bank.json`: 3- and 5-sentence controlled writing.
- `qa-report.json`: release checks and counts.
- `BANK_SUMMARY.md`: section-by-section audit.

Do not regenerate or paraphrase the content during UI integration.
