import React from 'react';
import { api } from '../../lib/api';
import { eloDelta } from '../../lib/elo';
import type { Card } from '../../types';
import { CardPreview } from '../../components/CardPreview';
import { EloDeltaBadge } from '../../components/EloDeltaBadge';

export function DuelArena() {
  const [pair, setPair] = React.useState<{ a: Card | null; b: Card | null }>({ a: null, b: null });
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [lastDelta, setLastDelta] = React.useState<{ winner: number; loser: number }>({ winner: 0, loser: 0 });

  const loadPair = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.pair();
      setPair({ a: data.a, b: data.b });
    } finally {
      setLoading(false);
      setLastDelta({ winner: 0, loser: 0 });
    }
  }, []);

  React.useEffect(() => {
    loadPair();
  }, [loadPair]);

  const handleChoose = async (winnerId: string) => {
    if (submitting || !pair.a || !pair.b) return;
    setSubmitting(true);

    const winner = winnerId === pair.a.id ? pair.a : pair.b;
    const loser = winnerId === pair.a.id ? pair.b : pair.a;

    // Optimistic update
    const dw = eloDelta(winner.elo, loser.elo, 1, winner.games_played || 0);
    const dl = eloDelta(loser.elo, winner.elo, 0, loser.games_played || 0);
    setPair(({ a, b }) => ({
      a: a && (a.id === winner.id
        ? { ...a, elo: a.elo + dw, games_played: (a.games_played || 0) + 1, wins: (a.wins || 0) + 1 }
        : { ...a, elo: a.elo + dl, games_played: (a.games_played || 0) + 1, losses: (a.losses || 0) + 1 }),
      b: b && (b.id === winner.id
        ? { ...b, elo: b.elo + dw, games_played: (b.games_played || 0) + 1, wins: (b.wins || 0) + 1 }
        : { ...b, elo: b.elo + dl, games_played: (b.games_played || 0) + 1, losses: (b.losses || 0) + 1 }),
    }));
    setLastDelta({ winner: dw, loser: dl });

    try {
      await api.duel({ winnerId: winner.id, loserId: loser.id });
      // Dès que le duel est validé → nouvelle paire directe
      await loadPair();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium opacity-70">Choice A</h3>
            {pair.a && <EloDeltaBadge delta={lastDelta.winner} />}
          </div>
          <div className="max-w-xs mx-auto">
            <CardPreview data={pair.a} onChoose={handleChoose} disabled={submitting} size="sm" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium opacity-70">Choice B</h3>
            {pair.b && <EloDeltaBadge delta={lastDelta.loser} />}
          </div>
          <div className="max-w-xs mx-auto">
            <CardPreview data={pair.b} onChoose={handleChoose} disabled={submitting} size="sm" />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Click a card to vote. A new duel appears instantly.
      </p>
    </div>
  );
}
