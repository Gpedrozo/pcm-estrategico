import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import logo from '@/assets/gppis-logo.png';

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3500); // tempo da splash (3.5 segundos)

    return () => clearTimeout(timer);
  }, []);

  if (showSplash || isLoading) {
    return (
      <div
        className="
          fixed inset-0
          flex items-center justify-center
          bg-gradient-to-br from-black via-zinc-900 to-black
          overflow-hidden
        "
      >
        {/* Container Central Responsivo */}
        <div className="flex flex-col items-center justify-center text-center px-6 animate-fade-in-scale">

          {/* Logo Responsiva */}
          <img
            src={logo}
            alt="GPPIS Logo"
            className="
              w-full
              max-w-[90vw]
              sm:max-w-[500px]
              md:max-w-[600px]
              lg:max-w-[700px]
              xl:max-w-[800px]
              h-auto
              object-contain
              animate-logo-glow
            "
          />

          {/* Texto */}
          <h1
            className="
              mt-6
              text-xs
              sm:text-sm
              md:text-base
              tracking-[0.4em]
              text-zinc-400
            "
          >
            Gustavo Pedrozo Pinto Info Sistem
          </h1>
        </div>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

export default Index;
