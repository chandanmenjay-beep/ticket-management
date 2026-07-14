import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowDown, Send, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useSession } from '../lib/auth.client';
import { useEffect, useState } from 'react';

interface TicketMessage {
  id: string;
  bodyText: string;
  senderType: string;
  senderId: string;
  createdAt: string;
}

interface TicketDetailData {
  id: string;
  subject: string;
  status: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    name: string | null;
    email: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  messages: TicketMessage[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = useSession();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [ticketSummary, setTicketSummary] = useState('');

  const { data: ticket, isPending: isTicketPending, error } = useQuery<TicketDetailData>({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const response = await axios.get(`/api/tickets/${id}`);
      return response.data;
    },
    enabled: !!session && !!id,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get('/api/users');
      return response.data;
    },
    enabled: !!session,
  });

  const agents = users?.filter(u => u.role === 'admin' || u.role === 'agent') || [];

  const updateTicketMutation = useMutation({
    mutationFn: async (data: { assignedToId?: string | null; status?: string; category?: string }) => {
      setIsUpdating(true);
      const response = await axios.patch(`/api/tickets/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
    onSettled: () => {
      setIsUpdating(false);
    }
  });

  const handleAssignAgent = (agentId: string) => {
    updateTicketMutation.mutate({ assignedToId: agentId === 'unassigned' ? null : agentId });
  };

  const addMessageMutation = useMutation({
    mutationFn: async (bodyText: string) => {
      const response = await axios.post(`/api/tickets/${id}/messages`, { bodyText });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setReplyText('');
    }
  });

  const polishMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await axios.post('/api/ai/polish', { text });
      return response.data.polishedText as string;
    },
    onSuccess: (polishedText) => {
      setReplyText(polishedText);
    }
  });

  const summarizeMutation = useMutation({
    mutationFn: async (data: { subject: string; messages: TicketMessage[] }) => {
      const response = await axios.post('/api/ai/summarize', data);
      return response.data.summary as string;
    },
    onSuccess: (summary) => {
      setTicketSummary(summary);
    }
  });

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim() === '' || addMessageMutation.isPending) return;
    addMessageMutation.mutate(replyText);
  };

  useEffect(() => {
    if (!isSessionPending && !session) {
      navigate('/login');
    }
  }, [session, isSessionPending, navigate]);

  if (isSessionPending || isTicketPending) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-6">
        <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
        <p className="text-zinc-400 mb-6">The ticket you are looking for does not exist or you don't have access.</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-zinc-800 hover:bg-zinc-700 px-6 py-2.5 rounded-xl transition-colors font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 pb-24">
      {/* Top Bar matching image style "<- Back to tickets" */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer w-fit mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tickets
        </button>

        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Main Content Column */}
          <div className="flex-1 min-w-0">
            {/* Header / Meta */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                {ticket.subject}
              </h1>
              <div className="text-sm text-zinc-400 space-y-1">
                <div>
                  From: <span className="text-zinc-200">{ticket.customer.name || 'Unknown'}</span> ({ticket.customer.email})
                </div>
                <div>Created: {new Date(ticket.createdAt).toLocaleString()}</div>
                {ticket.updatedAt && (
                  <div>Updated: {new Date(ticket.updatedAt).toLocaleString()}</div>
                )}
              </div>
            </div>

            {/* Messages Thread */}
            <div className="space-y-6">
              {ticket.messages.length > 0 ? (
                <h3 className="text-lg font-semibold text-white">Replies</h3>
              ) : (
                <div className="text-zinc-500 italic text-sm py-4">No messages yet. Be the first to reply.</div>
              )}
              
              {ticket.messages.map((message, index) => {
                const isCustomer = message.senderType === 'CUSTOMER';
                let senderName = isCustomer ? ticket.customer.name || 'Customer' : 'Support Agent';
                
                // Attach agent name if agent replied
                if (!isCustomer) {
                  const agent = users?.find(u => u.id === message.senderId);
                  if (agent) {
                    senderName = agent.name;
                  }
                }

                return (
                  <motion.div 
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm"
                  >
                    <div className="font-semibold text-zinc-100 mb-0.5">
                      {senderName}
                    </div>
                    <div className="text-xs text-zinc-500 mb-4">
                      {isCustomer ? 'Customer' : 'Agent'} • {new Date(message.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {message.bodyText}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Summarize Action & Output */}
            {ticket.messages.length > 0 && (
              <div className="mt-6">
                {summarizeMutation.error && (
                  <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2">
                    <span className="font-semibold">Error:</span>
                    {(summarizeMutation.error as any).response?.data?.error || 'Failed to generate summary. Please try again.'}
                  </div>
                )}
                
                {!ticketSummary && (
                  <button
                    onClick={() => summarizeMutation.mutate({ subject: ticket.subject, messages: ticket.messages })}
                    disabled={summarizeMutation.isPending}
                    className="flex items-center gap-2 text-sm font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors border border-indigo-500/20"
                  >
                    {summarizeMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate Summary
                  </button>
                )}
                
                {ticketSummary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5"
                  >
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2">
                      <Sparkles className="w-4 h-4" />
                      AI Summary
                    </div>
                    <div className="text-sm text-indigo-200/90 leading-relaxed">
                      {ticketSummary}
                    </div>
                    <button
                      onClick={() => summarizeMutation.mutate({ subject: ticket.subject, messages: ticket.messages })}
                      disabled={summarizeMutation.isPending}
                      className="mt-3 text-xs text-indigo-400/80 hover:text-indigo-400 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {summarizeMutation.isPending ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {/* Reply Form */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white mb-4">Add a Reply</h3>
              
              {polishMutation.error && (
                <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2">
                  <span className="font-semibold">Error:</span>
                  {(polishMutation.error as any).response?.data?.error || 'Failed to polish text. Please try again.'}
                </div>
              )}
              
              <form onSubmit={handleReplySubmit} className="relative">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none min-h-[140px] placeholder:text-zinc-600 pb-16"
                  disabled={addMessageMutation.isPending || polishMutation.isPending}
                />
                <div className="absolute bottom-3 left-3 right-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => polishMutation.mutate(replyText)}
                    disabled={replyText.trim() === '' || polishMutation.isPending || addMessageMutation.isPending}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 disabled:opacity-50 disabled:hover:bg-indigo-500/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {polishMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Polish
                  </button>

                  <button
                    type="submit"
                    disabled={replyText.trim() === '' || addMessageMutation.isPending || polishMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/20 disabled:shadow-none"
                  >
                    {addMessageMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send Reply
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Sidebar Column */}
          <div className="w-full lg:w-64 shrink-0 space-y-6">
            
            {/* Status */}
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Status</label>
              <div className="relative">
                <select
                  disabled={isUpdating}
                  value={ticket.status}
                  onChange={(e) => updateTicketMutation.mutate({ status: e.target.value })}
                  className="w-full appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed pr-8 capitalize"
                >
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Category</label>
              <div className="relative">
                <select
                  disabled={isUpdating}
                  value={ticket.category || 'general'}
                  onChange={(e) => updateTicketMutation.mutate({ category: e.target.value })}
                  className="w-full appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed pr-8 capitalize"
                >
                  <option value="technical">Technical</option>
                  <option value="refund">Refund</option>
                  <option value="renewal">Renewal</option>
                  <option value="general">General</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Assigned To */}
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Assigned To</label>
              <div className="relative">
                <select
                  disabled={isUpdating}
                  value={ticket.assignedTo?.id || 'unassigned'}
                  onChange={(e) => handleAssignAgent(e.target.value)}
                  className="w-full appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed pr-8"
                >
                  <option value="unassigned">Unassigned</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
