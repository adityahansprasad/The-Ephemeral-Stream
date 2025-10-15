
import React from 'react';
import BinauralPlayer from './components/BinauralPlayer';

const App: React.FC = () => {
  return (
    <main className="bg-amber-50 text-black w-screen h-screen flex flex-col items-center justify-center antialiased overflow-hidden font-serif">
      <BinauralPlayer />
      <footer className="absolute bottom-4 text-center text-xs text-neutral-500">
        <p>Inspired by The Creative Act</p>
      </footer>
    </main>
  );
};

export default App;
