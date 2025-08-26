import React from 'react';
import { DuelArena } from '../features/duel/DuelArena';

export default function DuelPage() {
  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Play</h1>
      <DuelArena />
    </section>
  );
}
