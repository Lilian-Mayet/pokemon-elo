import React from "react";
import { useParams, Link } from "react-router-dom";

type SetInfo = {
  id: string;
  name: string;
  series: string;
  release_date: string | null;
  logo_image?: string | null;
  cards_count: number;
  avg_elo: number;
};

type CardRow = {
  id: string;
  name: string;
  image: string;
  artist: string | null;
  elo: number;
  set_name: string;
  series: string;
};

type SortKey = "elo_desc" | "elo_asc" | "id_asc" | "id_desc";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function j<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function parseIdAfterDash(id: string) {
  const after = (id.split("-")[1] || "").trim();
  let m = after.match(/^([A-Za-z]*)(\d+)$/) || after.match(/^(\D*)(\d+)$/);
  if (m) {
    const [, letters = "", digits = ""] = m;
    return { hasAlpha: !!letters, prefix: letters.toUpperCase(), num: digits ? parseInt(digits, 10) : -Infinity, raw: after };
  }
  return { hasAlpha: false, prefix: "", num: -Infinity, raw: after };
}
function makeIdComparator(dir: "asc"|"desc") {
  const k = dir === "asc" ? 1 : -1;
  return (a: CardRow, b: CardRow) => {
    const pa = parseIdAfterDash(a.id), pb = parseIdAfterDash(b.id);
    if (pa.hasAlpha !== pb.hasAlpha) return pa.hasAlpha ? 1 : -1;
    if (!pa.hasAlpha && !pb.hasAlpha) {
      if (pa.num !== pb.num) return k * (pa.num - pb.num);
      return k * a.id.localeCompare(b.id);
    }
    const pcmp = pa.prefix.localeCompare(pb.prefix);
    if (pcmp !== 0) return k * pcmp;
    if (pa.num !== pb.num) return k * (pa.num - pb.num);
    return k * a.id.localeCompare(b.id);
  };
}
function makeEloComparator(dir: "asc"|"desc") {
  const k = dir === "asc" ? 1 : -1;
  return (a: CardRow, b: CardRow) => k * (a.elo - b.elo);
}

export default function SetInfoPage() {
  const { setId } = useParams<{ setId: string }>();
  const [info, setInfo] = React.useState<SetInfo | null>(null);
  const [cards, setCards] = React.useState<CardRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sort, setSort] = React.useState<SortKey>("elo_desc");

  React.useEffect(() => {
    let aborted = false;
    (async () => {
      if (!setId) return;
      setLoading(true);
      try {
        const [i, cs] = await Promise.all([
          j<SetInfo>(`/sets/${setId}`),
          j<{ items: CardRow[] }>(`/sets/${setId}/cards?sort=id_asc`), // any sort; we sort client-side
        ]);
        if (!aborted) {
          setInfo(i);
          setCards(cs.items || []);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [setId]);

  const sorted = React.useMemo(() => {
    if (!cards.length) return cards;
    switch (sort) {
      case "elo_asc": return [...cards].sort(makeEloComparator("asc"));
      case "elo_desc": return [...cards].sort(makeEloComparator("desc"));
      case "id_asc": return [...cards].sort(makeIdComparator("asc"));
      case "id_desc": return [...cards].sort(makeIdComparator("desc"));
      default: return cards;
    }
  }, [cards, sort]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading set…</div>;
  if (!info) return <div className="p-6 text-sm text-gray-500">Set not found.</div>;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        {info.logo_image ? (
          <img src={info.logo_image} alt={`${info.name} logo`} className="h-10 w-auto object-contain" />
        ) : (
          <span className="h-10 w-10 bg-gray-100 rounded" />
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight truncate">{info.name}</h1>
          <div className="text-sm text-gray-500">
            {info.series} {info.release_date ? `· ${info.release_date.slice(0,10)}` : ""}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded border">Cards · {info.cards_count}</span>
          <span className="px-2 py-1 rounded border">Avg ELO · {Math.round(info.avg_elo)}</span>
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <label className="text-sm">Sort</label>
        <select className="border rounded px-2 py-1 text-sm" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
          <optgroup label="By ranking (ELO)">
            <option value="elo_desc">ELO ↓</option>
            <option value="elo_asc">ELO ↑</option>
          </optgroup>
          <optgroup label="Set order (ID)">
            <option value="id_asc">ID A→Z</option>
            <option value="id_desc">ID Z→A</option>
          </optgroup>
        </select>
      </div>

      {/* Cards */}
      <div className="rounded-md border overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No cards in this set.</div>
        ) : (
          <div className="max-h-[70vh] overflow-auto divide-y">
            {sorted.map((c) => (
              <Link to={`/cards/${encodeURIComponent(c.id)}`} key={c.id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                <img src={c.image} alt={c.name} className="h-14 w-12 object-cover rounded" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {c.series} · {c.artist || "Unknown"} · ID: <span className="font-mono">{c.id}</span>
                  </div>
                </div>
                <div className="text-xs font-semibold shrink-0">ELO {Math.round(c.elo)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
