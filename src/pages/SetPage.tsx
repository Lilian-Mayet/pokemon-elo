import React from "react";
import { useSearchParams } from "react-router-dom";

/** Types expected from API */
type SetRow = {
  id: string;
  name: string;
  series: string;
  release_date: string | null; // ISO
  logo_image?: string | null;  // NEW (optional)
};
type SeriesGroup = {
  series: string;
  release_date: string | null;
  sets: SetRow[];
};

type CardRow = {
  id: string;     // e.g., base1-100, bw11-RC12
  name: string;
  image: string;
  set_name: string;
  series: string;
  artist: string | null;
  elo: number;
};

type SortKey = "elo_desc" | "elo_asc" | "id_asc" | "id_desc";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/** tiny fetch helper */
async function j<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Try /sets_tree (with optional logo_image), fallback to /sets */
async function fetchSeriesTree(): Promise<SeriesGroup[]> {
  try {
    const tree = await j<SeriesGroup[]>("/sets_tree");
    return tree
      .map(g => ({
        ...g,
        sets: [...(g.sets || [])].sort((a, b) =>
          (a.release_date || "").localeCompare(b.release_date || "") || a.name.localeCompare(b.name)
        ),
      }))
      .sort((a, b) =>
        (a.release_date || "").localeCompare(b.release_date || "") || a.series.localeCompare(b.series)
      );
  } catch {
    const flat = await j<SetRow[]>("/sets");
    const groups = new Map<string, SeriesGroup>();
    for (const s of flat) {
      if (!groups.has(s.series)) {
        groups.set(s.series, { series: s.series, release_date: null, sets: [] });
      }
      groups.get(s.series)!.sets.push(s);
    }
    const list = Array.from(groups.values()).map(g => {
      const dates = g.sets.map(s => s.release_date).filter(Boolean) as string[];
      const min = dates.sort()[0] || null;
      return { ...g, release_date: min };
    });
    return list
      .map(g => ({
        ...g,
        sets: g.sets.sort((a, b) =>
          (a.release_date || "").localeCompare(b.release_date || "") || a.name.localeCompare(b.name)
        ),
      }))
      .sort((a, b) =>
        (a.release_date || "").localeCompare(b.release_date || "") || a.series.localeCompare(b.series)
      );
  }
}

/** Fetch all cards of a set ONCE (default sort from server doesn't matter) */
async function fetchSetCardsRaw(setId: string): Promise<CardRow[]> {
  // If your backend requires a sort param, pass anything; we’ll sort on the client anyway.
  const data = await j<{ items: CardRow[] }>(`/sets/${setId}/cards?sort=id_asc`);
  return data.items || [];
}

/** Utilities for “ID order” (after '-') */
type ParsedId = {
  hasAlpha: boolean;
  prefix: string; // e.g., "RC" or "" if none
  num: number;    // parsed number; -Infinity if not found
  raw: string;
};
function parseCardId(id: string): ParsedId {
  const after = (id.split("-")[1] || "").trim();
  // Prefer strict pattern: letters then digits
  let m = after.match(/^([A-Za-z]*)(\d+)$/);
  if (!m) {
    // fallback: capture any non-digits then digits
    m = after.match(/^(\D*)(\d+)$/);
  }
  if (m) {
    const [, letters = "", digits = ""] = m;
    return {
      hasAlpha: !!letters,
      prefix: letters.toUpperCase(),
      num: digits ? parseInt(digits, 10) : Number.NEGATIVE_INFINITY,
      raw: after,
    };
  }
  return { hasAlpha: false, prefix: "", num: Number.NEGATIVE_INFINITY, raw: after };
}

/**
 * “Set order (id)” comparator.
 * Rules:
 * 1) Numeric-only suffix FIRST, then lettered subsets (hasAlpha=true) AFTER numeric (both for asc and desc).
 * 2) Within numeric block: sort by number asc/desc.
 * 3) Within lettered block: sort by prefix asc/desc, then by number asc/desc.
 * 4) Fallback to lexical id.
 */
function makeIdComparator(dir: "asc" | "desc") {
  const factor = dir === "asc" ? 1 : -1;
  return (a: CardRow, b: CardRow) => {
    const pa = parseCardId(a.id);
    const pb = parseCardId(b.id);
    // Block order: numeric (hasAlpha=false) always before lettered (hasAlpha=true)
    if (pa.hasAlpha !== pb.hasAlpha) {
      return pa.hasAlpha ? 1 : -1; // numeric first
    }
    if (!pa.hasAlpha && !pb.hasAlpha) {
      // numeric block: compare numbers
      if (pa.num !== pb.num) return factor * (pa.num - pb.num);
      return factor * a.id.localeCompare(b.id);
    }
    // lettered block: prefix then numbers
    const pcmp = pa.prefix.localeCompare(pb.prefix);
    if (pcmp !== 0) return factor * pcmp;
    if (pa.num !== pb.num) return factor * (pa.num - pb.num);
    return factor * a.id.localeCompare(b.id);
  };
}

/** ELO comparator */
function makeEloComparator(dir: "asc" | "desc") {
  const factor = dir === "asc" ? 1 : -1;
  return (a: CardRow, b: CardRow) => factor * (a.elo - b.elo);
}

