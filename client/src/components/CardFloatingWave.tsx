import React from 'react';

interface CardFloatingWaveProps {
  colorClass?: string;
  heightClass?: string;
}

export default function CardFloatingWave({
  colorClass = "text-blue-500",
  heightClass = "h-10 sm:h-12"
}: CardFloatingWaveProps) {
  return (
    <div 
      className={`absolute inset-x-0 bottom-0 ${heightClass} pointer-events-none overflow-hidden select-none ${colorClass}`}
    >
      {/* Background deeper wave with slow flowing motion */}
      <div className="absolute -bottom-0.5 left-0 w-[200%] h-full animate-wave-slow opacity-45">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-full fill-current">
          <path d="M0,28 C150,48 300,12 450,28 C600,44 750,16 900,28 C1050,40 1150,15 1200,28 L1200,60 L0,60 Z" />
        </svg>
      </div>
      {/* Foreground crest wave with faster offset motion */}
      <div className="absolute bottom-0 left-0 w-[200%] h-full animate-wave-fast opacity-80">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-full fill-current">
          <path d="M0,38 C180,18 280,48 450,30 C620,12 750,46 900,32 C1050,18 1150,40 1200,34 L1200,60 L0,60 Z" />
        </svg>
      </div>
    </div>
  );
}
