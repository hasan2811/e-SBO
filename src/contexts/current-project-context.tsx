
'use client';

import * as React from 'react';

interface CurrentProjectContextType {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
}

export const CurrentProjectContext = React.createContext<CurrentProjectContextType | undefined>(undefined);

export function CurrentProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectId] = React.useState<string | null>(null);

  const value = { projectId, setProjectId };

  return (
    <CurrentProjectContext.Provider value={value}>
      {children}
    </CurrentProjectContext.Provider>
  );
}
