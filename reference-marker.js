/* Reference implementation for the content package.
 * Another Codex may port this logic, but the regression behaviour must remain.
 */
(function (root) {
  function normalise(value, options = {}) {
    let text = String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘]/g, "'")
      .replace(/[–—]/g, '-')
      .toLowerCase()
      .trim()
      .replace(/\s*\/\s*/g, ' / ')
      .replace(/[.,!?;:]+/g, ' ')
      .replace(/\s+/g, ' ');
    if (options.terminalPunctuation !== false) {
      text = text.replace(/[\s.,!?;:]+$/g, '').trim();
    }
    return text;
  }

  function surfaceNormalise(value) {
    return String(value ?? '')
      .replace(/[’‘]/g, "'")
      .toLowerCase()
      .trim()
      .replace(/\s*\/\s*/g, ' / ')
      .replace(/[.,!?;:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function exactOrEquivalent(marking, input) {
    const got = normalise(input);
    const accepted = (marking.accepted || []).map(normalise);
    const correct = accepted.includes(got);
    const accentOnly = correct && !(marking.accepted || []).map(surfaceNormalise).includes(surfaceNormalise(input));
    return { correct, accentOnly, missing: [], unexpected: correct ? [] : [String(input).trim()] };
  }

  function splitItems(input) {
    return String(input ?? '')
      .replace(/\r/g, '\n')
      .split(/\s*(?:,|\/|;|\n|\band\b|\bet\b)\s*/i)
      .map(x => x.trim())
      .filter(Boolean);
  }

  function unorderedGroups(marking, input) {
    const pieces = splitItems(input);
    const unused = pieces.map((raw, index) => ({ raw, value: normalise(raw), index, used: false }));
    const missing = [];
    for (const group of marking.requiredGroups || []) {
      const accepted = (group.accepted || []).map(normalise);
      const match = unused.find(item => !item.used && accepted.includes(item.value));
      if (match) match.used = true;
      else missing.push(group.label);
    }
    const unexpected = unused.filter(item => !item.used).map(item => item.raw);
    return { correct: missing.length === 0 && unexpected.length === 0, accentOnly: false, missing, unexpected };
  }

  function sentenceComponents(marking, input) {
    const got = ` ${normalise(input)} `;
    const missing = [];
    for (const group of marking.requiredGroups || []) {
      const found = (group.accepted || []).some(answer => got.includes(` ${normalise(answer)} `));
      if (!found) missing.push(group.label);
    }
    return { correct: missing.length === 0, accentOnly: false, missing, unexpected: [] };
  }

  function mark(marking, input, selectedOption) {
    switch (marking.mode) {
      case 'choice':
        return { correct: normalise(selectedOption) === normalise(marking.correctOption), accentOnly: false, missing: [], unexpected: [] };
      case 'exact_or_equivalent':
      case 'one_of_complete_examples':
        return exactOrEquivalent(marking, input);
      case 'unordered_required_groups':
        return unorderedGroups(marking, input);
      case 'sentence_components':
        return sentenceComponents(marking, input);
      case 'manual_atomic_split_required':
        return { correct: null, reviewNeeded: true, accentOnly: false, missing: [], unexpected: [] };
      default:
        throw new Error(`Unsupported marking mode: ${marking.mode}`);
    }
  }

  const api = { normalise, splitItems, mark };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FrenchReferenceMarker = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
