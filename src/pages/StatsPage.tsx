import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

type DictRow = Record<string, { avgElo: number; count: number }>;

async function j<T>(path: string): Promise<T> {
  const base = import.meta.env.VITE_API_BASE || "/api";
  const res = await fetch(`${base}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function toBarData(dict: DictRow) {
  return Object.entries(dict).map(([label, v]) => ({ label, value: Math.round(v.avgElo), count: v.count }));
}

export default function StatsPage() {
  // Chaque section a son propre état et son bouton "Load graph"
  const [sets, setSets] = React.useState<DictRow | null>(null);
  const [artists, setArtists] = React.useState<DictRow | null>(null);
  const [rarities, setRarities] = React.useState<DictRow | null>(null);
  const [years, setYears] = React.useState<DictRow | null>(null);

  const [loading, setLoading] = React.useState<{[k:string]: boolean}>({});

  const load = async (key: "sets"|"artists"|"rarities"|"years") => {
    setLoading(s => ({ ...s, [key]: true }));
    try {
      if (key === "sets") setSets(await j<DictRow>("/stats/sets"));
      if (key === "artists") setArtists(await j<DictRow>("/stats/artists?min_cards=3"));
      if (key === "rarities") setRarities(await j<DictRow>("/stats/rarities"));
      if (key === "years") setYears(await j<DictRow>("/stats/years"));
    } finally {
      setLoading(s => ({ ...s, [key]: false }));
    }
  };

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Analytics & Stats</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sets */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Most popular sets (avg ELO)</div>
            <button className="text-xs px-2 py-1 rounded border" onClick={() => load("sets")} disabled={loading.sets}>
              {loading.sets ? "Loading…" : "Load graph"}
            </button>
          </div>
          {!sets ? (
            <div className="text-xs text-gray-500">Click “Load graph”.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={toBarData(sets)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} height={60} angle={-15} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Artists */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Most popular artists (avg ELO, min 3 cards)</div>
            <button className="text-xs px-2 py-1 rounded border" onClick={() => load("artists")} disabled={loading.artists}>
              {loading.artists ? "Loading…" : "Load graph"}
            </button>
          </div>
          {!artists ? (
            <div className="text-xs text-gray-500">Click “Load graph”.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={toBarData(artists)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} height={60} angle={-15} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rarities */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Popularities by rarity (avg ELO)</div>
            <button className="text-xs px-2 py-1 rounded border" onClick={() => load("rarities")} disabled={loading.rarities}>
              {loading.rarities ? "Loading…" : "Load graph"}
            </button>
          </div>
          {!rarities ? (
            <div className="text-xs text-gray-500">Click “Load graph”.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={toBarData(rarities)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} height={60} angle={-15} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Years (ou séries si pas d'année) */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Popularity by year (avg ELO)</div>
            <button className="text-xs px-2 py-1 rounded border" onClick={() => load("years")} disabled={loading.years}>
              {loading.years ? "Loading…" : "Load graph"}
            </button>
          </div>
          {!years ? (
            <div className="text-xs text-gray-500">Click “Load graph”.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={Object.entries(years).map(([label, v]) => ({ label, value: Math.round(v.avgElo) }))}>
                <defs>
                  <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopOpacity={0.4} />
                    <stop offset="100%" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" strokeWidth={2} fillOpacity={1} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
