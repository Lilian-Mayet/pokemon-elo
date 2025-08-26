import React from 'react';
import { SearchAndStats } from '../features/search/SearchAndStats';

export default function SearchPage() {
  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Search & Stats</h1>
      <SearchAndStats />
    </section>
  );
}
