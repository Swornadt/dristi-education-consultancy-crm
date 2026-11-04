import { describe, expect, it } from 'vitest';
import { dropBlockedReason, moveCard } from './boardUtils';

const lead = (id, status) => ({ id, status, fullName: `Lead ${id}` });
const makeColumns = () => ({
  new: { items: [lead(1, 'new'), lead(2, 'new')], total: 12 },
  contacted: { items: [lead(3, 'contacted')], total: 4 },
  lost: { items: [], total: 0 },
});

describe('moveCard', () => {
  it('moves the card to the top of the target column and updates its status', () => {
    const result = moveCard(makeColumns(), lead(1, 'new'), 'contacted');
    expect(result.contacted.items.map((l) => l.id)).toEqual([1, 3]);
    expect(result.contacted.items[0].status).toBe('contacted');
  });

  it('removes it from the source column and fixes both totals', () => {
    const result = moveCard(makeColumns(), lead(1, 'new'), 'contacted');
    expect(result.new.items.map((l) => l.id)).toEqual([2]);
    expect(result.new.total).toBe(11);
    expect(result.contacted.total).toBe(5);
  });

  it('never lets a total go below zero', () => {
    const columns = { new: { items: [lead(1, 'new')], total: 0 }, lost: { items: [], total: 0 } };
    expect(moveCard(columns, lead(1, 'new'), 'lost').new.total).toBe(0);
  });

  it('returns the same object when dropped on its own column', () => {
    const columns = makeColumns();
    expect(moveCard(columns, lead(1, 'new'), 'new')).toBe(columns);
  });

  it('returns the same object for an unknown column', () => {
    const columns = makeColumns();
    expect(moveCard(columns, lead(1, 'new'), 'nowhere')).toBe(columns);
  });

  it('does not mutate the original columns', () => {
    const columns = makeColumns();
    const snapshot = JSON.stringify(columns);
    moveCard(columns, lead(1, 'new'), 'contacted');
    expect(JSON.stringify(columns)).toBe(snapshot);
  });
});

describe('dropBlockedReason', () => {
  const allowed = { canUpdate: true, canConvert: true };

  it('allows an ordinary move', () => {
    expect(dropBlockedReason(lead(1, 'new'), 'contacted', allowed)).toBeNull();
  });
  it('blocks everything without update permission', () => {
    expect(dropBlockedReason(lead(1, 'new'), 'contacted', { canUpdate: false, canConvert: true })).toMatch(/permission/);
  });
  it('blocks moving a converted lead', () => {
    expect(dropBlockedReason(lead(1, 'converted'), 'contacted', allowed)).toMatch(/Converted/);
  });
  it('blocks converting without convert permission', () => {
    expect(dropBlockedReason(lead(1, 'new'), 'converted', { canUpdate: true, canConvert: false })).toMatch(/convert/);
  });
  it('blocks converting a lost lead', () => {
    expect(dropBlockedReason(lead(1, 'lost'), 'converted', allowed)).toMatch(/Lost/);
  });
  it('allows converting an active lead', () => {
    expect(dropBlockedReason(lead(1, 'qualified'), 'converted', allowed)).toBeNull();
  });
});
