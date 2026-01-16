import { useState } from 'react';
import { ApiLogProvider } from './context/ApiLogContext';
import { BillPaymentProvider } from './context/BillPaymentContext';
import { SetupScreen } from './components/SetupScreen';
import { DemoLayout } from './components/DemoLayout';
import { BillPayView } from './components/BillPayView';
import type { DemoSession } from './types';

function AppContent() {
  const [session, setSession] = useState<DemoSession | null>(null);

  if (!session) {
    return <SetupScreen onSessionCreated={setSession} />;
  }

  return (
    <DemoLayout>
      {session.config.product === 'bill_pay' && (
        <BillPayView session={session} />
      )}
    </DemoLayout>
  );
}

function App() {
  return (
    <ApiLogProvider>
      <BillPaymentProvider>
        <AppContent />
      </BillPaymentProvider>
    </ApiLogProvider>
  );
}

export default App;
