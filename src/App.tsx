import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import DuelPage from './pages/DuelPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SearchPage from './pages/SearchPage';
import StatsPage from './pages/StatsPage';
import SetPage from './pages/SetPage';

export default function App() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <>
      <Header darkMode={dark} onToggleDark={() => setDark(v => !v)} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/duel" replace />} />
          <Route path="/duel" element={<DuelPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/search" element={<SearchPage />} />
           <Route path="/stats" element={<StatsPage />} />
           <Route path="/set" element={<SetPage />} />
          {/* 404 simple */}
          <Route path="*" element={<div className="py-10 text-sm text-gray-500">Page not found.</div>} />
        </Routes>
      </main>
    </>
  );
}
