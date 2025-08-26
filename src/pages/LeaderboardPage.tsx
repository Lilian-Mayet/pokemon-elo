import React from 'react';
import { Leaderboard } from '../features/leaderboard/Leaderboard';

export default function LeaderboardPage() {
  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Leaderboard</h1>
      <Leaderboard />
    </section>
  );
}
