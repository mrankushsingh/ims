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
        {/* Multiple animated glow effects for depth */}
        {animated && (
          <>
            {/* Primary glow - pulsing */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-amber-500/40 to-yellow-600/30 rounded-lg blur-xl animate-pulse"
              style={{
                animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            {/* Secondary glow - slower pulse */}
            <div 
              className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-amber-600/25 to-yellow-400/20 rounded-lg blur-2xl animate-pulse"
              style={{
                animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: '1s',
              }}
            />
            {/* Outer glow - subtle */}
            <div 
              className="absolute -inset-2 bg-gradient-to-r from-yellow-300/15 via-amber-400/20 to-yellow-500/15 rounded-lg blur-3xl animate-pulse"
              style={{
                animation: 'pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: '2s',
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
            className="w-full h-full object-contain drop-shadow-2xl relative z-10"
            style={{
              filter: animated ? 'drop-shadow(0 0 25px rgba(255, 215, 0, 0.4)) drop-shadow(0 0 50px rgba(245, 158, 11, 0.2))' : 'none',
              transition: 'filter 0.3s ease-in-out',
            }}
          />
          
          {/* Multiple shine effects for rich shine */}
          {animated && (
            <>
              {/* Primary shine - fast sweep */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full animate-shine z-20"
                style={{
                  animation: 'shine 3s infinite',
                }}
              />
              {/* Secondary shine - slower sweep */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/40 to-transparent transform -skew-x-12 -translate-x-full animate-shine-slow z-20"
                style={{
                  animation: 'shineSlow 4s infinite',
                  animationDelay: '1.5s',
                }}
              />
              {/* Gold shine overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/25 to-transparent transform -skew-x-12 -translate-x-full animate-shine-gold z-20"
                style={{
                  animation: 'shineGold 5s infinite',
                  animationDelay: '3s',
                }}
              />
              {/* Radial shine from center */}
              <div 
                className="absolute inset-0 bg-radial-gradient from-white/0 via-white/10 to-white/0 rounded-lg animate-radial-shine z-20"
                style={{
                  animation: 'radialShine 6s infinite',
                }}
              />
            </>
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
        
        @keyframes shineSlow {
          0% {
            transform: translateX(-150%) skewX(-12deg);
          }
          100% {
            transform: translateX(250%) skewX(-12deg);
          }
        }
        
        @keyframes shineGold {
          0% {
            transform: translateX(-120%) skewX(-12deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(220%) skewX(-12deg);
            opacity: 0;
          }
        }
        
        @keyframes radialShine {
          0%, 100% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        .bg-radial-gradient {
          background: radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
        }
      `}</style>
    </div>
  );
}

