import { Outlet } from 'react-router-dom';
import { PortalMecanicoProvider, usePortalMecanico } from '@/contexts/PortalMecanicoContext';
import { PortalMecanicoTopBar } from './PortalMecanicoTopBar';
import { PortalMecanicoNav } from './PortalMecanicoNav';
import PortalMecanicoLogin from '@/pages/portal-mecanico/PortalMecanicoLogin';

function PortalMecanicoShell() {
  const { mecanico } = usePortalMecanico();

  if (!mecanico) {
    return <PortalMecanicoLogin />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PortalMecanicoTopBar />
      <main className="flex-1 pt-16 pb-20 md:pb-4 px-4 max-w-5xl mx-auto w-full overflow-y-auto">
        <Outlet />
      </main>
      <PortalMecanicoNav />
    </div>
  );
}

export function PortalMecanicoLayout() {
  return (
    <PortalMecanicoProvider>
      <PortalMecanicoShell />
    </PortalMecanicoProvider>
  );
}
