import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { PortalHeader } from '@/components/PortalHeader';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'ADMIN') {
    redirect('/catalog');
  }

  return (
    <>
      <PortalHeader user={user} />
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {children}
      </main>
    </>
  );
}
