import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Card } from "../types";

type FullCard = Card & {
  rarity?: string | null;
  release_date?: string | null;
  set_id?: string; // ensure your /api/card/<id> returns this
};

export default function CardPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [card, setCard] = React.useState<FullCard | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let aborted = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await api.card(id);
        if (!aborted) setCard(data);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [id]);

  const nextTierProgressPct = React.useMemo(() => {
    const elo = card?.elo ?? 0;
    const p = ((elo % 200) / 200) * 100;
    return Math.max(0, Math.min(100, p));
  }, [card]);

  if (loading) {
    return (
      <section className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <div className="border rounded-xl overflow-hidden">
          <div className="aspect-[3/4] w-full bg-gray-200 animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-7 w-2/3 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
          </div>
        </div>
      </section>
    );
  }

  if (!card) {
    return (
      <section className="p-6 border rounded-lg">
        <div className="text-sm text-gray-500">Card not found.</div>
        <button className="mt-3 px-3 py-2 rounded border" onClick={() => nav(-1)}>Go back</button>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
      {/* Left: large image + quick facts footer */}
      <div className="border rounded-xl overflow-hidden bg-white dark:bg-neutral-950 shadow-sm">
        <div className="relative aspect-[3/4] w-full bg-gray-100">
          <img
            src={card.image}
            alt={card.name}
            className="h-full w-full object-cover object-center"
            loading="lazy"
            draggable={false}
          />
          <div className="absolute top-3 left-3 inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/90 backdrop-blur text-xs font-medium shadow">
            <span className="rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5">ELO {Math.round(card.elo)}</span>
            {card.rarity ? <span className="text-gray-600">{card.rarity}</span> : null}
          </div>
        </div>

        <div className="p-4 text-sm text-gray-600 flex items-center justify-between">
          <div className="truncate">
            <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{card.set_name}</div>
            <div className="text-xs truncate">{card.series}{card.release_date ? ` · ${card.release_date.slice(0,10)}` : ""}</div>
          </div>
          <div className="text-xs">ID&nbsp;•&nbsp;<span className="font-mono">{card.id}</span></div>
        </div>
      </div>

      {/* Right: info, stats, actions */}
      <div className="space-y-5">
        {/* Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-tight truncate">{card.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Artist: {card.artist || "Unknown"}
            </p>
          </div>
          <div className="shrink-0">
            <span className="text-sm px-3 py-1 rounded-full border">ELO {Math.round(card.elo)}</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Games" value={card.games_played ?? 0} />
          <StatBox label="Wins" value={card.wins ?? 0} />
          <StatBox label="Losses" value={card.losses ?? 0} />
        </div>

        {/* Tier progress */}
        <div className="border rounded-lg p-3">
          <div className="text-sm font-semibold mb-2">Progress to next tier</div>
          <div className="w-full bg-gray-100 rounded h-2">
            <div className="bg-gray-800 h-2 rounded" style={{ width: `${nextTierProgressPct}%` }} />
          </div>
          <div className="mt-1 text-xs text-gray-500">Tiers every 200 ELO</div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* name pre-filled in Search */}
          <Link
            to={`/search?q=${encodeURIComponent(card.name)}`}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
            title="See more cards with this Pokémon"
          >
            See more cards with this Pokémon
          </Link>

          {/* Artist page */}
          <Link
            to={card.artist ? `/artists/${encodeURIComponent(card.artist)}` : "#"}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
            onClick={(e) => { if (!card.artist) e.preventDefault(); }}
            title="More from this artist"
          >
            More from this artist
          </Link>

          {/* Set page */}
          <Link
            to={card.set_id ? `/sets/${encodeURIComponent(card.set_id)}` : "#"}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
            onClick={(e) => { if (!card.set_id) e.preventDefault(); }}
            title="See more from this set"
          >
            See more from this set
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
