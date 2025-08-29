import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { eloDelta } from '../../lib/elo';
import type { Card } from '../../types';
import { EloDeltaBadge } from '../../components/EloDeltaBadge';

type Pair = { a: Card | null; b: Card | null };
type LastResult = {
  winner: Card;
  loser: Card;
  deltaWinner: number;
  deltaLoser: number;
};

export function DuelArena() {
  const [pair, setPair] = React.useState<Pair>({ a: null, b: null });
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [last, setLast] = React.useState<LastResult | null>(null);

  const loadPair = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.pair();
      setPair({ a: data.a, b: data.b });
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPair();
  }, [loadPair]);

  async function handleChoose(winnerId: string) {
    if (submitting || !pair.a || !pair.b) return;
    setSubmitting(true);
    setSelectedId(winnerId);

    const winner = winnerId === pair.a.id ? pair.a : pair.b;
    const loser = winnerId === pair.a.id ? pair.b : pair.a;

    // deltas (optimistic, pour l’encart d’infos)
    const dw = eloDelta(winner.elo, loser.elo, 1, winner.games_played || 0);
    const dl = eloDelta(loser.elo, winner.elo, 0, loser.games_played || 0);

    // Mémorise l’info du vote pour affichage (pendant que le nouveau duel charge)
    setLast({
      winner: { ...winner, elo: winner.elo + dw, wins: (winner.wins || 0) + 1, games_played: (winner.games_played || 0) + 1 },
      loser: { ...loser, elo: loser.elo + dl, losses: (loser.losses || 0) + 1, games_played: (loser.games_played || 0) + 1 },
      deltaWinner: dw,
      deltaLoser: dl,
    });

    try {
      // Commit côté serveur
      await api.duel({ winnerId: winner.id, loserId: loser.id });
    } finally {
      // Charge immédiatement une nouvelle paire (pas de délai)
      await loadPair();
      setSubmitting(false);
      // Efface l’encart après 3.5s
      window.setTimeout(() => setLast(null), 3500);
    }
  }

  return (
    <div className="space-y-5">
      {/* Instruction de vote */}
      <div className="rounded-md border bg-amber-50 text-amber-900 dark:bg-amber-900/15 dark:text-amber-200 px-4 py-3 text-sm">
        Vote en <b>suivant ton goût personnel</b> — n’utilise ni la hype ni le prix, juste ta conviction sur l’illustration/la carte.
      </div>

      {/* Grille duel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <DuelCard
          card={pair.a}
          onVote={() => pair.a && handleChoose(pair.a.id)}
          selected={selectedId === pair.a?.id}
          disabled={submitting || loading || !pair.a}
          label="Choice A"
        />
        <DuelCard
          card={pair.b}
          onVote={() => pair.b && handleChoose(pair.b.id)}
          selected={selectedId === pair.b?.id}
          disabled={submitting || loading || !pair.b}
          label="Choice B"
        />
      </div>

      {/* Encart résultat du dernier vote */}
      <AnimatePresence>
        {last && (
          <motion.div
            className="rounded-lg border p-4 bg-gray-50 dark:bg-neutral-900"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <div className="text-sm font-semibold mb-2">Last vote</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-md border p-3 bg-white dark:bg-neutral-950">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Winner</span>
                  <EloDeltaBadge delta={last.deltaWinner} />
                </div>
                <div className="flex items-center gap-3">
                  <img src={last.winner.image} alt={last.winner.name} className="h-14 w-12 object-cover rounded" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{last.winner.name}</div>
                    <div className="text-xs text-gray-500 truncate">{last.winner.set_name} · {last.winner.series}</div>
                    <div className="text-xs text-gray-500">Artist: {last.winner.artist || 'Unknown'}</div>
                    <div className="text-xs">ELO: {Math.round(last.winner.elo)} · Games: {last.winner.games_played} · W: {last.winner.wins || 0}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-md border p-3 bg-white dark:bg-neutral-950">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Loser</span>
                  <EloDeltaBadge delta={last.deltaLoser} />
                </div>
                <div className="flex items-center gap-3">
                  <img src={last.loser.image} alt={last.loser.name} className="h-14 w-12 object-cover rounded" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{last.loser.name}</div>
                    <div className="text-xs text-gray-500 truncate">{last.loser.set_name} · {last.loser.series}</div>
                    <div className="text-xs text-gray-500">Artist: {last.loser.artist || 'Unknown'}</div>
                    <div className="text-xs">ELO: {Math.round(last.loser.elo)} · Games: {last.loser.games_played} · L: {last.loser.losses || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-gray-500 text-center">
        Clique “Vote” sous une carte pour sélectionner ton favori. Le prochain duel charge instantanément.
      </p>
    </div>
  );
}

/** Carte compacte + bouton Vote externe (pas d’overlay) avec animation sur sélection */
function DuelCard({
  card,
  onVote,
  selected,
  disabled,
  label,
}: {
  card: Card | null;
  onVote: () => void;
  selected: boolean;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium opacity-70">{label}</h3>
      </div>

      <motion.div
        className="border rounded-lg overflow-hidden bg-white dark:bg-neutral-950 shadow-sm"
        initial={false}
        animate={selected ? { scale: 0.98, rotate: -0.4, boxShadow: '0 10px 18px rgba(0,0,0,0.15)' } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        {/* Header infos */}
        <div className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold truncate">{card?.name || '...'}</div>
              <div className="text-xs text-gray-500 truncate">{card?.set_name} · {card?.series}</div>
              <div className="text-xs text-gray-500">Artist: {card?.artist || 'Unknown'}</div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
              ELO {card ? Math.round(card.elo) : '—'}
            </span>
          </div>
        </div>

        {/* Image */}
        <div className="relative aspect-[2.5/3.5] w-[170px]  overflow-hidden bg-gray-100">
          {card ? (
            <img
              src={card.image}
              alt={card.name}
              className="h-full w-full object-cover object-center"
              draggable={false}
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full animate-pulse" />
          )}
        </div>

        {/* Footer infos */}
        <div className="p-3 text-xs text-gray-500 flex items-center justify-between">
          <div>Games · {card?.games_played ?? 0}</div>
          <div>W/L · {(card?.wins || 0)} / {(card?.losses || 0)}</div>
        </div>
      </motion.div>

      {/* Bouton vote externe (ne masque rien) */}
      <button
        className="w-full rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onVote}
        disabled={disabled || !card}
      >
        Vote
      </button>
    </div>
  );
}
