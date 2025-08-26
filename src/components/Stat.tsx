import React from 'react';
export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
return (
<div className="rounded-lg border p-3">
<div className="text-xs text-gray-500">{label}</div>
<div className="text-lg font-semibold">{value}</div>
</div>
);
}