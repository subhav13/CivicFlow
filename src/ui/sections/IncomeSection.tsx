import { useState, type FormEvent } from 'react';

import {
  addIncomeSource,
  confirmNoIncome,
  updateIncomeSource,
} from '../../application/commands';
import {
  INCOME_FREQUENCIES,
  getApplicantAndHouseholdPeople,
  type IncomeFrequency,
} from '../../domain';
import { formatCentsAsDollars, parseDollarsToCents } from '../currency';
import { TextField, SelectField } from '../components/FormField';
import {
  ActionFeedback,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SectionPanel,
} from '../components/SectionPrimitives';
import type { BaseSectionProps } from '../types';

interface IncomeDraft {
  ownerPersonId: string;
  employerName: string;
  amountDollars: string;
  frequency: IncomeFrequency;
}

type IncomeErrors = Partial<Record<keyof IncomeDraft, string>>;

const frequencyLabels: Record<IncomeFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  monthly: 'Monthly',
  annual: 'Annual',
};

const freshDraft = (ownerPersonId: string): IncomeDraft => ({
  ownerPersonId,
  employerName: '',
  amountDollars: '',
  frequency: 'monthly',
});

function validateDraft(draft: IncomeDraft): IncomeErrors {
  const errors: IncomeErrors = {};
  if (!draft.ownerPersonId) errors.ownerPersonId = 'Choose an owner.';
  if (!draft.employerName.trim())
    errors.employerName = 'Employer or source is required.';
  const amount = parseDollarsToCents(draft.amountDollars);
  if (amount === null)
    errors.amountDollars =
      'Enter an amount using whole cents (for example, 4,950.00).';
  return errors;
}

function draftFromIncome(
  income: BaseSectionProps['application']['incomeSources'][number],
): IncomeDraft {
  return {
    ownerPersonId: income.ownerPersonId,
    employerName: income.employerName,
    amountDollars: (income.amountCents / 100).toFixed(2),
    frequency: income.frequency,
  };
}

interface IncomeSectionProps extends BaseSectionProps {
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}

