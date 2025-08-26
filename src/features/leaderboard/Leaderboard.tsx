import React from 'react';
import { api } from '../../lib/api';
import type { Card } from '../../types';


export function Leaderboard() {
const [items, setItems] = React.useState<Card[]>([]);
const [total, setTotal] = React.useState(0);
const [loading, setLoading] = React.useState(true);
const [page, setPage] = React.useState(0);
const limit = 25;


const load = React.useCallback(async (reset = false) => {
setLoading(true);
try {
const data = await api.leaderboard(limit, reset ? 0 : page * limit);
setItems(prev => (reset ? data.items : [...prev, ...data.items]));
setTotal(data.total || 0);
} finally {
setLoading(false);
}
}, [page]);


React.useEffect(() => { load(true); }, []);
React.useEffect(() => { if (page > 0) load(false); }, [page]);


return (
<div className="border rounded-md">
<div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium uppercase text-gray-500 border-b">
<div className="col-span-1">#</div>
<div className="col-span-5">Card</div>
<div className="col-span-2">ELO</div>
<div className="col-span-2">W/L</div>
<div className="col-span-2">Games</div>
</div>
{items.map((it, idx) => (
<div key={it.id} className="grid grid-cols-12 gap-3 px-3 py-2 items-center hover:bg-gray-50">
<div className="col-span-1 text-sm opacity-70">{idx + 1 + page*limit}</div>
<div className="col-span-5 flex items-center gap-3 overflow-hidden">
<img src={it.image} alt={it.name} className="h-9 w-7 object-cover rounded" />
<div className="truncate">
<div className="text-sm font-medium truncate">{it.name}</div>
<div className="text-xs text-gray-500 truncate">{it.set_name} · {it.series}</div>
</div>
</div>
<div className="col-span-2 font-semibold">{Math.round(it.elo)}</div>
<div className="col-span-2 text-xs">{it.wins||0} / {it.losses||0}</div>
<div className="col-span-2 text-xs">{it.games_played||0}</div>
</div>
))}
<div className="flex items-center justify-between mt-4 p-3">
<div className="text-xs text-gray-500">{items.length} / {total} shown</div>
<button className="px-3 py-1.5 text-sm rounded border" onClick={() => setPage(p => p + 1)} disabled={loading || items.length >= total}>
{loading ? 'Loading…' : 'Load more'}
</button>
</div>
</div>
);
}