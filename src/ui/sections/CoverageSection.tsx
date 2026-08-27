import { useState, type FormEvent } from 'react';

import { setCurrentCoverage } from '../../application/commands';
import {
  getApplicantAndHouseholdPeople,
  type CoverageStatus,
} from '../../domain';
import { TextField, SelectField } from '../components/FormField';
import {
  ActionFeedback,
  EmptyState,
  PrimaryButton,
  SectionHeader,
  SectionPanel,
} from '../components/SectionPrimitives';
import type { BaseSectionProps } from '../types';

interface CoverageDraft {
  status: '' | CoverageStatus;
  providerName: string;
  planName: string;
}

type CoverageErrors = Record<string, string>;

function createDrafts(
  application: BaseSectionProps['application'],
): Record<string, CoverageDraft> {
  const records = new Map(
    application.coverageRecords.map((record) => [record.personId, record]),
  );
  return Object.fromEntries(
    getApplicantAndHouseholdPeople(application).map((person) => {
      const record = records.get(person.id);
      return [
        person.id,
        {
          status: record?.status ?? '',
          providerName: record?.providerName ?? '',
          planName: record?.planName ?? '',
        },
      ];
    }),
  );
}

export function CoverageSection({
  application,
  dispatch,
  disabled,
}: BaseSectionProps) {
  const people = getApplicantAndHouseholdPeople(application).filter(
    (person) => person.applyingForCoverage,
  );
  const [drafts, setDrafts] = useState<Record<string, CoverageDraft>>(() =>
    createDrafts(application),
  );
  const [errors, setErrors] = useState<CoverageErrors>({});
  const [receipt, setReceipt] = useState<ReturnType<
    BaseSectionProps['dispatch']
  > | null>(null);

  function updateDraft(personId: string, change: Partial<CoverageDraft>) {
    setDrafts((current) => ({
      ...current,
      [personId]: {
        ...current[personId],
        ...change,
        ...(change.status === 'none' ? { providerName: '', planName: '' } : {}),
      },
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[personId];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: CoverageErrors = {};
    for (const person of people) {
      const draft = drafts[person.id];
      if (!draft || draft.status === '') {
        nextErrors[person.id] =
          `Choose a coverage status for ${person.firstName} ${person.lastName}.`;
      } else if (draft.status === 'covered' && !draft.providerName.trim()) {
        nextErrors[person.id] =
          `Add a provider for ${person.firstName} ${person.lastName}.`;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const nextReceipt = dispatch(
      (state, context) =>
        setCurrentCoverage(
          state,
          {
            records: people.map((person) => {
              const draft = drafts[person.id];
              return draft.status === 'none'
                ? { personId: person.id, status: 'none' as const }
                : {
                    personId: person.id,
                    status: 'covered' as const,
                    providerName: draft.providerName,
                    planName: draft.planName || undefined,
                  };
            }),
          },
          context,
        ),
      {
        activity: {
          id: 'human-coverage-save',
          summary: 'Recorded coverage status',
        },
      },
    );
    setReceipt(nextReceipt);
  }

  return (
    <div className="section-content">
      <SectionHeader
        description="Record a current status for every person applying for coverage. Do not leave a person implied."
        eyebrow="Coverage today"
        title="Current Coverage"
      />
      <SectionPanel title="Coverage status by person" tone="soft">
        {people.length === 0 ? (
          <EmptyState>
            <strong>No one is currently marked as applying.</strong>
            <span>
              Return to About You or Household to choose who belongs in the
              coverage flow.
            </span>
          </EmptyState>
        ) : (
          <form noValidate onSubmit={handleSubmit}>
            <div className="coverage-list">
              {people.map((person) => {
                const name = `${person.firstName} ${person.lastName}`;
                const draft = drafts[person.id] ?? {
                  status: '',
                  providerName: '',
                  planName: '',
                };
                return (
                  <fieldset className="coverage-card" key={person.id}>
                    <legend>
                      <span className="record-avatar" aria-hidden="true">
                        {person.firstName.slice(0, 1)}
                        {person.lastName.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{name}</strong>
                        <small>Choose one status</small>
                      </span>
                    </legend>
                    <SelectField
                      disabled={disabled}
                      error={errors[person.id]}
                      id={`coverage-status-${person.id}`}
                      label={`Coverage status for ${name}`}
                      onChange={(event) =>
                        updateDraft(person.id, {
                          status: event.target.value as '' | CoverageStatus,
                        })
                      }
                      value={draft.status}
                    >
                      <option value="">Choose a status</option>
                      <option value="none">No current coverage</option>
                      <option value="covered">Currently covered</option>
                    </SelectField>
                    {draft.status === 'covered' ? (
                      <div className="form-grid nested-form-grid">
                        <TextField
                          disabled={disabled}
                          id={`coverage-provider-${person.id}`}
                          label={`Provider for ${name}`}
                          onChange={(event) =>
                            updateDraft(person.id, {
                              providerName: event.target.value,
                            })
                          }
                          value={draft.providerName}
                        />
                        <TextField
                          disabled={disabled}
                          id={`coverage-plan-${person.id}`}
                          label={`Plan name for ${name}`}
                          onChange={(event) =>
                            updateDraft(person.id, {
                              planName: event.target.value,
                            })
                          }
                          value={draft.planName}
                        />
                      </div>
                    ) : null}
                  </fieldset>
                );
              })}
            </div>
            <div className="form-actions form-actions-wide">
              <PrimaryButton disabled={disabled}>
                Save coverage status
              </PrimaryButton>
            </div>
          </form>
        )}
        {Object.keys(errors).length > 0 ? (
          <div className="validation-summary" role="alert">
            <strong>Choose a coverage status for each person.</strong>
            <span>{Object.values(errors).join(' ')}</span>
          </div>
        ) : null}
        <ActionFeedback receipt={receipt} />
        {application.coverageRecords.length > 0 ? (
          <p className="inline-success">
            {application.coverageRecords.length} people have a recorded coverage
            status.
          </p>
        ) : null}
      </SectionPanel>
    </div>
  );
}
