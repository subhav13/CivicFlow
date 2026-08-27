import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';

import {
  CIVICFLOW_TOOL_NAMES,
  STATIC_TOOL_NAMES,
  CONTEXTUAL_TOOL_NAMES,
  TOOL_CATALOG,
  type CivicFlowToolName,
} from '../../src/webmcp/tool-catalog';
import {
  failureResult,
  serializeToolResult,
  successResult,
} from '../../src/webmcp/tool-results';

describe('Tool Catalog Contract', () => {
  const ajv = new Ajv({ strict: true, allErrors: true });

  it('contains exactly the nine specified tool names', () => {
    const expectedNine: CivicFlowToolName[] = [
      'get_application_progress',
      'navigate_to_section',
      'add_household_member',
      'update_household_member',
      'add_income_source',
      'update_income_source',
      'set_current_coverage',
      'list_uploaded_documents',
      'review_application',
    ];

    expect([...CIVICFLOW_TOOL_NAMES].sort()).toEqual([...expectedNine].sort());
    expect(Object.keys(TOOL_CATALOG).sort()).toEqual([...expectedNine].sort());
    expect(CIVICFLOW_TOOL_NAMES).toHaveLength(9);
  });

  it('partitions tools into static and contextual subsets', () => {
    expect([...STATIC_TOOL_NAMES].sort()).toEqual(
      [
        'get_application_progress',
        'navigate_to_section',
        'add_household_member',
        'add_income_source',
        'set_current_coverage',
        'list_uploaded_documents',
      ].sort(),
    );

    expect([...CONTEXTUAL_TOOL_NAMES].sort()).toEqual(
      [
        'update_household_member',
        'update_income_source',
        'review_application',
      ].sort(),
    );
  });

  it('never contains "submit" in any tool name, title, description, or parameter', () => {
    for (const name of CIVICFLOW_TOOL_NAMES) {
      expect(name.toLowerCase()).not.toContain('submit');
      const tool = TOOL_CATALOG[name];
      expect(tool.name.toLowerCase()).not.toContain('submit');
      expect(tool.title.toLowerCase()).not.toContain('submit');
      expect(tool.description.toLowerCase()).not.toContain('submit');

      const schemaStr = JSON.stringify(tool.inputSchema).toLowerCase();
      expect(schemaStr).not.toContain('submit_');
      expect(schemaStr).not.toContain('submittal');
    }
  });

  it('enforces character limits on names, parameters, and descriptions', () => {
    const descriptions = new Set<string>();

    for (const name of CIVICFLOW_TOOL_NAMES) {
      const tool = TOOL_CATALOG[name];
      // Tool name <= 30 chars
      expect(tool.name.length).toBeLessThanOrEqual(30);
      // Tool description <= 500 chars
      expect(tool.description.length).toBeLessThanOrEqual(500);
      expect(tool.description.length).toBeGreaterThan(10);

      // Descriptions must be unique
      expect(descriptions.has(tool.description)).toBe(false);
      descriptions.add(tool.description);

      // Input schema closed and parameters <= 30 chars
      const schema = tool.inputSchema as Record<string, unknown>;
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);

      if (schema.properties && typeof schema.properties === 'object') {
        for (const [propName, propDef] of Object.entries(
          schema.properties as Record<string, { description?: string }>,
        )) {
          expect(propName.length).toBeLessThanOrEqual(30);
          if (propDef.description) {
            expect(propDef.description.length).toBeLessThanOrEqual(150);
          }
        }
      }
    }
  });

  it('compiles valid Ajv schemas for all tools', () => {
    for (const name of CIVICFLOW_TOOL_NAMES) {
      const tool = TOOL_CATALOG[name];
      const validate = ajv.compile(tool.inputSchema);
      expect(typeof validate).toBe('function');
    }
  });

  it('applies exact annotations as specified in the product ledger', () => {
    expect(TOOL_CATALOG.get_application_progress.annotations).toEqual({
      readOnlyHint: true,
    });
    expect(TOOL_CATALOG.list_uploaded_documents.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
    // review_application is NOT read-only because it changes UI review highlights
    expect(
      TOOL_CATALOG.review_application.annotations?.readOnlyHint,
    ).toBeFalsy();
    // mutation tools have no read-only hint
    expect(
      TOOL_CATALOG.add_household_member.annotations?.readOnlyHint,
    ).toBeFalsy();
    expect(
      TOOL_CATALOG.update_household_member.annotations?.readOnlyHint,
    ).toBeFalsy();
    expect(
      TOOL_CATALOG.add_income_source.annotations?.readOnlyHint,
    ).toBeFalsy();
    expect(
      TOOL_CATALOG.update_income_source.annotations?.readOnlyHint,
    ).toBeFalsy();
    expect(
      TOOL_CATALOG.set_current_coverage.annotations?.readOnlyHint,
    ).toBeFalsy();
    expect(
      TOOL_CATALOG.navigate_to_section.annotations?.readOnlyHint,
    ).toBeFalsy();
  });
});

