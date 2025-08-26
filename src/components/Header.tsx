import React from 'react';


export function Header({ darkMode, onToggleDark }: { darkMode: boolean; onToggleDark: () => void }) {
return (
<header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur dark:bg-neutral-900/70">
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
<a href="#play" className="flex items-center gap-2">
<span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 font-bold">E</span>
<span className="text-sm font-semibold">Pokémon ELO</span>
</a>
<nav className="hidden md:flex items-center gap-6 text-sm">
<a className="opacity-80 hover:opacity-100" href="#play">Play</a>
<a className="opacity-80 hover:opacity-100" href="#leaderboard">Leaderboard</a>
<a className="opacity-80 hover:opacity-100" href="#search">Search & Stats</a>
<a className="opacity-60 hover:opacity-100 underline underline-offset-4" href="https://www.chess.com/terms/elo-rating-chess#what-is-elo-rating" target="_blank" rel="noreferrer">What is ELO?</a>
</nav>
<label className="flex items-center gap-2 text-sm select-none cursor-pointer">
<span>Dark</span>
<input type="checkbox" checked={darkMode} onChange={onToggleDark} />
</label>
</div>
</header>
);
}