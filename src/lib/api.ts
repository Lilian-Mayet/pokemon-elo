const API_BASE = import.meta.env.VITE_API_BASE || '/api';


async function req<T>(path: string, options?: RequestInit): Promise<T> {
const res = await fetch(`${API_BASE}${path}`, {
headers: { 'Content-Type': 'application/json' },
credentials: 'include',
...options,
});
if (!res.ok) throw new Error(await res.text());
return res.json();
}


export const api = {
pair: () => req<PairResponse>('/pair'),
duel: (payload: DuelPayload) => req<DuelResponse>('/duel', { method: 'POST', body: JSON.stringify(payload) }),
leaderboard: (limit = 25, offset = 0) => req<{ items: Card[]; total: number }>(`/leaderboard?limit=${limit}&offset=${offset}`),
search: (q: string) => req<{ items: Card[] }>(`/search?query=${encodeURIComponent(q)}`),
card: (id: string) => req<Card>(`/cards/${id}`),
};