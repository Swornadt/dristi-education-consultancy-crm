// Pure helpers for the pipeline board. `columns` looks like { new: { items: [lead], total: 12 }, contacted: {...} }.

// Moves a lead card to the top of another column and keeps the counts right.
export function moveCard(columns, lead, toStatus) {
  const from = columns[lead.status];
  const to = columns[toStatus];
  if (!from || !to || lead.status === toStatus) return columns;
  return {
    ...columns,
    [lead.status]: { items: from.items.filter((l) => l.id !== lead.id), total: Math.max(0, from.total - 1) },
    [toStatus]: { items: [{ ...lead, status: toStatus }, ...to.items], total: to.total + 1 },
  };
}

// Why a drop on `toStatus` can't happen, or null when it is allowed.
export function dropBlockedReason(lead, toStatus, { canUpdate, canConvert }) {
  if (!canUpdate) return "You don't have permission to change lead status.";
  if (lead.status === 'converted') return "Converted leads can't change status.";
  if (toStatus === 'converted') {
    if (!canConvert) return "You don't have permission to convert leads.";
    if (lead.status === 'lost') return 'Move the lead out of Lost before converting it.';
  }
  return null;
}