describe('Tool Results Envelope Contract', () => {
  it('creates success results conforming to the envelope schema', () => {
    const res = successResult(
      'add_household_member',
      'act-123',
      true,
      'Added household member Emma Carter',
      { memberId: 'person-123', name: 'Emma Carter' },
      2,
      'Added member card in Household section',
    );

    expect(res).toEqual({
      ok: true,
      tool: 'add_household_member',
      actionId: 'act-123',
      changed: true,
      message: 'Added household member Emma Carter',
      data: { memberId: 'person-123', name: 'Emma Carter' },
      stateRevision: 2,
      visibleEffect: 'Added member card in Household section',
    });
  });

  it('creates failure results with recoverable and fieldError details', () => {
    const res = failureResult(
      'add_income_source',
      'act-124',
      'PERSON_NOT_FOUND',
      'Could not find applying member "John Doe"',
      true,
      1,
      { ownerName: 'Person not found' },
    );

    expect(res).toEqual({
      ok: false,
      tool: 'add_income_source',
      actionId: 'act-124',
      error: {
        code: 'PERSON_NOT_FOUND',
        message: 'Could not find applying member "John Doe"',
        recoverable: true,
        fieldErrors: { ownerName: 'Person not found' },
      },
      stateRevision: 1,
    });
  });

  it('preserves full original result byte-for-byte when under budget', () => {
    const res = successResult(
      'review_application',
      'act-100',
      false,
      'Application review completed',
      {
        percent: 60,
        issueCount: 2,
        issues: [
          {
            code: 'INCOMPLETE',
            severity: 'blocking',
            section: 'about',
            message: 'First test issue',
          },
          {
            code: 'INCOMPLETE',
            severity: 'warning',
            section: 'household',
            message: 'Second test issue',
          },
        ],
        canSubmitDemo: false,
      },
      3,
      'Updated review highlights',
    );

    const serialized = serializeToolResult(res);
    expect(serialized.length).toBeLessThanOrEqual(1500);
    expect(JSON.parse(serialized)).toEqual(res);
  });

  it('compacts payload with many issues under 1500 chars with intact retained entries', () => {
    const sampleIssues = Array.from({ length: 60 }, (_, i) => ({
      code: 'ABOUT_INCOMPLETE',
      severity: 'blocking',
      section: 'about',
      message: `Detailed issue description #${i} with full intact text for verification`,
    }));

    const res = successResult(
      'review_application',
      'act-125',
      false,
      'Application review completed',
      {
        percent: 60,
        issueCount: 60,
        issues: sampleIssues,
        canSubmitDemo: false,
      },
      3,
      'Updated review highlights',
    );

    const serialized = serializeToolResult(res);
    expect(serialized.length).toBeLessThanOrEqual(1500);

    const parsed = JSON.parse(serialized);
    expect(parsed.ok).toBe(true);
    expect(parsed.data._note).toBeDefined();
    expect(Array.isArray(parsed.data.issues)).toBe(true);
    expect(parsed.data.issues.length).toBeLessThan(60);
    // Retained issues must be complete and intact without mid-string truncation
    for (const issue of parsed.data.issues) {
      expect(issue.message).toMatch(
        /^Detailed issue description #\d+ with full intact text for verification$/,
      );
    }
  });

  it('compacts payload with many documents under 1500 chars with intact retained entries', () => {
    const sampleDocs = Array.from({ length: 50 }, (_, i) => ({
      id: `doc-${i}`,
      fileName: `paystub_document_verification_${i}_for_household.pdf`,
      fileSizeBytes: 1024 * 1024 * 2,
      uploadedAt: '2026-08-27T12:00:00.000Z',
      category: 'income_proof',
      personName: 'Maya Carter',
    }));

    const res = successResult(
      'list_uploaded_documents',
      'act-126',
      false,
      'Retrieved uploaded documents list',
      {
        documents: sampleDocs,
        totalCount: 50,
      },
      2,
      'Document list viewed',
    );

    const serialized = serializeToolResult(res);
    expect(serialized.length).toBeLessThanOrEqual(1500);

    const parsed = JSON.parse(serialized);
    expect(parsed.ok).toBe(true);
    expect(parsed.data._note).toBeDefined();
    expect(Array.isArray(parsed.data.documents)).toBe(true);
    expect(parsed.data.documents.length).toBeLessThan(50);
    for (const doc of parsed.data.documents) {
      expect(doc.fileName).toMatch(
        /^paystub_document_verification_\d+_for_household\.pdf$/,
      );
    }
  });

  it('safely handles deliberately oversized user strings without mid-string cuts', () => {
    const oversizedUserString = 'A'.repeat(5000);

    const res = successResult(
      'add_household_member',
      'act-127',
      true,
      oversizedUserString,
      {
        userInput: oversizedUserString,
      },
      2,
      'Household member added',
    );

    const serialized = serializeToolResult(res);
    expect(serialized.length).toBeLessThanOrEqual(1500);

    const parsed = JSON.parse(serialized);
    expect(parsed.ok).toBe(true);
    expect(parsed.tool).toBe('add_household_member');
    // Safe minimal envelope with static text
    expect(parsed.message).toBe(
      'Operation completed successfully. Details compacted to respect payload limit.',
    );
    expect(parsed.data._note).toBeDefined();
  });

  it('safely serializes oversized failure results under 1500 chars', () => {
    const oversizedErrorMsg = 'Server internal error: '.repeat(200);

    const res = failureResult(
      'add_income_source',
      'act-128',
      'INTERNAL_ERROR',
      oversizedErrorMsg,
      false,
      1,
    );

    const serialized = serializeToolResult(res);
    expect(serialized.length).toBeLessThanOrEqual(1500);

    const parsed = JSON.parse(serialized);
    expect(parsed.ok).toBe(false);
    expect(parsed.tool).toBe('add_income_source');
    expect(parsed.error.message).toBe(
      'Operation failed. Error details omitted to respect payload limit.',
    );
  });
});
