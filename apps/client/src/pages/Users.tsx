import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth.client';
import { useEffect } from 'react';

export default function Users() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending) {
      if (!session) {
        navigate('/login');
      } else if ((session.user as any).role !== 'admin') {
        navigate('/');
      }
    }
  }, [session, isPending, navigate]);

  if (isPending || !session) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-12">
      <h1 className="text-3xl font-bold">Users</h1>
    </div>
  );
}
