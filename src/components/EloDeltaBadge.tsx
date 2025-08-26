import React from 'react';
export function EloDeltaBadge({ delta }: { delta: number }) {
if (!delta) return null;
const sign = delta > 0 ? '+' : '';
const cls = delta > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200';
return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${cls}`}>{sign}{Math.round(delta)}</span>;
}