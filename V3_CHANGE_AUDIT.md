# V3 change audit

## Confirmed problems in V2

- V2 had 1,502 questions, but 1,234 were simple vocabulary direction cards.
- Thin enabled sections included Section 1 (6), Section 10 (8), Section 17 (10), Section 18 (8), Section 20 (9), Section 22 (6), Section 29 (7), and Section 32 (7).
- Section 9 had no question bank at all.
- Direction was stored in metadata and was not guaranteed to appear inside the visible prompt.
- Several dated pools reached 50 only by borrowing old review items, not because the focus section itself was complete.

## V3 correction

- Every practice section now contains at least 50 enabled high-confidence questions of its own.
- Every prompt begins with a visible task label and repeats the instruction.
- New task families include cloze recall, conjugation, tense change, error correction, reading evidence, true/false, sentence-building, auxiliary identification and controlled translation.
- Compressed slash rows remain disabled for automatic marking unless they were replaced by precise atomic questions.
- The mixed assessment now has its own 60-item balanced pool.
- 32 detailed section notes and 27 detailed dated notes include rules, vocabulary, task instructions, worked examples, common mistakes and self-checks.
- The writing bank increased from 19 to 32 controlled 3- and 5-sentence tasks.

## Release gates

Run `node run_qa.mjs`. It checks the visible task contract, minimum section size, note depth, every enabled canonical answer, MCQ integrity, the reported `sont / ils sont / elles sont` case, unordered multi-answer input, accents, wrong base spelling, age with avoir and punctuation normalisation.
