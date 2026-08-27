import type { ApplicationState, SectionId } from '../domain';
import type { CivicFlowStore } from '../application/store';

export type HumanDispatch = CivicFlowStore['dispatch'];

export interface BaseSectionProps {
  application: ApplicationState;
  dispatch: HumanDispatch;
  disabled: boolean;
  onNavigate: (section: SectionId) => void;
}
