import React, { useState } from 'react';
import { useSplits } from '@/hooks/useSplits';
import { HomeScreen } from '@/components/screens/Home';
import { ReceiptScreen } from '@/components/screens/Receipt';
import { PeopleScreen } from '@/components/screens/People';
import { AssignScreen } from '@/components/screens/Assign';
import { SummaryScreen } from '@/components/screens/Summary';
import { ExportScreen } from '@/components/screens/Export';

type Screen = 'home' | 'receipt' | 'people' | 'assign' | 'summary' | 'export';

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
  
  // Render current screen
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
    // Fallback if no split is loaded
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
}

export default App;
