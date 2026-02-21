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
    }, 3000); // tempo da animação (3 segundos)

    return () => clearTimeout(timer);
  }, []);

  // Tela de Splash
  if (showSplash || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-fadeIn text-center">
          <img 
            src={logo} 
            alt="GPPIS Logo" 
            className="w-72 mx-auto animate-pulse"
          />
          <p className="text-gray-400 mt-6 tracking-widest text-sm">
            Gustavo Pedrozo Pinto Info Sistem
          </p>
        </div>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

export default Index;
