import { useState, useEffect } from 'react';
import { useBanking } from '../context/BankingContext';
import { useApiLog } from '../context/ApiLogContext';
import { BankingOverview } from './BankingOverview';
import { TransactionDetail } from './TransactionDetail';
import { LockboxDetail } from './LockboxDetail';
import { CardsListView } from './CardsListView';
import { CardDetail } from './CardDetail';
import type { DemoSession, BankingViewState } from '../types';

interface BankingViewProps {
  session: DemoSession;
}

export function BankingView({ session }: BankingViewProps) {
  const [viewState, setViewState] = useState<BankingViewState>({ view: 'overview' });
  const { refreshData } = useBanking();
  const { addRequest } = useApiLog();

  useEffect(() => {
    refreshData(session.config.apiKey, session.account.id, addRequest);
  }, [session.config.apiKey, session.account.id, addRequest, refreshData]);

  // Refresh data when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      refreshData(session.config.apiKey, session.account.id, addRequest);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session.config.apiKey, session.account.id, addRequest, refreshData]);

  const handleRefresh = () => {
    refreshData(session.config.apiKey, session.account.id, addRequest);
  };

  const handleNavigate = (newState: BankingViewState) => {
    setViewState(newState);
  };

  const handleBack = () => {
    if (viewState.view === 'card_detail') {
      setViewState({ view: 'cards_list' });
    } else {
      setViewState({ view: 'overview' });
    }
  };

  switch (viewState.view) {
    case 'overview':
      return (
        <BankingOverview
          session={session}
          onNavigate={handleNavigate}
          onRefresh={handleRefresh}
        />
      );
    case 'transaction_detail':
      return (
        <TransactionDetail
          transactionId={viewState.transactionId}
          onBack={handleBack}
        />
      );
    case 'lockbox_detail':
      return (
        <LockboxDetail
          session={session}
          onBack={handleBack}
          onRefresh={handleRefresh}
        />
      );
    case 'cards_list':
      return (
        <CardsListView
          session={session}
          onNavigate={handleNavigate}
          onBack={handleBack}
          onRefresh={handleRefresh}
        />
      );
    case 'card_detail':
      return (
        <CardDetail
          cardId={viewState.cardId}
          onBack={handleBack}
        />
      );
    default:
      return null;
  }
}
