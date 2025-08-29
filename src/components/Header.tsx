import React from 'react';
import { NavLink } from 'react-router-dom';

export function Header({ darkMode, onToggleDark }: { darkMode: boolean; onToggleDark: () => void }) {
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm ${isActive ? 'text-black dark:text-white font-medium' : 'opacity-80 hover:opacity-100'}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur dark:bg-neutral-900/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <NavLink to="/duel" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 font-bold">E</span>
          <span className="text-sm font-semibold">Pokémon ELO</span>
        </NavLink>
        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/duel" className={linkCls}>Play</NavLink>
          <NavLink to="/leaderboard" className={linkCls}>Leaderboard</NavLink>
          <NavLink to="/search" className={linkCls}>Search</NavLink>
           <NavLink to="/stats" className={linkCls}>Stats</NavLink>
           <NavLink to="/set" className={linkCls}>Sets</NavLink>
          <a className="text-sm opacity-60 hover:opacity-100 underline underline-offset-4"
             href="https://www.chess.com/terms/elo-rating-system" target="_blank" rel="noreferrer">
            What is ELO?
          </a>
        </nav>
        <label className="flex items-center gap-2 text-sm select-none cursor-pointer">
          <span>Dark</span>
          <input type="checkbox" checked={darkMode} onChange={onToggleDark} />
        </label>
      </div>
    </header>
  );
}
