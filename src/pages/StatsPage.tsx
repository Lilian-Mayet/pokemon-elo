import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

/** API shapes */
type DictRow = Record<string, { avgElo: number; count: number }>;

/** tiny fetch helper */
async function j<T>(path: string): Promise<T> {
  const base = import.meta.env.VITE_API_BASE || "/api";
  const res = await fetch(`${base}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Transform dict -> list + default sort by avgElo desc */
function toList(dict: DictRow) {
  return Object.entries(dict)
    .map(([label, v]) => ({
      label,
      value: Math.round(v.avgElo),
      count: v.count,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Collapsible shell */
function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-semibold"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <span className="text-xs opacity-70">{open ? "− Collapse" : "+ Expand"}</span>
      </button>
      <div className={`${open ? "block" : "hidden"} p-3`}>{children}</div>
    </div>
  );
}

export default function StatsPage() {
  // raw dicts from API
  const [sets, setSets] = React.useState<DictRow | null>(null);
  const [artists, setArtists] = React.useState<DictRow | null>(null);
  const [rarities, setRarities] = React.useState<DictRow | null>(null);
  const [years, setYears] = React.useState<DictRow | null>(null);

  // visible counts (Load more) – 10 at a time
  const STEP = 10;
  const [limitSets, setLimitSets] = React.useState(STEP);
  const [limitArtists, setLimitArtists] = React.useState(STEP);
  const [limitRarities, setLimitRarities] = React.useState(STEP);

  // loading flags
  const [loading, setLoading] = React.useState<{ [k: string]: boolean }>({});

  // lazy-load per section: fetch only once when the section first expands/clicks “Load data”
  const load = async (key: "sets" | "artists" | "rarities" | "years") => {
    if ((key === "sets" && sets) || (key === "artists" && artists) || (key === "rarities" && rarities) || (key === "years" && years)) {
      return;
    }
    setLoading((s) => ({ ...s, [key]: true }));
    try {
      if (key === "sets") setSets(await j<DictRow>("/stats/sets"));
      if (key === "artists") setArtists(await j<DictRow>("/stats/artists?min_cards=3"));
      if (key === "rarities") setRarities(await j<DictRow>("/stats/rarities"));
      if (key === "years") setYears(await j<DictRow>("/stats/years"));
    } finally {
      setLoading((s) => ({ ...s, [key]: false }));
    }
  };

  // helpers to draw horizontal bars (layout="vertical")
  function HBar({
    data,
    height = 360,
  }: {
    data: { label: string; value: number; count?: number }[];
    height?: number;
  }) {
    // Y axis uses categories (labels), X axis numeric
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            dataKey="label"
            type="category"
            width={140}
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <Tooltip />
          <Bar dataKey="value" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const listSets = sets ? toList(sets) : [];
  const listArtists = artists ? toList(artists) : [];
  const listRarities = rarities ? toList(rarities) : [];
  const listYears = years
    ? Object.entries(years)
        .map(([label, v]) => ({ label, value: Math.round(v.avgElo) }))
        .sort((a, b) => Number(a.label) - Number(b.label))
    : [];

  return (
    <section className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold mb-2">Analytics & Stats</h1>

      {/* Sets */}
      <Section title="Most popular sets (avg ELO)">
        {!sets ? (
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Load the data for this chart. (Displays 10 rows at a time)
            </div>
            <button
              className="text-xs px-2 py-1 rounded border"
              onClick={() => load("sets")}
              disabled={!!loading.sets}
            >
              {loading.sets ? "Loading…" : "Load data"}
            </button>
          </div>
        ) : listSets.length === 0 ? (
          <div className="text-xs text-gray-500">No data.</div>
        ) : (
          <>
            <HBar data={listSets.slice(0, limitSets)} />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500">
                Showing {Math.min(limitSets, listSets.length)} / {listSets.length}
              </div>
              <button
                className="text-xs px-2 py-1 rounded border"
                onClick={() => setLimitSets((v) => Math.min(v + STEP, listSets.length))}
                disabled={limitSets >= listSets.length}
              >
                {limitSets >= listSets.length ? "All loaded" : "Load more"}
              </button>
            </div>
          </>
        )}
      </Section>

      {/* Artists */}
      <Section title="Most popular artists (avg ELO, min 3 cards)">
        {!artists ? (
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Load the data for this chart. (Displays 10 rows at a time)
            </div>
            <button
              className="text-xs px-2 py-1 rounded border"
              onClick={() => load("artists")}
              disabled={!!loading.artists}
            >
              {loading.artists ? "Loading…" : "Load data"}
            </button>
          </div>
        ) : listArtists.length === 0 ? (
          <div className="text-xs text-gray-500">No data.</div>
        ) : (
          <>
            <HBar data={listArtists.slice(0, limitArtists)} />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500">
                Showing {Math.min(limitArtists, listArtists.length)} / {listArtists.length}
              </div>
              <button
                className="text-xs px-2 py-1 rounded border"
                onClick={() => setLimitArtists((v) => Math.min(v + STEP, listArtists.length))}
                disabled={limitArtists >= listArtists.length}
              >
                {limitArtists >= listArtists.length ? "All loaded" : "Load more"}
              </button>
            </div>
          </>
        )}
      </Section>

      {/* Rarities */}
      <Section title="Popularities by rarity (avg ELO)">
        {!rarities ? (
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Load the data for this chart. (Displays 10 rows at a time)
            </div>
            <button
              className="text-xs px-2 py-1 rounded border"
              onClick={() => load("rarities")}
              disabled={!!loading.rarities}
            >
              {loading.rarities ? "Loading…" : "Load data"}
            </button>
          </div>
        ) : listRarities.length === 0 ? (
          <div className="text-xs text-gray-500">No data.</div>
        ) : (
          <>
            <HBar data={listRarities.slice(0, limitRarities)} />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500">
                Showing {Math.min(limitRarities, listRarities.length)} / {listRarities.length}
              </div>
              <button
                className="text-xs px-2 py-1 rounded border"
                onClick={() => setLimitRarities((v) => Math.min(v + STEP, listRarities.length))}
                disabled={limitRarities >= listRarities.length}
              >
                {limitRarities >= listRarities.length ? "All loaded" : "Load more"}
              </button>
            </div>
          </>
        )}
      </Section>

      {/* Years (kept as area) */}
      <Section title="Popularity by year (avg ELO)">
        {!years ? (
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Load the data for this chart.</div>
            <button
              className="text-xs px-2 py-1 rounded border"
              onClick={() => load("years")}
              disabled={!!loading.years}
            >
              {loading.years ? "Loading…" : "Load data"}
            </button>
          </div>
        ) : listYears.length === 0 ? (
          <div className="text-xs text-gray-500">No data.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={listYears} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
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
      </Section>
    </section>
  );
}
