import { Outlet } from 'react-router-dom';
import Navbar      from './Navbar';
import BottomNav   from './BottomNav';
import MusicPlayer from './MusicPlayer';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-g-bg flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-screen-xl mx-auto px-3 sm:px-4
                       pt-4 pb-24 md:pb-8">
        <Outlet />
      </main>
      <BottomNav />
      <MusicPlayer />
    </div>
  );
}
