
'use client';

import * as React from 'react';

interface PerformanceContextType {
  isFastConnection: boolean;
}

const PerformanceContext = React.createContext<PerformanceContextType>({
  isFastConnection: true,
});

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [isFastConnection, setIsFastConnection] = React.useState(true);

  React.useEffect(() => {
    // Navigator and connection might not be available in all browsers or on the server.
    // We use a type assertion to handle different browser implementations.
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    const updateConnectionStatus = () => {
      if (connection) {
        // effectiveType is a good indicator of overall connection quality.
        // 'slow-2g', '2g', and sometimes '3g' are considered slow for a rich app.
        const slowConnection = ['slow-2g', '2g'].includes(connection.effectiveType);
        const lowDataMode = connection.saveData === true;

        setIsFastConnection(!slowConnection && !lowDataMode);
      }
    };

    updateConnectionStatus(); // Initial check

    if (connection) {
      connection.addEventListener('change', updateConnectionStatus);
    }

    return () => {
      if (connection) {
        connection.removeEventListener('change', updateConnectionStatus);
      }
    };
  }, []);

  const value = { isFastConnection };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export const usePerformance = () => {
  const context = React.useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};
