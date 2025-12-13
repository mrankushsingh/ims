import { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = '', animated = true, size = 'md' }: LogoProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const sizeClasses = {
    sm: 'h-8 w-24',
    md: 'h-12 w-36',
    lg: 'h-16 w-48',
    xl: 'h-20 w-60',
  };

  return (
    <div 
      className={`${sizeClasses[size]} ${className} relative transition-all duration-1000 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <div className="relative w-full h-full">
        {/* Animated glow effect */}
        {animated && (
          <>
            <div 
              className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-amber-500/30 to-yellow-600/20 rounded-lg blur-xl animate-pulse"
              style={{
                animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <div 
              className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-amber-600/15 to-yellow-400/10 rounded-lg blur-2xl animate-pulse"
              style={{
                animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: '1s',
              }}
            />
          </>
        )}
        
        {/* Logo container with hover effect */}
        <div 
          className={`relative w-full h-full transition-transform duration-300 ${
            animated ? 'hover:scale-105' : ''
          }`}
        >
          <img 
            src="/logo_AB.svg" 
            alt="Berliku Law Firm Logo" 
            className="w-full h-full object-contain drop-shadow-2xl"
            style={{
              filter: animated ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.3))' : 'none',
              transition: 'filter 0.3s ease-in-out',
            }}
          />
          
          {/* Shine effect overlay */}
          {animated && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full animate-shine"
              style={{
                animation: 'shine 3s infinite',
              }}
            />
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
      `}</style>
    </div>
  );
}

