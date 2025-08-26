import React from "react";
import { api } from "../../lib/api";
import type { Card } from "../../types";
import { Stat } from "../../components/Stat";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export function SearchAndStats() {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<Card[]>([]);
  const [selected, setSelected] = React.useState<Card | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSearch = React.useCallback(async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await api.search(q.trim());
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }, [q]);

  const loadCard = React.useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await api.card(id);
      setSelected(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const eloHistory = React.useMemo(() => {
    if (selected?.elo_history?.length) return selected.elo_history;
    const base = Math.round(selected?.elo ?? 1000);
    return Array.from({ length: 14 }, (_, i) => ({
      t: i + 1,
      r: base + (i - 7) * (Math.random() * 4 - 2),
    }));
  }, [selected]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Colonne recherche */}
      <div className="lg:col-span-1 border rounded-md p-3 space-y-3">
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="e.g. Charizard"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />
          <button
            className="px-3 py-2 rounded border"
            onClick={onSearch}
            disabled={loading}
          >
            {loading ? "…" : "Search"}
          </button>
        </div>
        <div className="max-h-72 overflow-auto rounded border">
          {items.length === 0 && (
            <div className="text-sm text-gray-500 p-3">No results yet.</div>
          )}
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 p-3 border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => loadCard(it.id)}
            >
              <img
                src={it.image}
                alt={it.name}
                className="h-10 w-8 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{it.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {it.set_name} · {it.series} · {it.artist || "Unknown"}
                </div>
              </div>
              <div className="text-xs font-semibold">
                {Math.round(it.elo)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Colonne fiche */}
      <div className="lg:col-span-2 border rounded-md p-3">
        {!selected ? (
          <div className="text-sm text-gray-500">
            Select a card from results to view details.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <img
                src={selected.image}
                alt={selected.name}
                className="w-full rounded-xl border"
              />
              <div className="mt-3 space-y-1 text-sm">
                <div className="font-medium">{selected.name}</div>
                <div className="text-gray-500">
                  {selected.set_name} · {selected.series}
                </div>
                <div className="text-gray-500">
                  Artist: {selected.artist || "Unknown"}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="ELO" value={Math.round(selected.elo)} />
                <Stat label="Games" value={selected.games_played || 0} />
                <Stat
                  label="Win rate"
                  value={`${
                    selected.games_played
                      ? Math.round(
                          (100 * (selected.wins || 0)) /
                            (selected.games_played || 1)
                        )
                      : 0
                  }%`}
                />
              </div>

              <div>
                <div className="text-xs font-medium mb-2">ELO trend</div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={eloHistory}
                      margin={{ left: 8, right: 8, top: 4, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopOpacity={0.4} />
                          <stop offset="100%" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        domain={[600, "dataMax+50"]}
                      />
                      <Tooltip formatter={(v: number) => Math.round(v)} />
                      <Area
                        type="monotone"
                        dataKey="r"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#g)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium mb-2">
                  Progress to next tier
                </div>
                <div className="w-full bg-gray-100 rounded h-2">
                  <div
                    className="bg-gray-800 h-2 rounded"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          ((selected.elo % 200) / 200) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Tiers every 200 ELO
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