export function IncomeSection({
  application,
  dispatch,
  disabled,
  onSelect,
  selectedId,
}: IncomeSectionProps) {
  const people = getApplicantAndHouseholdPeople(application);
  const hasRecordedIncome = application.incomeSources.length > 0;
  const [draft, setDraft] = useState<IncomeDraft>(() =>
    freshDraft(application.applicant.id),
  );
  const selectedIncome = application.incomeSources.find(
    (income) => income.id === selectedId,
  );
  const [editDraft, setEditDraft] = useState<IncomeDraft | null>(null);
  const [errors, setErrors] = useState<IncomeErrors>({});
  const [editErrors, setEditErrors] = useState<IncomeErrors>({});
  const [receipt, setReceipt] = useState<ReturnType<
    BaseSectionProps['dispatch']
  > | null>(null);

  function selectIncome(id: string) {
    const income = application.incomeSources.find(
      (candidate) => candidate.id === id,
    );
    if (!income) return;
    if (selectedId === id) {
      onSelect(null);
      setEditDraft(null);
    } else {
      onSelect(id);
      setEditDraft(draftFromIncome(income));
    }
    setEditErrors({});
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const amountCents = parseDollarsToCents(draft.amountDollars);
    if (amountCents === null) return;
    const nextReceipt = dispatch(
      (state, context) =>
        addIncomeSource(
          state,
          {
            ownerPersonId: draft.ownerPersonId,
            employerName: draft.employerName,
            amountCents,
            frequency: draft.frequency,
            currency: 'USD',
          },
          context,
        ),
      { activity: { id: 'human-income-add', summary: 'Added income source' } },
    );
    setReceipt(nextReceipt);
    if (nextReceipt.kind === 'success' && nextReceipt.changed) {
      setDraft(freshDraft(application.applicant.id));
      setErrors({});
    }
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedIncome || !editDraft) return;
    const nextErrors = validateDraft(editDraft);
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const amountCents = parseDollarsToCents(editDraft.amountDollars);
    if (amountCents === null) return;
    const nextReceipt = dispatch(
      (state, context) =>
        updateIncomeSource(
          state,
          {
            incomeSourceId: selectedIncome.id,
            changes: {
              ownerPersonId: editDraft.ownerPersonId,
              employerName: editDraft.employerName,
              amountCents,
              frequency: editDraft.frequency,
              currency: 'USD',
            },
          },
          context,
        ),
      {
        activity: { id: 'human-income-edit', summary: 'Updated income source' },
      },
    );
    setReceipt(nextReceipt);
  }

  function handleNoIncome() {
    const nextReceipt = dispatch(
      (state, context) => confirmNoIncome(state, context),
      {
        activity: { id: 'human-no-income', summary: 'Confirmed no income' },
      },
    );
    setReceipt(nextReceipt);
  }

  function renderOwnerOptions() {
    return people.map((person) => (
      <option key={person.id} value={person.id}>
        {person.firstName} {person.lastName}
      </option>
    ));
  }

  function renderFrequencyOptions() {
    return INCOME_FREQUENCIES.map((frequency) => (
      <option key={frequency} value={frequency}>
        {frequencyLabels[frequency]}
      </option>
    ));
  }

  return (
    <div className="section-content">
      <SectionHeader
        description="Record a source using dollars in the form; CivicFlow stores integer cents underneath."
        eyebrow="Money in the household"
        title="Income"
      />
      <SectionPanel title="Recorded sources" tone="soft">
        {application.incomeSources.length === 0 ? (
          <EmptyState>
            <strong>No income sources recorded.</strong>
            <span>Add a source, or choose the explicit no-income path.</span>
          </EmptyState>
        ) : (
          <div className="record-list" role="list" aria-label="Income sources">
            {application.incomeSources.map((income) => {
              const owner = people.find(
                (person) => person.id === income.ownerPersonId,
              );
              const name = `${income.employerName}`;
              const isSelected = selectedId === income.id;
              return (
                <article
                  className={`record-card${isSelected ? ' is-selected' : ''}`}
                  key={income.id}
                  role="listitem"
                >
                  <button
                    aria-label={`${isSelected ? 'Deselect' : 'Select'} income ${name}`}
                    aria-pressed={isSelected}
                    className="record-select-button"
                    onClick={() => selectIncome(income.id)}
                    type="button"
                  >
                    <span className="record-avatar" aria-hidden="true">
                      $
                    </span>
                    <span className="record-card-copy">
                      <strong>{name}</strong>
                      <small>
                        {owner
                          ? `${owner.firstName} ${owner.lastName}`
                          : 'Unknown owner'}
                      </small>
                      <small>
                        {formatCentsAsDollars(income.amountCents)}{' '}
                        {frequencyLabels[income.frequency].toLowerCase()}
                      </small>
                    </span>
                    <span className="record-card-action">
                      {isSelected ? 'Selected' : 'Select'}
                    </span>
                  </button>
                  {isSelected && editDraft ? (
                    <form
                      className="inline-edit-form"
                      noValidate
                      onSubmit={handleUpdate}
                    >
                      <div className="form-grid">
                        <SelectField
                          disabled={disabled}
                          error={editErrors.ownerPersonId}
                          id="selected-income-owner"
                          label="Selected income owner"
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    ownerPersonId: event.target.value,
                                  }
                                : current,
                            )
                          }
                          value={editDraft.ownerPersonId}
                        >
                          {renderOwnerOptions()}
                        </SelectField>
                        <TextField
                          disabled={disabled}
                          error={editErrors.employerName}
                          id="selected-income-employer"
                          label="Selected employer or source"
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    employerName: event.target.value,
                                  }
                                : current,
                            )
                          }
                          value={editDraft.employerName}
                        />
                        <TextField
                          disabled={disabled}
                          error={editErrors.amountDollars}
                          id="selected-income-amount"
                          inputMode="decimal"
                          label="Selected income amount in dollars"
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    amountDollars: event.target.value,
                                  }
                                : current,
                            )
                          }
                          value={editDraft.amountDollars}
                        />
                        <SelectField
                          disabled={disabled}
                          id="selected-income-frequency"
                          label="Selected income frequency"
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    frequency: event.target
                                      .value as IncomeFrequency,
                                  }
                                : current,
                            )
                          }
                          value={editDraft.frequency}
                        >
                          {renderFrequencyOptions()}
                        </SelectField>
                      </div>
                      <div className="form-actions">
                        <PrimaryButton disabled={disabled}>
                          Update income source
                        </PrimaryButton>
                        <SecondaryButton onClick={() => onSelect(null)}>
                          Deselect
                        </SecondaryButton>
                      </div>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <form className="form-grid member-form" noValidate onSubmit={handleAdd}>
          <SelectField
            disabled={disabled}
            error={errors.ownerPersonId}
            id="income-owner"
            label="Income owner"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                ownerPersonId: event.target.value,
              }))
            }
            value={draft.ownerPersonId}
          >
            {renderOwnerOptions()}
          </SelectField>
          <TextField
            disabled={disabled}
            error={errors.employerName}
            id="income-employer"
            label="Employer or source"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                employerName: event.target.value,
              }))
            }
            value={draft.employerName}
          />
          <TextField
            disabled={disabled}
            error={errors.amountDollars}
            id="income-amount"
            inputMode="decimal"
            label="Income amount in dollars"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                amountDollars: event.target.value,
              }))
            }
            placeholder="0.00"
            value={draft.amountDollars}
          />
          <SelectField
            disabled={disabled}
            id="income-frequency"
            label="Income frequency"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                frequency: event.target.value as IncomeFrequency,
              }))
            }
            value={draft.frequency}
          >
            {renderFrequencyOptions()}
          </SelectField>
          <div className="form-actions form-actions-wide">
            <PrimaryButton disabled={disabled}>Add income source</PrimaryButton>
            <SecondaryButton
              disabled={disabled || hasRecordedIncome}
              onClick={handleNoIncome}
            >
              Confirm no income
            </SecondaryButton>
          </div>
        </form>
        {hasRecordedIncome ? (
          <p
            aria-label="No-income confirmation"
            className="helper-copy"
            role="note"
          >
            No-income confirmation is unavailable while a recorded income source
            exists. This branch applies only when the income list is empty.
          </p>
        ) : null}
        {Object.keys(errors).length > 0 ||
        Object.keys(editErrors).length > 0 ? (
          <div className="validation-summary" role="alert">
            <strong>Check the highlighted income fields.</strong>
            <span>
              {Object.values({ ...errors, ...editErrors })
                .filter(Boolean)
                .join(' ')}
            </span>
          </div>
        ) : null}
        {application.noIncomeConfirmed ? (
          <p className="inline-success">No income confirmed for this demo.</p>
        ) : null}
        <ActionFeedback receipt={receipt} />
      </SectionPanel>
    </div>
  );
}
