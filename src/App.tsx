import React from 'react';
import { DuelArena } from './features/duel/DuelArena';
import { Leaderboard } from './features/leaderboard/Leaderboard';
import { SearchAndStats } from './features/search/SearchAndStats';
import { Header } from './components/Header';


export default function App() {
const [dark, setDark] = React.useState(false);
React.useEffect(() => {
document.documentElement.classList.toggle('dark', dark);
}, [dark]);


return (
<>
<Header darkMode={dark} onToggleDark={() => setDark(v => !v)} />
<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
<section id="play" className="pt-6">
<h2 className="text-lg font-semibold mb-3">Play</h2>
<DuelArena />
</section>


<section id="leaderboard" className="pt-10">
<h2 className="text-lg font-semibold mb-3">Leaderboard</h2>
<Leaderboard />
</section>


<section id="search" className="pt-10">
<h2 className="text-lg font-semibold mb-3">Search & Stats</h2>
<SearchAndStats />
</section>
</main>
</>
);
}