export default function SetPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSet = searchParams.get("set") || "";
  const initialSort = (searchParams.get("sort") as SortKey) || "elo_desc";

  const [tree, setTree] = React.useState<SeriesGroup[]>([]);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [currentSetId, setCurrentSetId] = React.useState<string>(initialSet);
  const [sort, setSort] = React.useState<SortKey>(initialSort);

  // Cache: setId -> raw cards (we sort client-side)
  const [cardsCache, setCardsCache] = React.useState<Record<string, CardRow[]>>({});
  const currentCards = cardsCache[currentSetId] || [];

  const [loadingTree, setLoadingTree] = React.useState(true);
  const [loadingCards, setLoadingCards] = React.useState(false);

  // Load the series→sets tree
  React.useEffect(() => {
    (async () => {
      setLoadingTree(true);
      try {
        const g = await fetchSeriesTree();
        setTree(g);
        // auto-expand the series that contains the current setId (if any)
        if (initialSet) {
          const found = g.find(sr => sr.sets.some(s => s.id === initialSet));
          if (found) setExpanded(prev => ({ ...prev, [found.series]: true }));
        }
      } finally {
        setLoadingTree(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load raw cards ONLY when set changes (not on sort changes)
  React.useEffect(() => {
    if (!currentSetId) return;
    if (cardsCache[currentSetId]) return; // already cached
    (async () => {
      setLoadingCards(true);
      try {
        const list = await fetchSetCardsRaw(currentSetId);
        setCardsCache(prev => ({ ...prev, [currentSetId]: list }));
      } finally {
        setLoadingCards(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSetId]);

  // keep URL updated
  React.useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    if (currentSetId) sp.set("set", currentSetId); else sp.delete("set");
    sp.set("sort", sort);
    setSearchParams(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSetId, sort]);

  const toggleSeries = (name: string) =>
    setExpanded(e => ({ ...e, [name]: !e[name] }));

  // Derived / sorted view (client-side)
  const sortedCards = React.useMemo(() => {
    if (!currentCards.length) return currentCards;
    switch (sort) {
      case "elo_asc":
        return [...currentCards].sort(makeEloComparator("asc"));
      case "elo_desc":
        return [...currentCards].sort(makeEloComparator("desc"));
      case "id_asc":
        return [...currentCards].sort(makeIdComparator("asc"));
      case "id_desc":
        return [...currentCards].sort(makeIdComparator("desc"));
      default:
        return currentCards;
    }
  }, [currentCards, sort]);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* MAIN: cards */}
      <div className="min-h-[60vh]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm">
            {currentSetId ? (
              <span className="opacity-70">Set:</span>
            ) : (
              <span className="opacity-70">Pick a set →</span>
            )}{" "}
            <b>{currentSetId || "none"}</b>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Sort</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              disabled={!currentSetId}
            >
              <optgroup label="By ranking (ELO)">
                <option value="elo_desc">ELO ↓</option>
                <option value="elo_asc">ELO ↑</option>
              </optgroup>
              <optgroup label="Set order (id)">
                <option value="id_asc">ID A→Z</option>
                <option value="id_desc">ID Z→A</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="rounded-md border overflow-hidden">
          {loadingCards && currentSetId && !cardsCache[currentSetId] ? (
            <div className="p-6 text-sm text-gray-500">Loading cards…</div>
          ) : !currentSetId ? (
            <div className="p-6 text-sm text-gray-500">Select a set from the right panel.</div>
          ) : sortedCards.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No cards found for this set.</div>
          ) : (
            <div className="max-h-[70vh] overflow-auto divide-y">
              {sortedCards.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                  <img src={c.image} alt={c.name} className="h-14 w-12 object-cover rounded" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {c.set_name} · {c.series} · {c.artist || "Unknown"}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">ID: {c.id}</div>
                  </div>
                  <div className="text-xs font-semibold shrink-0">ELO {Math.round(c.elo)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SIDEBAR: series → sets (right) with logos */}
      <aside className="lg:order-last">
        <div className="border rounded-md p-3">
          <div className="text-sm font-semibold mb-2">Series & Sets</div>
          {loadingTree ? (
            <div className="text-xs text-gray-500">Loading series…</div>
          ) : tree.length === 0 ? (
            <div className="text-xs text-gray-500">No series found.</div>
          ) : (
            <div className="space-y-2 max-h-[75vh] overflow-auto pr-1">
              {tree.map((sr) => {
                const isOpen = !!expanded[sr.series];
                const sDate = sr.release_date?.slice(0, 10) || "—";
                return (
                  <div key={sr.series} className="rounded border">
                    <button
                      className="w-full text-left px-3 py-2 text-sm font-medium bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => setExpanded(e => ({ ...e, [sr.series]: !e[sr.series] }))}
                    >
                      <span className="truncate">{sr.series}</span>
                      <span className="ml-3 text-xs text-gray-500">{sDate}</span>
                    </button>
                    {isOpen && (
                      <div className="divide-y">
                        {sr.sets.map((s) => {
                          const d = s.release_date?.slice(0, 10) || "—";
                          const active = s.id === currentSetId;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setCurrentSetId(s.id)}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-gray-50 ${active ? "bg-indigo-50/60" : ""}`}
                            >
                              {/* tiny logo if available */}
                              {s.logo_image ? (
                                <img
                                  src={s.logo_image}
                                  alt={`${s.name} logo`}
                                  className="h-6 w-auto object-contain shrink-0"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="h-6 w-6 shrink-0 rounded bg-gray-100" />
                              )}
                              <span className="truncate flex-1">{s.name}</span>
                              <span className="ml-2 text-xs text-gray-500">{d}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}
