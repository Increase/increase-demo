import type { ReactNode } from 'react';
import { DebugPanel } from './DebugPanel';

interface DemoLayoutProps {
  children: ReactNode;
}

export function DemoLayout({ children }: DemoLayoutProps) {
  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      <div className="w-96 border-l border-gray-200">
        <DebugPanel />
      </div>
    </div>
  );
}
