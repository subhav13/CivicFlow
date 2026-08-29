export type ConfirmationReply =
  | { kind: 'affirmative' }
  | { kind: 'revision'; text: string }
  | { kind: 'interim' };

const MAX_REVISION_TEXT_LENGTH = 240;

const CLEAR_AFFIRMATIVES = new Set([
  'yes',
  'yeah',
  'yep',
  'yup',
  'ok',
  'okay',
  'confirm',
  'confirmed',
  'approve',
  'approved',
  'proceed',
  'go ahead',
  'do it',
  'please do',
  'yes please',
  "that's correct",
  'that is correct',
  'looks correct',
  'looks good',
  'everything looks correct',
  'everything is correct',
  'everything is right',
  'all details are correct',
  'all information is correct',
  'everything looks good',
  'add these details',
  'apply these details',
  'save these details',
  'add it',
]);

const NATURAL_APPROVAL_ACTIONS = new Set([
  'add these details',
  'apply these details',
  'save these details',
  'add it',
  'do it',
  'go ahead',
  'proceed',
  'confirm',
  'confirmed',
  'approve',
  'approved',
  'ok',
  'okay',
  'please',
  'please do',
]);

const AFFIRMATIVE_PREFIX_PATTERN = /^(?:yes|yeah|yep|yup)(?:,\s*|\s+)(.+)$/;
const NATURAL_CORRECTNESS_PATTERN =
  /^(?:(?:this|that|it)(?: is|'s) (?:correct|right|good)|everything (?:is|looks) (?:correct|right|good)|(?:correct|right))(?:,\s*(?:please\s+)?add it)?$/;
const FIRST_PERSON_APPROVAL_PATTERN =
  /^(?:i (?:confirm|approve)|i(?:'ve| have) (?:confirmed|approved))(?: (?:these|the) (?:details|information))?(?:(?:\s*[,.;]\s*|\s+)(?:please\s+)?(?:add(?:ed)? it|do it|go ahead|proceed|confirm))?$/;
const QUESTION_START_PATTERN =
  /^(?:(?:am|are|can|could|did|does|has|have|is|may|might|shall|should|was|were|will|would)\s+(?:i|you|we|they|he|she|it|this|that|there)\b|do\s+(?:i|you|we|they|he|she)\b|(?:what|when|where|which|who|why|how)\b)/;

function normalize(value: string): string {
  return value
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .trim()
    .replace(/[.,!;:]+$/g, '')
    .replace(/\s+/g, ' ');
}

function containsCorrectionLanguage(value: string): boolean {
  return (
    /\bno\b/.test(value) ||
    /\bnot\b/.test(value) ||
    /\b(?:incorrect|wrong|don't|do not|never|but|instead|actually|change|correction|remove|cancel|skip)\b/.test(
      value,
    )
  );
}

function containsQuestionLanguage(value: string): boolean {
  return value.includes('?') || QUESTION_START_PATTERN.test(value);
}

function isClearAffirmative(value: string): boolean {
  if (
    CLEAR_AFFIRMATIVES.has(value) ||
    NATURAL_CORRECTNESS_PATTERN.test(value) ||
    FIRST_PERSON_APPROVAL_PATTERN.test(value)
  ) {
    return true;
  }

  const prefixMatch = value.match(AFFIRMATIVE_PREFIX_PATTERN);
  if (!prefixMatch) return false;

  const remainder = prefixMatch[1];
  return (
    NATURAL_APPROVAL_ACTIONS.has(remainder) ||
    /^(?:please\s+)?(?:add it|do it|go ahead|proceed|confirm(?:ed)?|approve(?:d)?)$/.test(
      remainder,
    ) ||
    NATURAL_CORRECTNESS_PATTERN.test(remainder)
  );
}

function boundedRevisionText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_REVISION_TEXT_LENGTH);
}

export function classifyConfirmationReply(
  text: string,
  options: { final: boolean },
): ConfirmationReply {
  if (!options.final) return { kind: 'interim' };

  const normalized = normalize(text);
  if (
    containsCorrectionLanguage(normalized) ||
    containsQuestionLanguage(normalized)
  ) {
    return { kind: 'revision', text: boundedRevisionText(text) };
  }

  if (isClearAffirmative(normalized)) return { kind: 'affirmative' };

  return { kind: 'revision', text: boundedRevisionText(text) };
}
