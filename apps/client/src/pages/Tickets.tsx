import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Ticket, User, Users, Clock, AlertCircle, LayoutDashboard, ArrowUpDown, ArrowDown, ArrowUp, Search, LayoutPanelLeft } from 'lucide-react';
import { signOut, useSession } from '../lib/auth.client';
import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  SortingState
} from '@tanstack/react-table';

interface TicketData {
  id: string;
  subject: string;
  status: string;
  category: string;
  createdAt: string;
  customer: {
    name: string | null;
    email: string;
  };
  assignedTo: {
    name: string;
    email: string;
  } | null;
}

interface PaginatedTickets {
  data: TicketData[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

const columnHelper = createColumnHelper<TicketData>();

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'open': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'resolved': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    case 'closed': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  }
};

const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'technical': return 'text-red-400 bg-red-500/10';
    case 'refund': return 'text-orange-400 bg-orange-500/10';
    case 'renewal': return 'text-blue-400 bg-blue-500/10';
    case 'general': return 'text-zinc-400 bg-zinc-500/10';
    default: return 'text-zinc-400 bg-zinc-800';
  }
};

export default function Tickets() {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = useSession();

  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, sorting]);

  const { data: ticketsResponse, isPending: isTicketsPending } = useQuery<PaginatedTickets>({
    queryKey: ['tickets', sorting, debouncedSearch, statusFilter, categoryFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sorting.length > 0) {
        params.append('sortField', sorting[0].id);
        params.append('sortOrder', sorting[0].desc ? 'desc' : 'asc');
      }
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await axios.get(`/api/tickets?${params.toString()}`);
      return response.data;
    },
    enabled: !!session,
  });

  const columns = useMemo(() => [
    columnHelper.accessor('subject', {
      header: 'Subject',
      cell: info => (
        <div className="flex flex-col">
          <div className="font-medium text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
            {info.getValue()}
          </div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            <span className="font-mono">#{info.row.original.id.slice(-6).toUpperCase()}</span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('customer', {
      header: 'Customer',
      cell: info => {
        const customer = info.getValue();
        return (
          <div className="flex flex-col">
            <div className="text-sm font-medium text-zinc-200">{customer.name || 'Unknown'}</div>
            <div className="text-xs text-zinc-500">{customer.email}</div>
          </div>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(info.getValue())} capitalize flex items-center gap-1.5 w-fit`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      cell: info => (
        <span className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize flex items-center gap-1.5 w-fit ${getCategoryColor(info.getValue())}`}>
          <AlertCircle className="w-3 h-3" />
          {info.getValue() || 'General'}
        </span>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: info => {
        const date = new Date(info.getValue());
        return (
          <div className="flex flex-col items-end gap-1">
            <div className="text-sm text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-zinc-500" />
              {date.toLocaleDateString()}
            </div>
            <div className="text-xs text-zinc-500">
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    }),
  ], []);

  const table = useReactTable({
    data: ticketsResponse?.data || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // Server-side sorting
  });

  // Redirect to login if not authenticated
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
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <LayoutPanelLeft className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => navigate('/tickets')}
                  className="flex items-center gap-2 text-sm font-medium text-white transition-colors cursor-pointer"
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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Tickets List</h1>
            <p className="text-zinc-400">View and manage all customer support tickets.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full lg:w-auto flex flex-col sm:flex-row gap-3"
          >
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 shadow-sm"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-40 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
            >
              <option value="all">All Categories</option>
              <option value="technical">Technical</option>
              <option value="refund">Refund</option>
              <option value="renewal">Renewal</option>
              <option value="general">General</option>
            </select>
          </motion.div>
        </div>

        {isTicketsPending ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse">
            <div className="h-16 border-b border-zinc-800 bg-zinc-900/50"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 border-b border-zinc-800/50 flex items-center px-6 gap-4">
                <div className="h-4 w-1/4 bg-zinc-800 rounded"></div>
                <div className="h-4 w-1/3 bg-zinc-800 rounded"></div>
                <div className="h-6 w-20 bg-zinc-800 rounded-full"></div>
                <div className="h-6 w-20 bg-zinc-800 rounded-full ml-auto"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b border-zinc-800 bg-zinc-900/80 text-sm font-medium text-zinc-400">
                      {headerGroup.headers.map(header => (
                        <th 
                          key={header.id} 
                          className={`p-5 font-medium whitespace-nowrap ${header.column.getCanSort() ? 'cursor-pointer hover:text-zinc-300 select-none' : ''} ${header.id === 'createdAt' ? 'text-right' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className={`flex items-center gap-2 ${header.id === 'createdAt' ? 'justify-end' : ''}`}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc: <ArrowUp className="w-3 h-3 text-indigo-400" />,
                              desc: <ArrowDown className="w-3 h-3 text-indigo-400" />,
                            }[header.column.getIsSorted() as string] ?? (
                              header.column.getCanSort() ? <ArrowUpDown className="w-3 h-3 opacity-30" /> : null
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row, index) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      key={row.id} 
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/tickets/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className={`p-5 ${cell.column.id === 'createdAt' ? 'text-right' : ''}`}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="bg-zinc-800/50 p-5 rounded-full border border-zinc-700/50">
                            <Search className="w-8 h-8 text-zinc-500" />
                          </div>
                          <div className="text-zinc-300 font-medium text-lg">No tickets found</div>
                          <p className="text-zinc-500 text-sm max-w-sm">
                            We couldn't find any tickets matching your search or filter criteria. Try adjusting them.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {ticketsResponse && ticketsResponse.totalPages > 1 && (
              <div className="border-t border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between">
                <div className="text-sm text-zinc-400">
                  Showing <span className="font-medium text-zinc-200">{((ticketsResponse.page - 1) * ticketsResponse.limit) + 1}</span> to <span className="font-medium text-zinc-200">{Math.min(ticketsResponse.page * ticketsResponse.limit, ticketsResponse.totalCount)}</span> of <span className="font-medium text-zinc-200">{ticketsResponse.totalCount}</span> tickets
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={ticketsResponse.page === 1}
                    className="px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, ticketsResponse.totalPages))].map((_, i) => {
                      // Simple logic to show a window of pages around current page
                      let pageNum = ticketsResponse.page - 2 + i;
                      if (ticketsResponse.page <= 3) pageNum = i + 1;
                      else if (ticketsResponse.page >= ticketsResponse.totalPages - 2) pageNum = ticketsResponse.totalPages - 4 + i;
                      
                      if (pageNum > 0 && pageNum <= ticketsResponse.totalPages) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-colors cursor-pointer ${pageNum === ticketsResponse.page ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(ticketsResponse.totalPages, p + 1))}
                    disabled={ticketsResponse.page === ticketsResponse.totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
