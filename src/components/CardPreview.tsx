import React from 'react';
import type { Card } from '../types';


export function CardPreview({ data, onChoose, disabled }: { data: Card | null; onChoose?: (id: string) => void; disabled?: boolean; }) {
if (!data) return (
<div className="border rounded-lg p-4 animate-pulse">
<div className="h-6 w-1/2 bg-gray-300/40 rounded mb-2" />
<div className="h-4 w-1/3 bg-gray-300/40 rounded mb-3" />
<div className="aspect-[3/4] w-full bg-gray-300/40 rounded-xl" />
</div>
);
return (
<div className="border rounded-lg overflow-hidden group">
<div className="p-3">
<div className="flex items-center justify-between">
<h3 className="text-base font-semibold leading-tight line-clamp-1">{data.name}</h3>
<span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600">ELO {Math.round(data.elo)}</span>
</div>
<div className="text-xs text-gray-500">
{data.set_name} · {data.series}
</div>
</div>
<div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
<img src={data.image} alt={data.name} className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]" />
{!disabled && (
<button onClick={() => onChoose?.(data.id)} className="absolute inset-x-3 bottom-3 rounded-lg bg-white/90 backdrop-blur px-4 py-2 text-sm font-medium shadow hover:bg-white">
Pick {data.name}
</button>
)}
</div>
<div className="p-3 text-xs text-gray-500 flex items-center justify-between">
<div>Artist · {data.artist || 'Unknown'}</div>
<div>Games · {data.games_played ?? 0}</div>
</div>
</div>
);
}