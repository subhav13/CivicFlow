import { describe, expect, it } from 'vitest';

import {
  createDemoApplicationSeed,
  type ApplicationState,
  type DemoDocument,
} from './index';
import {
  getDocumentReadiness,
  getDocumentRequirements,
} from './document-readiness';

describe('Document readiness selector (domain)', () => {
  it('returns canonical 4-item requirement list with stable IDs in fixed order', () => {
    const seed = createDemoApplicationSeed();
    const readiness = getDocumentReadiness(seed);

    expect(readiness.requirements).toHaveLength(4);
    const ids = readiness.requirements.map((r) => r.id);
    expect(ids).toEqual(['proof_of_income', 'identity', 'coverage', 'other']);

    const kinds = readiness.requirements.map((r) => r.kind);
    expect(kinds).toEqual(['proof_of_income', 'identity', 'coverage', 'other']);
  });

  it('evaluates income present without proof attached as Required + Missing (blocker)', () => {
    const seed = createDemoApplicationSeed();
    const appWithIncome: ApplicationState = {
      ...seed,
      incomeSources: [
        {
          id: 'income-1',
          ownerPersonId: seed.applicant.id,
          employerName: 'Acme Dental',
          amountCents: 320000,
          frequency: 'monthly',
          currency: 'USD',
        },
      ],
      documents: [],
    };

    const readiness = getDocumentReadiness(appWithIncome);
    expect(readiness.isReady).toBe(false);
    expect(readiness.missingRequiredCount).toBe(1);

    const proofReq = readiness.requirements.find(
      (r) => r.kind === 'proof_of_income',
    );
    expect(proofReq).toBeDefined();
    expect(proofReq?.required).toBe(true);
    expect(proofReq?.status).toBe('missing');
    expect(proofReq?.reason).toContain('household income');

    // Optional items remain optional and not missing
    const optionalReqs = readiness.requirements.filter(
      (r) => r.kind !== 'proof_of_income',
    );
    for (const req of optionalReqs) {
      expect(req.required).toBe(false);
      expect(req.status).toBe('optional');
    }
  });

  it('evaluates income present with proof attached as Required + Attached', () => {
    const seed = createDemoApplicationSeed();
    const proofDoc: DemoDocument = {
      id: 'doc-income',
      kind: 'proof_of_income',
      displayName: 'Acme Dental paystub',
      status: 'attached_demo',
      addedAt: '2026-08-28T00:00:00.000Z',
    };
    const appWithIncomeAndProof: ApplicationState = {
      ...seed,
      incomeSources: [
        {
          id: 'income-1',
          ownerPersonId: seed.applicant.id,
          employerName: 'Acme Dental',
          amountCents: 320000,
          frequency: 'monthly',
          currency: 'USD',
        },
      ],
      documents: [proofDoc],
    };

    const readiness = getDocumentReadiness(appWithIncomeAndProof);
    expect(readiness.isReady).toBe(true);
    expect(readiness.missingRequiredCount).toBe(0);

    const proofReq = readiness.requirements.find(
      (r) => r.kind === 'proof_of_income',
    );
    expect(proofReq?.required).toBe(true);
    expect(proofReq?.status).toBe('attached');
  });

  it('evaluates zero-income application as requiring no proof of income', () => {
    const seed = createDemoApplicationSeed();
    const noIncomeApp: ApplicationState = {
      ...seed,
      incomeSources: [],
      documents: [],
      noIncomeConfirmed: true,
    };

    const readiness = getDocumentReadiness(noIncomeApp);
    expect(readiness.isReady).toBe(true);
    expect(readiness.missingRequiredCount).toBe(0);

    const proofReq = readiness.requirements.find(
      (r) => r.kind === 'proof_of_income',
    );
    expect(proofReq?.required).toBe(false);
    expect(proofReq?.status).toBe('optional');
    expect(proofReq?.reason).toContain('zero');
  });

  it('attaching optional metadata presets does not change requirement count or fulfill proof-of-income', () => {
    const seed = createDemoApplicationSeed();
    const identityDoc: DemoDocument = {
      id: 'doc-identity',
      kind: 'identity',
      displayName: 'Maya Carter synthetic identity note',
      status: 'attached_demo',
      addedAt: '2026-08-28T00:00:00.000Z',
    };
    const coverageDoc: DemoDocument = {
      id: 'doc-coverage',
      kind: 'coverage',
      displayName: 'Synthetic coverage card note',
      status: 'attached_demo',
      addedAt: '2026-08-28T00:00:00.000Z',
    };

    const appWithIncomeAndOptionalDocs: ApplicationState = {
      ...seed,
      incomeSources: [
        {
          id: 'income-1',
          ownerPersonId: seed.applicant.id,
          employerName: 'Acme Dental',
          amountCents: 320000,
          frequency: 'monthly',
          currency: 'USD',
        },
      ],
      documents: [identityDoc, coverageDoc],
    };

    const readiness = getDocumentReadiness(appWithIncomeAndOptionalDocs);
    // Still missing proof of income
    expect(readiness.isReady).toBe(false);
    expect(readiness.missingRequiredCount).toBe(1);

    const proofReq = readiness.requirements.find(
      (r) => r.kind === 'proof_of_income',
    );
    expect(proofReq?.status).toBe('missing');

    const identityReq = readiness.requirements.find(
      (r) => r.kind === 'identity',
    );
    expect(identityReq?.required).toBe(false);
    expect(identityReq?.status).toBe('attached');

    const coverageReq = readiness.requirements.find(
      (r) => r.kind === 'coverage',
    );
    expect(coverageReq?.required).toBe(false);
    expect(coverageReq?.status).toBe('attached');

    const otherReq = readiness.requirements.find((r) => r.kind === 'other');
    expect(otherReq?.required).toBe(false);
    expect(otherReq?.status).toBe('optional');
  });

  it('handles all 4 documents attached truthfully', () => {
    const seed = createDemoApplicationSeed();
    const allDocs: DemoDocument[] = [
      {
        id: 'd1',
        kind: 'proof_of_income',
        displayName: 'Paystub',
        status: 'attached_demo',
        addedAt: '2026-08-28T00:00:00.000Z',
      },
      {
        id: 'd2',
        kind: 'identity',
        displayName: 'ID note',
        status: 'attached_demo',
        addedAt: '2026-08-28T00:00:00.000Z',
      },
      {
        id: 'd3',
        kind: 'coverage',
        displayName: 'Card note',
        status: 'attached_demo',
        addedAt: '2026-08-28T00:00:00.000Z',
      },
      {
        id: 'd4',
        kind: 'other',
        displayName: 'Other note',
        status: 'attached_demo',
        addedAt: '2026-08-28T00:00:00.000Z',
      },
    ];

    const app: ApplicationState = {
      ...seed,
      incomeSources: [
        {
          id: 'i1',
          ownerPersonId: seed.applicant.id,
          employerName: 'Work',
          amountCents: 1000,
          frequency: 'monthly',
          currency: 'USD',
        },
      ],
      documents: allDocs,
    };

    const readiness = getDocumentReadiness(app);
    expect(readiness.isReady).toBe(true);
    expect(readiness.missingRequiredCount).toBe(0);
    expect(readiness.requirements.every((r) => r.status === 'attached')).toBe(
      true,
    );
  });

  it('getDocumentRequirements helper returns the requirements array directly', () => {
    const seed = createDemoApplicationSeed();
    const requirements = getDocumentRequirements(seed);
    expect(Array.isArray(requirements)).toBe(true);
    expect(requirements).toHaveLength(4);
  });

  it('is a pure function without side effects or policy language', () => {
    const seed = createDemoApplicationSeed();
    const originalJson = JSON.stringify(seed);

    const r1 = getDocumentReadiness(seed);
    const r2 = getDocumentReadiness(seed);

    expect(JSON.stringify(seed)).toBe(originalJson);
    expect(r1).toEqual(r2);

    for (const req of r1.requirements) {
      // Must not claim government or official eligibility
      expect(req.reason.toLowerCase()).not.toContain('government');
      expect(req.reason.toLowerCase()).not.toContain('eligible');
      expect(req.reason.toLowerCase()).not.toContain('state agency');
    }
  });
});
