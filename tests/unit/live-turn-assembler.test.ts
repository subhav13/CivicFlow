import { describe, expect, it } from 'vitest';

import {
  createLiveTurnAssembler,
  mergeLiveTextChunks,
} from '../../src/assistant/live-turn-assembler';

describe('live turn assembler', () => {
  it('commits fragmented output transcription without finished as one assistant turn', () => {
    const assembler = createLiveTurnAssembler();

    assembler.addModelTranscript('Your application ');
    assembler.addModelTranscript('is ready to review.');

    expect(assembler.complete()).toEqual({
      userText: undefined,
      assistantText: 'Your application is ready to review.',
      interrupted: false,
    });
  });

  it('merges delta and cumulative transcript chunks without duplicate words', () => {
    const assembler = createLiveTurnAssembler();

    assembler.addUserTranscript('I need');
    assembler.addUserTranscript('I need help');
    assembler.addUserTranscript('help with income');

    expect(assembler.complete()).toEqual({
      userText: 'I need help with income',
      assistantText: undefined,
      interrupted: false,
    });
  });

  it('keeps ordinary short words separated across fragmented model output', () => {
    const first = mergeLiveTextChunks('Your', 'is');

    expect(first).toBe('Your is');
    expect(mergeLiveTextChunks(first, 'ready.')).toBe('Your is ready.');
  });

  it('does not drop a one-letter word when the next fragment is a new word', () => {
    expect(mergeLiveTextChunks('I', 'income')).toBe('I income');
    expect(mergeLiveTextChunks('I', 'Income')).toBe('I Income');
  });

  it('uses output transcription over model text fallback for one assistant message', () => {
    const assembler = createLiveTurnAssembler();

    assembler.addModelText('Checking your application.');
    assembler.addModelTranscript('I am checking your application.');

    expect(assembler.complete()).toEqual({
      userText: undefined,
      assistantText: 'I am checking your application.',
      interrupted: false,
    });
  });

  it('keeps one normalized partial assistant message for an interrupted response', () => {
    const assembler = createLiveTurnAssembler();

    assembler.addModelText('  I found the next step  ');

    expect(assembler.complete({ interrupted: true })).toEqual({
      userText: undefined,
      assistantText: 'I found the next step',
      interrupted: true,
    });
  });

  it('clears all current-turn buffers on reset', () => {
    const assembler = createLiveTurnAssembler();
    assembler.addUserTranscript('Sensitive user turn');
    assembler.addModelTranscript('Sensitive assistant turn');

    assembler.reset();

    expect(assembler.snapshot()).toEqual({
      userText: '',
      assistantText: '',
    });
    expect(assembler.complete()).toEqual({
      userText: undefined,
      assistantText: undefined,
      interrupted: false,
    });
  });
});
