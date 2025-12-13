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
        {/* Subtle professional glow effect */}
        {animated && (
          <div 
            className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-amber-500/15 to-yellow-600/10 rounded-lg blur-xl"
          />
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
              filter: animated ? 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.2))' : 'none',
              transition: 'filter 0.3s ease-in-out',
            }}
          />
          
          {/* Subtle professional shine - very minimal */}
          {animated && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full animate-shine-subtle z-20"
              style={{
                animation: 'shineSubtle 8s infinite',
              }}
            />
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes shineSubtle {
          0% {
            transform: translateX(-150%) skewX(-12deg);
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(250%) skewX(-12deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

