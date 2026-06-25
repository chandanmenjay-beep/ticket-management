import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ticket, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { signIn, useSession } from '../lib/auth.client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  const [error, setError] = useState('');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
        email: '',
        password: '',
    }
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!isPending && session) {
      navigate('/');
    }
  }, [session, isPending, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setError('');

    const { error: authError } = await signIn.email({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      setError(authError.message || 'Failed to sign in');
    } else {
      navigate('/');
    }
  };

  if (isPending) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
        <div className="absolute -bottom-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-violet-600/20 blur-[120px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-3xl shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20">
              <Ticket className="w-8 h-8 text-indigo-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">Welcome back</h1>
          <p className="text-zinc-400 text-center mb-8">Sign in to manage your tickets</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium text-zinc-300 ml-1">Email address</FormLabel>
                            <FormControl>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <Input {...field} className="pl-11" placeholder="admin@example.com" />
                                </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400 ml-1" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium text-zinc-300 ml-1">Password</FormLabel>
                            <FormControl>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <Input {...field} type="password" className="pl-11" placeholder="••••••••" />
                                </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400 ml-1" />
                        </FormItem>
                    )}
                />

                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full flex items-center justify-center py-6 mt-2"
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
}
