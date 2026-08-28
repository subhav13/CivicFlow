import type { RecentEffect } from '../../application/store';

export interface RecentEffectMatch {
  actionId: string;
  kind: RecentEffect['kind'];
  isAffected: boolean;
}

export function matchRecentEffect(
  recentEffect: RecentEffect | null | undefined,
  target: { section?: string; entityId?: string },
): RecentEffectMatch | null {
  if (!recentEffect) return null;
  const isSectionMatch =
    target.section !== undefined && recentEffect.section === target.section;
  const isEntityMatch =
    target.entityId !== undefined &&
    recentEffect.entityIds.includes(target.entityId);

  if (!isSectionMatch && !isEntityMatch) return null;

  return {
    actionId: recentEffect.actionId,
    kind: recentEffect.kind,
    isAffected: true,
  };
}

export function getRecentEffectAttributes(
  recentEffect: RecentEffect | null | undefined,
  target: { section?: string; entityId?: string },
): Record<string, string> {
  const match = matchRecentEffect(recentEffect, target);
  if (!match) return {};
  return {
    'data-recent-effect': match.kind,
    'data-recent-action-id': match.actionId,
  };
}
