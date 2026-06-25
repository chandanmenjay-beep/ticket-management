import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Ticket, LayoutDashboard, Settings, User, Users } from 'lucide-react';
import { signOut, useSession } from '../lib/auth.client';
import { useEffect } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      navigate('/login');
    }
  }, [session, isPending, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500 p-2 rounded-xl">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-white hidden sm:block">
                  {(session.user as any).role === 'admin' ? 'Helpdesk' : 'TicketMaster'}
                </span>
              </div>
              
              {(session.user as any).role === 'admin' && (
                <button
                  onClick={() => navigate('/users')}
                  className="hidden sm:flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Users</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-6">


              <div className="hidden md:flex items-center gap-2 text-zinc-400 bg-zinc-800/50 px-4 py-1.5 rounded-full border border-zinc-700/50">
                <User className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium">{session.user.name || session.user.email}</span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/30 hover:bg-zinc-800 px-4 py-2 rounded-xl transition-all border border-transparent hover:border-zinc-700"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Dashboard</h1>
          <p className="text-zinc-400">Welcome back! Here's an overview of your tickets.</p>
        </motion.div>

        {/* Dashboard Content area is ready for future implementation */}
      </main>
    </div>
  );
}
