import React from "react";
import { useSearchParams, Link } from "react-router-dom";

type CardRow = {
  id: string;
  name: string;
  image: string;
  artist: string | null;
  elo: number;
  rarity?: string | null;
  set_id: string;             // ✅ now provided by backend
  set_name: string;
  series: string;
  release_date: string | null;
};

type SeriesGroup = {
  series: string;
  release_date: string | null;
  sets: { id: string; name: string; series: string; release_date: string | null; logo_image?: string | null }[];
};

type SortKey = "elo_desc" | "elo_asc" | "date_desc" | "date_asc";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function j<T>(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();

  // Query state (restored from URL)
  const [q, setQ] = React.useState(sp.get("q") ?? "");
  const [eloMin, setEloMin] = React.useState(sp.get("elo_min") ?? "");
  const [eloMax, setEloMax] = React.useState(sp.get("elo_max") ?? "");
  const [dateFrom, setDateFrom] = React.useState(sp.get("date_from") ?? "");
  const [dateTo, setDateTo] = React.useState(sp.get("date_to") ?? "");
  const [series, setSeries] = React.useState(sp.get("series") ?? "");
  const [setId, setSetId] = React.useState(sp.get("set_id") ?? "");
  const [artist, setArtist] = React.useState(sp.get("artist") ?? "");
  const [rarity, setRarity] = React.useState(sp.get("rarity") ?? "");
  const [sort, setSort] = React.useState<SortKey>((sp.get("sort") as SortKey) || "elo_desc");

  // UI/data
  const [tree, setTree] = React.useState<SeriesGroup[]>([]);
  const [items, setItems] = React.useState<CardRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const limit = 50;

  // Load series/sets tree (for filters)
  React.useEffect(() => {
    (async () => {
      try {
        const g = await j<SeriesGroup[]>("/sets_tree");
        setTree(g);
      } catch {
        setTree([]);
      }
    })();
  }, []);

  // keep URL in sync with filters
  React.useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (eloMin) next.set("elo_min", eloMin);
    if (eloMax) next.set("elo_max", eloMax);
    if (dateFrom) next.set("date_from", dateFrom);
    if (dateTo) next.set("date_to", dateTo);
    if (series) next.set("series", series);
    if (setId) next.set("set_id", setId);
    if (artist) next.set("artist", artist);
    if (rarity) next.set("rarity", rarity);
    next.set("sort", sort);
    setSp(next, { replace: true });
  }, [q, eloMin, eloMax, dateFrom, dateTo, series, setId, artist, rarity, sort, setSp]);

  function buildQuery(offset: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (eloMin) p.set("elo_min", eloMin);
    if (eloMax) p.set("elo_max", eloMax);
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    if (series) p.set("series", series);
    if (setId) p.set("set_id", setId);
    if (artist) p.set("artist", artist);
    if (rarity) p.set("rarity", rarity);
    p.set("sort", sort);
    p.set("limit", String(limit));
    p.set("offset", String(offset));
    return `/search_advanced?${p.toString()}`;
  }

  async function runSearch(reset = true) {
    setLoading(true);
    try {
      const offset = reset ? 0 : items.length;
      const res = await j<{ items: CardRow[]; total: number }>(buildQuery(offset));
      setItems(reset ? res.items : [...items, ...res.items]);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  }

  // auto-run on first load (if URL has filters)
  React.useEffect(() => {
    if (sp.toString()) runSearch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when series changes, reset setId to keep consistency
  React.useEffect(() => {
    if (!series) setSetId("");
  }, [series]);

  const setsForSeries = React.useMemo(
    () => tree.find(s => s.series === series)?.sets || [],
    [tree, series]
  );

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Filters */}
      <aside className="border rounded-md p-3 space-y-3">
        <div className="text-sm font-semibold">Filters</div>

        <div className="space-y-2">
          <label className="text-xs">Text</label>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="name, artist, set…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch(true)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs">ELO min</label>
            <input
              className="border rounded px-2 py-2 w-full"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 1100"
              value={eloMin}
              onChange={(e) => setEloMin(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs">ELO max</label>
            <input
              className="border rounded px-2 py-2 w-full"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 1600"
              value={eloMax}
              onChange={(e) => setEloMax(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs">Date from</label>
            <input
              className="border rounded px-2 py-2 w-full"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs">Date to</label>
            <input
              className="border rounded px-2 py-2 w-full"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs">Series</label>
          <select
            className="border rounded px-2 py-2 w-full"
            value={series}
            onChange={(e) => setSeries(e.target.value)}
          >
            <option value="">Any</option>
            {tree.map((s) => (
              <option key={s.series} value={s.series}>
                {s.series}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs">Set</label>
          <select
            className="border rounded px-2 py-2 w-full"
            value={setId}
            onChange={(e) => setSetId(e.target.value)}
            disabled={!series}
          >
            <option value="">Any</option>
            {setsForSeries.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs">Artist</label>
            <input
              className="border rounded px-2 py-2 w-full"
              placeholder="contains…"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs">Rarity</label>
            <input
              className="border rounded px-2 py-2 w-full"
              placeholder="contains…"
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs">Sort</label>
          <select
            className="border rounded px-2 py-2 w-full"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <optgroup label="ELO">
              <option value="elo_desc">ELO ↓</option>
              <option value="elo_asc">ELO ↑</option>
            </optgroup>
            <optgroup label="Date (set release)">
              <option value="date_desc">Newest</option>
              <option value="date_asc">Oldest</option>
            </optgroup>
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <button className="px-3 py-2 rounded border" onClick={() => runSearch(true)} disabled={loading}>
            {loading ? "…" : "Search"}
          </button>
          <button
            className="px-3 py-2 rounded border"
            onClick={() => {
              setQ(""); setEloMin(""); setEloMax("");
              setDateFrom(""); setDateTo("");
              setSeries(""); setSetId(""); setArtist(""); setRarity("");
              setSort("elo_desc");
              setItems([]); setTotal(0);
              setSp(new URLSearchParams(), { replace: true });
            }}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </aside>

      {/* Results */}
      <div className="border rounded-md overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[11px] font-semibold uppercase text-gray-500 border-b bg-gray-50">
          <div className="col-span-5">Card</div>
          <div className="col-span-2">ELO</div>
          <div className="col-span-2">Rarity</div>
          <div className="col-span-3">Set · Date</div>
        </div>

        {items.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">
            {loading ? "Loading…" : "Use the filters on the left, then press Search."}
          </div>
        ) : (
          <>
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-12 gap-3 px-3 py-2 items-center hover:bg-gray-50">
                {/* Card (clickable to card page) */}
                <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                  <Link to={`/cards/${encodeURIComponent(it.id)}`} className="shrink-0">
                    <img src={it.image} alt={it.name} className="h-12 w-10 object-cover rounded border" />
                  </Link>
                  <div className="truncate">
                    <Link
                      to={`/cards/${encodeURIComponent(it.id)}`}
                      className="text-sm font-medium truncate hover:underline"
                      title={it.name}
                    >
                      {it.name}
                    </Link>
                    <div className="text-xs text-gray-500 truncate">
                      {it.series} · {it.artist || "Unknown"}
                    </div>
                  </div>
                </div>

                {/* ELO */}
                <div className="col-span-2 font-semibold"> {Math.round(it.elo)} </div>

                {/* Rarity */}
                <div className="col-span-2 text-xs">{it.rarity || "—"}</div>

                {/* Set (clickable to set page) */}
                <div className="col-span-3 text-xs truncate">
                  <Link
                    to={`/sets/${encodeURIComponent(it.set_id)}`}
                    className="underline underline-offset-2 hover:opacity-90"
                    title={it.set_name}
                  >
                    {it.set_name}
                  </Link>
                  {it.release_date ? ` · ${it.release_date.slice(0,10)}` : ""}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between p-3 border-t bg-white">
              <div className="text-xs text-gray-500">{items.length} / {total} shown</div>
              <button
                className="px-3 py-1.5 text-sm rounded border"
                onClick={() => runSearch(false)}
                disabled={loading || items.length >= total}
              >
                {items.length >= total ? "All loaded" : (loading ? "Loading…" : "Load more")}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
