import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useSession, authClient } from '../lib/auth.client';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, X, Loader2, Pencil, Trash2, LogOut, Ticket, LayoutDashboard, LayoutPanelLeft, Users as UsersIcon, User as UserIcon } from 'lucide-react';
import { signOut } from '../lib/auth.client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
  createdAt: string;
}

const userFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().optional(),
  role: z.string(),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function Users() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = useSession();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'agent',
    }
  });

  const { data: users, isPending: isUsersPending, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get('/api/users');
      return response.data;
    },
    enabled: !!session && (session.user as any).role === 'admin',
  });

  useEffect(() => {
    if (!isSessionPending) {
      if (!session) {
        navigate('/login');
      } else if ((session.user as any).role !== 'admin') {
        navigate('/');
      }
    }
  }, [session, isSessionPending, navigate]);

  const handleCreateClick = () => {
    setUserToEdit(null);
    form.reset({
      name: '',
      email: '',
      password: '',
      role: 'agent'
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleEditClick = (user: User) => {
    setUserToEdit(user);
    form.reset({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role || 'agent'
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setErrorMsg('');
    try {
      await axios.delete(`/api/users/${userToDelete.id}`);
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    setErrorMsg('');
    if (!userToEdit && (!data.password || data.password.length < 8)) {
      setErrorMsg('Password must be at least 8 characters for new users');
      return;
    }

    if (userToEdit && data.password && data.password.length > 0 && data.password.length < 8) {
      setErrorMsg('New password must be at least 8 characters');
      return;
    }

    setIsCreating(true);
    try {
      if (userToEdit) {
        // Update existing user
        await axios.put(`/api/users/${userToEdit.id}`, {
          name: data.name,
          email: data.email,
          role: data.role,
          password: data.password // Pass the password along
        });
        setIsModalOpen(false);
        setUserToEdit(null);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ['users'] });
      } else {
        // Create new user
        const { error: authError } = await authClient.admin.createUser({
          email: data.email,
          name: data.name,
          password: data.password!,
          role: data.role as "admin" | "user"
        });

        if (authError) {
          setErrorMsg(authError.message || 'Failed to create user');
        } else {
          setIsModalOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
          setUserToEdit(null);
          form.reset();
          setErrorMsg('');
        }
        if (userToDelete) {
          setUserToDelete(null);
          setErrorMsg('');
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, form, userToDelete]);

  if (isSessionPending || isUsersPending) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-12">
        <div className="flex justify-between items-center mb-8">
          <div className="h-9 w-32 bg-zinc-800 animate-pulse rounded-md"></div>
          <div className="h-10 w-36 bg-zinc-800 animate-pulse rounded-xl"></div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="p-4"><div className="h-5 w-24 bg-zinc-800 animate-pulse rounded"></div></th>
              <th className="p-4"><div className="h-5 w-32 bg-zinc-800 animate-pulse rounded"></div></th>
              <th className="p-4"><div className="h-5 w-16 bg-zinc-800 animate-pulse rounded"></div></th>
              <th className="p-4"><div className="h-5 w-24 bg-zinc-800 animate-pulse rounded"></div></th>
              <th className="p-4"><div className="h-5 w-10 bg-zinc-800 animate-pulse rounded"></div></th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="p-4"><div className="h-4 w-3/4 bg-zinc-800/60 animate-pulse rounded"></div></td>
                <td className="p-4"><div className="h-4 w-full bg-zinc-800/60 animate-pulse rounded"></div></td>
                <td className="p-4"><div className="h-4 w-1/2 bg-zinc-800/60 animate-pulse rounded"></div></td>
                <td className="p-4"><div className="h-4 w-2/3 bg-zinc-800/60 animate-pulse rounded"></div></td>
                <td className="p-4"><div className="h-4 w-6 bg-zinc-800/60 animate-pulse rounded"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Error loading users</div>;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

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
                  {(session?.user as any)?.role === 'admin' ? 'Helpdesk' : 'TicketMaster'}
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
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Tickets</span>
                </button>

                {(session?.user as any)?.role === 'admin' && (
                  <button
                    onClick={() => navigate('/users')}
                    className="flex items-center gap-2 text-sm font-medium text-white transition-colors cursor-pointer"
                  >
                    <UsersIcon className="w-4 h-4" />
                    <span>Users</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-2 text-zinc-400 bg-zinc-800/50 px-4 py-1.5 rounded-full border border-zinc-700/50">
                <UserIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium">{session?.user?.name || session?.user?.email}</span>
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Users Management</h1>
          <button
            onClick={handleCreateClick}
            data-testid="create-user-btn"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors cursor-pointer shadow-lg shadow-indigo-900/20"
          >
            <Plus className="w-5 h-5" />
            Create User
          </button>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="p-5 font-medium text-zinc-400">Name</th>
              <th className="p-5 font-medium text-zinc-400">Email</th>
              <th className="p-5 font-medium text-zinc-400">Role</th>
              <th className="p-5 font-medium text-zinc-400">Created At</th>
              <th className="p-5 font-medium text-zinc-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors group">
                <td className="p-5 font-medium">{user.name}</td>
                <td className="p-5 text-zinc-300">{user.email}</td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'}`}>
                    {user.role || 'N/A'}
                  </span>
                </td>
                <td className="p-5 text-zinc-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="p-5 text-right flex justify-end gap-2">
                  <button
                    onClick={() => handleEditClick(user)}
                    className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                    aria-label={`Edit ${user.name}`}
                    data-testid={`edit-btn-${user.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (user.role !== 'admin') {
                        setUserToDelete(user);
                        setErrorMsg('');
                      }
                    }}
                    disabled={user.role === 'admin'}
                    className={`p-2 rounded-lg transition-colors ${user.role === 'admin' ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer'}`}
                    aria-label={`Delete ${user.name}`}
                    data-testid={`delete-btn-${user.id}`}
                    title={user.role === 'admin' ? 'Cannot delete admin users' : `Delete ${user.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            data-testid="delete-modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) {
                setUserToDelete(null);
                setErrorMsg('');
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6"
            >
              <h3 className="text-xl font-semibold mb-2">Delete User</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Are you sure you want to delete <span className="text-white font-medium">{userToDelete.name}</span>? This action cannot be undone.
              </p>
              
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-4">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setUserToDelete(null);
                    setErrorMsg('');
                  }}
                  disabled={isDeleting}
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white min-w-[100px] cursor-pointer"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            data-testid="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsModalOpen(false);
                setUserToEdit(null);
                form.reset();
                setErrorMsg('');
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-zinc-800">
                <h2 className="text-xl font-semibold">{userToEdit ? 'Edit User' : 'Create New User'}</h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setUserToEdit(null);
                    form.reset();
                  }}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer bg-zinc-800/50 p-2 rounded-full hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 flex flex-col gap-5">
                  {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-2">
                      {errorMsg}
                    </div>
                  )}
                  
                  <FormField
                    control={form.control as any}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-zinc-300 ml-1">Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all placeholder:text-zinc-600 h-auto" placeholder="John Doe" />
                        </FormControl>
                        <FormMessage className="text-xs text-red-400 ml-1" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control as any}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-zinc-300 ml-1">Email Address</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all placeholder:text-zinc-600 h-auto" placeholder="john@example.com" />
                        </FormControl>
                        <FormMessage className="text-xs text-red-400 ml-1" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control as any}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-zinc-300 ml-1">Role</FormLabel>
                        <FormControl>
                          <select 
                            {...field} 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all h-auto cursor-pointer"
                          >
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                          </select>
                        </FormControl>
                        <FormMessage className="text-xs text-red-400 ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-zinc-300 ml-1">Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all placeholder:text-zinc-600 h-auto" placeholder={userToEdit ? "Leave blank to keep current password" : "Minimum 8 characters"} />
                        </FormControl>
                        <FormMessage className="text-xs text-red-400 ml-1" />
                      </FormItem>
                    )}
                  />

                  <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-zinc-800">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsModalOpen(false);
                        setUserToEdit(null);
                        form.reset();
                        setErrorMsg('');
                      }}
                      className="px-5 py-2.5 rounded-xl font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer h-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting || isCreating}
                      className="flex items-center justify-center min-w-[120px] gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-900/20 h-auto"
                    >
                      {form.formState.isSubmitting || isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : (userToEdit ? 'Save Changes' : 'Create User')}
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
}
