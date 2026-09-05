# Source and content audit

## Authoritative learned-content source

- File: `Year8_French_COMPLETE_Teacher_Coverage_Final(6).docx`
- Parent confirmation: all French content in this file has been learned.
- Tables: 116
- Extracted-text SHA comparison: identical to the coverage copy previously used by the V1 generator.
- Binary SHA-256 of the newly supplied file: `ebbe9078a2372b94c4d5a425d0dd3251369325383aed16bd3f5b801e7abb68af`

The source contains Sections 1–33, including items labelled extension/light exposure/supplementary. Because the parent explicitly identified the whole document as learned content, those labels describe the source section; they are not grounds for exclusion.

## Original teaching-file cross-checks available

- `Y8 U3 S1 Décris ton école COVER 26(1).pdf`
- `Y8 U3 S2 Matières Cover version(1).pdf`
- `Y8 U3 S5 Qu'est-ce que tu as fait au collège hier _(1).pptx`
- `Dans mon sac WS ANSWERS(1).pdf`

These were used to cross-check school description, subjects/opinions, school activities, reflexive/passé composé forms, numbers and classroom-object language. The coverage document remains the inclusion boundary.

## Main defects found in the old bank

1. **Cell-only conjugation marking.** A question expecting `sont` rejected `Ils sont/Elles sont`. The new schema accepts bare form, either subject + form, or both subjects + forms.
2. **Compressed slash rows treated as exact strings.** Phrase-bank rows such as `un orchestre / une chorale` could cause a correct single alternative to be rejected. They are preserved as learned vocabulary but removed from strict automatic marking until atomised.
3. **Parenthetical English labels treated as mandatory.** `under` could be rejected when the display said `under (position)`. Parenthetical glosses are now optional for scoring.
4. **Full-sentence translations compared too literally.** Controlled translations now use labelled required components where available; other medium-confidence sentence items must not produce a hard wrong result.
5. **Writing model treated too much like a single answer.** Writing is now criterion-based.
6. **Notes too short.** Every dated block now includes rules, a must-memorise vocabulary list, worked examples, common mistakes, a 60-second check and a pre-practice routine.

## Content corrections/flags

- The source row `quel est / qui est → which is` compresses two different grammatical jobs. Test them contextually: `quel est` is an interrogative “what/which is”, while `qui est` can be “who is” or relative “which is” depending on the sentence.
- A legacy writing requirement contained `calculateurs`; the learned classroom word is `calculatrices`. Do not accept or teach `calculateurs` for “calculators”.
- Accents are not deducted because of the learner’s keyboard constraint, but the app must continue to show the correct accented spelling.

## Inclusion rule for another Codex

No word or structure may be invented to increase question count. New questions may only recombine vocabulary and grammar already present in the authoritative document, and every generated item must carry a section reference and an explicit marking schema.
