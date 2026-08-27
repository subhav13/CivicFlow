import { createDemoApplicationSeed } from '../domain';
import {
  APPLICATION_STORAGE_KEY,
  loadApplication,
  saveApplication,
  type StorageLike,
} from './persistence';

class FakeStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getCalls = 0;
  setCalls = 0;
  readError: Error | null = null;
  writeError: Error | null = null;

  getItem(key: string): string | null {
    this.getCalls += 1;
    if (this.readError) throw this.readError;
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.setCalls += 1;
    if (this.writeError) throw this.writeError;
    this.values.set(key, value);
  }
}

describe('application persistence', () => {
  it('uses the fixed key and persists only a validated application state', () => {
    const storage = new FakeStorage();
    const application = createDemoApplicationSeed();

    expect(saveApplication(storage, application)).toEqual({ status: 'saved' });
    expect(storage.values.has(APPLICATION_STORAGE_KEY)).toBe(true);
    expect(
      JSON.parse(storage.values.get(APPLICATION_STORAGE_KEY) ?? ''),
    ).toEqual(application);
    expect(storage.values.get(APPLICATION_STORAGE_KEY)).not.toContain('ui');
  });

  it.each([
    ['malformed JSON', '{not json'],
    ['oversized data', 'x'.repeat(100 * 1024 + 1)],
    [
      'an unknown schema version',
      JSON.stringify({ ...createDemoApplicationSeed(), schemaVersion: 2 }),
    ],
    [
      'invalid cross-field data',
      JSON.stringify({
        ...createDemoApplicationSeed(),
        householdMembers: [
          {
            id: 'person-maya-carter',
            firstName: 'Maya',
            lastName: 'Carter',
            ageYears: 34,
            relationship: 'self',
            applyingForCoverage: true,
          },
        ],
      }),
    ],
  ])('falls back safely for %s', (_reason, value) => {
    const storage = new FakeStorage();
    storage.values.set(APPLICATION_STORAGE_KEY, value);

    expect(loadApplication(storage)).toEqual({
      application: createDemoApplicationSeed(),
      persistenceNotice: 'recovered',
    });
  });

  it('falls back safely when storage cannot be read', () => {
    const storage = new FakeStorage();
    storage.readError = new Error('storage disabled');

    expect(loadApplication(storage)).toEqual({
      application: createDemoApplicationSeed(),
      persistenceNotice: 'recovered',
    });
  });

  it('retains the in-memory caller state when storage cannot be written', () => {
    const storage = new FakeStorage();
    const application = createDemoApplicationSeed();
    storage.writeError = new Error('quota exceeded');

    expect(saveApplication(storage, application)).toEqual({ status: 'failed' });
    expect(application).toEqual(createDemoApplicationSeed());
  });
});
