// 대칭차: 새로 선택되었거나 선택 해제된 id만 모읍니다.
export function getChangedSelectionIds(
  previous: ReadonlySet<string>,
  next: ReadonlySet<string>,
): string[] {
  const changedIds: string[] = [];

  for (const id of previous) {
    if (!next.has(id)) {
      changedIds.push(id);
    }
  }
  for (const id of next) {
    if (!previous.has(id)) {
      changedIds.push(id);
    }
  }

  return changedIds;
}
