import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Ticket, User, Users, Clock, AlertCircle, LayoutDashboard, Sparkles, LayoutPanelLeft } from 'lucide-react';
import { signOut, useSession } from '../lib/auth.client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TicketStats {
  totalTickets: number;
  openTickets: number;
  ticketsResolvedByAi: number;
  percentResolvedByAi: string;
  avgResolutionTimeHours: string;
}

interface ChartData {
  date: string;
  created: number;
  resolved: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = useSession();
  const [chartDays, setChartDays] = useState('30');

  const { data: statsData, isPending: isStatsPending } = useQuery<TicketStats>({
    queryKey: ['ticketStats'],
    queryFn: async () => {
      const response = await axios.get('/api/tickets/stats');
      return response.data;
    },
    enabled: !!session,
  });

  const { data: chartData, isPending: isChartPending } = useQuery<ChartData[]>({
    queryKey: ['ticketChart', chartDays],
    queryFn: async () => {
      const response = await axios.get(`/api/tickets/chart?days=${chartDays}`);
      return response.data;
    },
    enabled: !!session,
  });

  useEffect(() => {
    if (!isSessionPending && !session) {
      navigate('/login');
    }
  }, [session, isSessionPending, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isSessionPending || !session) {
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
              
              <div className="hidden sm:flex items-center gap-6 border-l border-zinc-800 pl-8">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 text-sm font-medium text-white transition-colors cursor-pointer"
                >
                  <LayoutPanelLeft className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => navigate('/tickets')}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Tickets</span>
                </button>

                {(session.user as any).role === 'admin' && (
                  <button
                    onClick={() => navigate('/users')}
                    className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Users</span>
                  </button>
                )}
              </div>
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
        <div className="mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Dashboard</h1>
            <p className="text-zinc-400">Welcome back! Here's an overview of your support desk.</p>
          </motion.div>
        </div>

        {/* Stats Dashboard */}
        {isStatsPending ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : statsData ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
          >
            {[
              { label: 'Total Tickets', value: statsData.totalTickets, icon: Ticket, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
              { label: 'Open Tickets', value: statsData.openTickets, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'AI Resolved', value: statsData.ticketsResolvedByAi, icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'AI Resolution %', value: `${statsData.percentResolvedByAi}%`, icon: Sparkles, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'Avg Time (hrs)', value: statsData.avgResolutionTimeHours, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
            ].map((stat, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${stat.bg} flex flex-col gap-2`}>
                <div className="flex justify-between items-start">
                  <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-white mt-1">{stat.value}</div>
              </div>
            ))}
          </motion.div>
        ) : null}

        {/* Chart Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl shadow-black/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-white">Ticket Trends</h2>
            <select
              value={chartDays}
              onChange={(e) => setChartDays(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="7">Last 7 Days</option>
              <option value="15">Last 15 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
          
          <div className="h-[400px] w-full">
            {isChartPending ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#a1a1aa" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#a1a1aa" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                    itemStyle={{ color: '#f4f4f5', padding: '2px 0' }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  <Bar 
                    name="Tickets Created" 
                    dataKey="created" 
                    fill="#818cf8" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={40}
                  />
                  <Bar 
                    name="Tickets Resolved" 
                    dataKey="resolved" 
                    fill="#34d399" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500">
                No data available for the selected period.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
