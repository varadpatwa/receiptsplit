import React, { useState } from 'react';
import { useSplits } from '@/hooks/useSplits';
import { HomeScreen } from '@/components/screens/Home';
import { ReceiptScreen } from '@/components/screens/Receipt';
import { PeopleScreen } from '@/components/screens/People';
import { AssignScreen } from '@/components/screens/Assign';
import { SummaryScreen } from '@/components/screens/Summary';
import { ExportScreen } from '@/components/screens/Export';
import { SpendingScreen } from '@/components/screens/Spending';
import { FriendsScreen } from '@/components/screens/Friends';
import { AccountScreen } from '@/components/screens/Account';
import { BottomTabBar, type TabId } from '@/components/BottomTabBar';

type Screen = 'home' | 'receipt' | 'people' | 'assign' | 'summary' | 'export';

const TAB_BAR_HEIGHT = 72;

function App() {
  const {
    splits,
    currentSplit,
    createNewSplit,
    loadSplit,
    saveSplit,
    deleteSplit,
    updateCurrentSplit,
    clearCurrentSplit
  } = useSplits();
  
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  
  const handleNewSplit = () => {
    const newSplit = createNewSplit();
    saveSplit(newSplit, true);
    setCurrentScreen('receipt');
  };
  
  const handleSelectSplit = (splitId: string) => {
    loadSplit(splitId);
    const split = splits.find(s => s.id === splitId);
    if (split) {
      setCurrentScreen(split.currentStep);
    }
  };
  
  const handleDeleteSplit = (splitId: string) => {
    deleteSplit(splitId);
  };
  
  const navigateToStep = (step: Screen) => {
    if (currentSplit) {
      updateCurrentSplit(split => ({
        ...split,
        currentStep: step as any
      }));
    }
    setCurrentScreen(step);
  };
  
  const handleReturnHome = () => {
    clearCurrentSplit();
    setCurrentScreen('home');
  };
  
  const handleUpdateSplit = (updatedSplit: any) => {
    saveSplit(updatedSplit);
  };

  // Non-Home tabs: render standalone screens
  if (activeTab === 'spending') {
    return (
      <div className="min-h-screen bg-[#0B0B0C]" style={{ paddingBottom: TAB_BAR_HEIGHT }}>
        <SpendingScreen />
        <BottomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
      </div>
    );
  }
  if (activeTab === 'friends') {
    return (
      <div className="min-h-screen bg-[#0B0B0C]" style={{ paddingBottom: TAB_BAR_HEIGHT }}>
        <FriendsScreen />
        <BottomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
      </div>
    );
  }
  if (activeTab === 'account') {
    return (
      <div className="min-h-screen bg-[#0B0B0C]" style={{ paddingBottom: TAB_BAR_HEIGHT }}>
        <AccountScreen />
        <BottomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
      </div>
    );
  }
  
  // Home tab: existing flow (currentScreen preserved when switching tabs)
  const renderHomeFlow = () => {
    if (currentScreen === 'home') {
      return (
        <HomeScreen
          splits={splits}
          onNewSplit={handleNewSplit}
          onSelectSplit={handleSelectSplit}
          onDeleteSplit={handleDeleteSplit}
        />
      );
    }
    if (!currentSplit) {
      return (
        <HomeScreen
          splits={splits}
          onNewSplit={handleNewSplit}
          onSelectSplit={handleSelectSplit}
          onDeleteSplit={handleDeleteSplit}
        />
      );
    }
    if (currentScreen === 'receipt') {
      return (
        <ReceiptScreen
          split={currentSplit}
          onUpdate={handleUpdateSplit}
          onNext={() => navigateToStep('people')}
          onBack={handleReturnHome}
        />
      );
    }
    if (currentScreen === 'people') {
      return (
        <PeopleScreen
          split={currentSplit}
          onUpdate={handleUpdateSplit}
          onNext={() => navigateToStep('assign')}
          onBack={() => navigateToStep('receipt')}
        />
      );
    }
    if (currentScreen === 'assign') {
      return (
        <AssignScreen
          split={currentSplit}
          onUpdate={handleUpdateSplit}
          onNext={() => navigateToStep('summary')}
          onBack={() => navigateToStep('people')}
        />
      );
    }
    if (currentScreen === 'summary') {
      return (
        <SummaryScreen
          split={currentSplit}
          onNext={() => navigateToStep('export')}
          onBack={() => navigateToStep('assign')}
        />
      );
    }
    if (currentScreen === 'export') {
      return (
        <ExportScreen
          split={currentSplit}
          onBack={() => navigateToStep('summary')}
          onReturnHome={handleReturnHome}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C]" style={{ paddingBottom: TAB_BAR_HEIGHT }}>
      {renderHomeFlow()}
      <BottomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}

export default App;
