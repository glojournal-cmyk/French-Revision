# Marking specification

## 1. Normalisation allowed for every typed answer

Before comparing, the marker may:

- ignore upper/lower case;
- trim leading/trailing spaces and collapse repeated spaces;
- treat straight and curly apostrophes as the same;
- ignore terminal full stops, commas, question marks and exclamation marks;
- ignore French diacritics for the score (`é/è/ê/ë`, `à/â`, `ç`, `î/ï`, `ô`, `ù/û/ü`), while still displaying the correct accented form as feedback.

It must **not** ignore:

- different base letters (`joué` is not `joui`);
- a missing or wrong article where the article is part of the tested chunk;
- singular/plural differences required by the prompt;
- the wrong subject or conjugated ending;
- the wrong auxiliary;
- missing reflexive pronouns;
- wrong negative structure;
- required agreement in a full sentence.

## 2. Marking modes

### `exact_or_equivalent`

Correct when the normalised response equals any item in `marking.accepted`.

Parenthetical glosses are optional. For example, if the stored English is `under (position)`, both `under` and `under (position)` are accepted.

### `choice`

Compare the selected option with `marking.correctOption`. Do not send a displayed label through free-text marking.

### `one_of_complete_examples`

The prompt asks for one taught example. Any one complete example in `marking.accepted` is enough. Do not require every slash-separated example.

### `unordered_required_groups`

Used when the prompt explicitly asks for two or three separate answers.

- Accept any order.
- Accept comma, slash, semicolon, `and`, `et`, or a newline as separators.
- Ignore case, extra spaces and terminal punctuation.
- Every required group must be present once; duplicates do not replace a missing group.
- If incomplete, return labels such as `Missing: nous → sommes`.
- If an extra unrecognised item is present, report it separately rather than hiding the missing item.

### `sentence_components`

Used for controlled full-sentence translation.

- Every `requiredGroup` represents a meaning or grammar job.
- Alternatives inside a group are OR choices.
- Groups may appear in normal French order variations.
- Words inside a fixed grammar chunk must retain their relationship: e.g. `n’avons rien écrit`, `je me suis réveillée`, `il n’y a pas d’internat`.
- Score correct only when every required group is present.
- Report the exact missing label, not merely `Wrong`.
- Do not reject a valid alternative already listed in a group.

### `manual_atomic_split_required`

Never show this legacy item in automatically scored practice. The row contains several compressed alternatives and must first become separate atomic cards.

## 3. Conjugation questions

If a prompt names a subject but the table cell contains only the verb, accept either:

- the bare verb form; or
- the correct subject plus verb form.

For a combined subject label such as `ils / elles`, accept either subject or both. This is the direct fix for the reported `Ils sont/Elles sont` false negative.

## 4. Multi-answer questions

Only use “all three required” when the wording explicitly asks for three forms/items. A slash in a vocabulary table often means alternatives, not three required answers. Never infer the scoring rule from punctuation alone; use the question’s `marking.mode`.

## 5. Writing tasks

Three-to-five-sentence writing must use a criterion checklist.

- The model is an example, not the only accepted composition.
- Report each requirement as met/missing.
- Give an accent reminder without deducting it.
- Count separately punctuated sentences; a comma or `and/et` does not automatically create a new sentence.
- Check grammar structures only when the task requires them.
- If the automatic checker cannot judge an otherwise plausible sentence, return `needs teacher/parent review`, not `wrong`.

## 6. Feedback format

After each answer, show:

1. result (`Correct`, `Nearly correct — accents`, `Needs repair`, or `Review needed`);
2. learner answer;
3. accepted answer(s);
4. `explanation.breakdown` in order;
5. exact missing/incorrect element;
6. `explanation.remember`;
7. when the item will return in spaced review.

Do not display “Accepted source answer: sont” after rejecting `Ils sont/Elles sont`; that input is correct under this specification.



## 7. Visible task contract (V3)

The app must show `task.label`, `task.instruction` and `task.answerFormat`. The prompt also repeats the task label and instruction so it remains unambiguous if the UI omits a badge. Never display a bare French/English stimulus without its direction.

## 8. Session balance (V3)

When a section offers several labels, sample at least four different task labels in a 15-question session. Do not fill a session with one repeated template merely because that group is larger.
