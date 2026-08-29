export interface LiveTurnSnapshot {
  userText: string;
  assistantText: string;
}

export interface LiveTurnCommit {
  userText: string | undefined;
  assistantText: string | undefined;
  interrupted: boolean;
}

export interface LiveTurnAssembler {
  addUserTranscript(text: string): void;
  addModelTranscript(text: string): void;
  addModelText(text: string): void;
  snapshot(): LiveTurnSnapshot;
  complete(options?: { interrupted?: boolean }): LiveTurnCommit;
  reset(): void;
}

function normalizeChunk(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

function isOpeningPunctuation(text: string): boolean {
  return /^[,.;:!?%)\]}]/u.test(text);
}

function isClosingPunctuation(text: string): boolean {
  return /[([{]$/u.test(text);
}

function wordOverlap(previous: string, incoming: string): number {
  const previousWords = previous.split(' ');
  const incomingWords = incoming.split(' ');
  const maxOverlap = Math.min(previousWords.length, incomingWords.length);

  for (let count = maxOverlap; count > 0; count -= 1) {
    const previousSuffix = previousWords.slice(-count).join(' ');
    const incomingPrefix = incomingWords.slice(0, count).join(' ');
    if (previousSuffix === incomingPrefix) return count;
  }
  return 0;
}

function characterOverlap(previous: string, incoming: string): number {
  const maxOverlap = Math.min(previous.length, incoming.length);
  for (let count = maxOverlap; count >= 2; count -= 1) {
    if (previous.slice(-count) === incoming.slice(0, count)) return count;
  }
  return 0;
}

function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && /^[\p{L}\p{N}]$/u.test(character);
}

function isBoundaryAwarePrefix(longer: string, prefix: string): boolean {
  if (!longer.startsWith(prefix)) return false;
  if (longer.length === prefix.length) return true;
  return (
    !isWordCharacter(prefix.at(-1)) || !isWordCharacter(longer[prefix.length])
  );
}

/**
 * Merges either a provider delta or a cumulative provider snapshot.
 *
 * Provider transcript frames can repeat a complete prefix, repeat the last
 * word, or continue an arbitrary text fragment. The result is kept local to
 * the current turn and normalized only when it is exposed as a commit.
 */
export function mergeLiveTextChunks(
  previousText: string,
  incomingText: string,
): string {
  const incoming = normalizeChunk(incomingText);
  const previous = normalizeChunk(previousText);
  if (!previous) return incoming;
  if (!incoming) return previous;
  if (previous === incoming) return previous;

  // A cumulative frame replaces the previous shorter snapshot. A stale
  // shorter frame cannot remove text already received.
  if (isBoundaryAwarePrefix(incoming, previous)) return incoming;
  if (isBoundaryAwarePrefix(previous, incoming)) return previous;

  const overlappingWords = wordOverlap(previous, incoming);
  if (overlappingWords > 0) {
    return `${previous} ${incoming.split(' ').slice(overlappingWords).join(' ')}`.trim();
  }

  const overlappingCharacters = characterOverlap(previous, incoming);
  if (overlappingCharacters > 0) {
    return `${previous}${incoming.slice(overlappingCharacters)}`;
  }

  if (isOpeningPunctuation(incoming) || isClosingPunctuation(previous)) {
    return `${previous}${incoming}`;
  }
  return `${previous} ${incoming}`;
}

export function createLiveTurnAssembler(): LiveTurnAssembler {
  let userTranscript = '';
  let modelTranscript = '';
  let modelText = '';

  const snapshot = (): LiveTurnSnapshot => ({
    userText: userTranscript,
    assistantText: modelTranscript || modelText,
  });

  return {
    addUserTranscript(text: string): void {
      userTranscript = mergeLiveTextChunks(userTranscript, text);
    },

    addModelTranscript(text: string): void {
      modelTranscript = mergeLiveTextChunks(modelTranscript, text);
    },

    addModelText(text: string): void {
      modelText = mergeLiveTextChunks(modelText, text);
    },

    snapshot,

    complete(options?: { interrupted?: boolean }): LiveTurnCommit {
      const current = snapshot();
      const commit: LiveTurnCommit = {
        userText: current.userText || undefined,
        assistantText: current.assistantText || undefined,
        interrupted: Boolean(options?.interrupted),
      };
      userTranscript = '';
      modelTranscript = '';
      modelText = '';
      return commit;
    },

    reset(): void {
      userTranscript = '';
      modelTranscript = '';
      modelText = '';
    },
  };
}
