import type { SectionId } from '../../domain';

export const SECTION_META: ReadonlyArray<{
  id: SectionId;
  label: string;
  eyebrow: string;
}> = [
  { id: 'about', label: 'About You', eyebrow: '01' },
  { id: 'household', label: 'Household', eyebrow: '02' },
  { id: 'income', label: 'Income', eyebrow: '03' },
  { id: 'coverage', label: 'Current Coverage', eyebrow: '04' },
  { id: 'documents', label: 'Documents', eyebrow: '05' },
  { id: 'review', label: 'Review & Sign', eyebrow: '06' },
];
