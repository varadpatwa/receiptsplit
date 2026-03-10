import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSplits } from '../contexts/SplitsContext';
import { useMultiSplit } from '../contexts/MultiSplitContext';
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SearchScreen from '../screens/SearchScreen';
import { ReceiptScreen } from '../screens/split/ReceiptScreen';
import { PeopleScreen } from '../screens/split/PeopleScreen';
import { AssignScreen } from '../screens/split/AssignScreen';
import { SummaryScreen } from '../screens/split/SummaryScreen';
import { ExportScreen } from '../screens/split/ExportScreen';
import MultiSplitCaptureScreen from '../screens/multisplit/MultiSplitCaptureScreen';
import MultiSplitPeopleScreen from '../screens/multisplit/MultiSplitPeopleScreen';
import MultiSplitHubScreen from '../screens/multisplit/MultiSplitHubScreen';
import MultiSplitReceiptViewScreen from '../screens/multisplit/MultiSplitReceiptViewScreen';
import MultiSplitSummaryScreen from '../screens/multisplit/MultiSplitSummaryScreen';

export type HomeStackParamList = {
  HomeList: undefined;
  Notifications: undefined;
  Search: undefined;
  // Legacy single-split screens (for reopening old splits)
  Receipt: undefined;
  People: undefined;
  Assign: undefined;
  Summary: undefined;
  Export: undefined;
  // Unified capture flow
  MultiSplitCapture: undefined;
  MultiSplitPeople: undefined;
  MultiSplitHub: undefined;
  MultiSplitReceiptView: undefined;
  MultiSplitSequentialAssign: undefined;
  MultiSplitReceipt: undefined;
  MultiSplitAssign: undefined;
  MultiSplitSummary: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

// --- Legacy single-split connectors (for reopening old splits) ---

function ReceiptConnector() {
  const { currentSplit, updateCurrentSplit, clearCurrentSplit, saveError, clearSaveError } = useSplits();
  const navigation = useNavigation<any>();
  useEffect(() => {
    if (!currentSplit) navigation.replace('HomeList');
  }, [currentSplit, navigation]);
  if (!currentSplit) return null;
  return (
    <ReceiptScreen
      split={currentSplit}
      onUpdate={(s) => updateCurrentSplit(() => s)}
      onNext={() => {
        updateCurrentSplit((s) => ({ ...s, currentStep: 'people' }), true);
        navigation.navigate('People');
      }}
      onBack={() => {
        clearCurrentSplit();
        navigation.goBack();
      }}
      saveError={saveError}
      clearSaveError={clearSaveError}
    />
  );
}

function PeopleConnector() {
  const { currentSplit, updateCurrentSplit } = useSplits();
  const navigation = useNavigation<any>();
  useEffect(() => {
    if (!currentSplit) navigation.replace('HomeList');
  }, [currentSplit, navigation]);
  if (!currentSplit) return null;
  return (
    <PeopleScreen
      split={currentSplit}
      onUpdate={(s) => updateCurrentSplit(() => s)}
      onNext={() => {
        updateCurrentSplit((s) => ({ ...s, currentStep: 'assign' }), true);
        navigation.navigate('Assign');
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

function AssignConnector() {
  const { currentSplit, updateCurrentSplit } = useSplits();
  const navigation = useNavigation<any>();
  useEffect(() => {
    if (!currentSplit) navigation.replace('HomeList');
  }, [currentSplit, navigation]);
  if (!currentSplit) return null;
  return (
    <AssignScreen
      split={currentSplit}
      onUpdate={(s) => updateCurrentSplit(() => s)}
      onNext={() => {
        updateCurrentSplit((s) => ({ ...s, currentStep: 'summary' }), true);
        navigation.navigate('Summary');
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

function SummaryConnector() {
  const { currentSplit, updateCurrentSplit } = useSplits();
  const navigation = useNavigation<any>();
  useEffect(() => {
    if (!currentSplit) navigation.replace('HomeList');
  }, [currentSplit, navigation]);
  if (!currentSplit) return null;
  return (
    <SummaryScreen
      split={currentSplit}
      onNext={() => {
        updateCurrentSplit((s) => ({ ...s, currentStep: 'export' }), true);
        navigation.navigate('Export');
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

function ExportConnector() {
  const { currentSplit, clearCurrentSplit, deleteSplit } = useSplits();
  const navigation = useNavigation<any>();
  useEffect(() => {
    if (!currentSplit) navigation.replace('HomeList');
  }, [currentSplit, navigation]);
  if (!currentSplit) return null;
  const handleDelete = () => {
    Alert.alert(
      'Delete split',
      'Are you sure you want to delete this split?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSplit(currentSplit.id);
            clearCurrentSplit();
            navigation.navigate('HomeList');
          },
        },
      ]
    );
  };
  return (
    <ExportScreen
      split={currentSplit}
      onBack={() => navigation.goBack()}
      onReturnHome={() => {
        clearCurrentSplit();
        navigation.navigate('HomeList');
      }}
      onDelete={handleDelete}
    />
  );
}

// --- Unified capture flow connectors ---

function MultiSplitCaptureConnector() {
  const { createFromCaptures } = useMultiSplit();
  const navigation = useNavigation<any>();
  return (
    <MultiSplitCaptureScreen
      onDone={async (captures) => {
        try {
          await createFromCaptures(captures);
          navigation.navigate('MultiSplitPeople');
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          Alert.alert('Error', `Failed to create split: ${msg}`);
        }
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

function MultiSplitPeopleConnector() {
  const { sharedParticipants, setSharedParticipants, syncParticipantsToSplits } = useMultiSplit();
  const navigation = useNavigation<any>();
  return (
    <MultiSplitPeopleScreen
      participants={sharedParticipants}
      onUpdateParticipants={setSharedParticipants}
      onNext={async () => {
        await syncParticipantsToSplits();
        navigation.navigate('MultiSplitHub');
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

function MultiSplitHubConnector() {
  const { currentEvent, eventSplits, addReceipt, removeReceipt, clearMultiSplit, startAssignFlow } = useMultiSplit();
  const { loadSplit, saveSplit } = useSplits();
  const navigation = useNavigation<any>();
  if (!currentEvent) {
    navigation.replace('HomeList');
    return null;
  }
  return (
    <MultiSplitHubScreen
      event={currentEvent}
      eventSplits={eventSplits}
      onAddReceipt={async () => {
        try {
          const split = await addReceipt();
          loadSplit(split.id);
          navigation.navigate('MultiSplitReceipt');
        } catch (e) {
          Alert.alert('Error', 'Failed to add receipt. Please try again.');
        }
      }}
      onTapReceipt={(splitId) => {
        loadSplit(splitId);
        navigation.navigate('MultiSplitReceiptView');
      }}
      onAssignAll={() => {
        if (eventSplits.length === 0) return;
        startAssignFlow();
        loadSplit(eventSplits[0].id);
        navigation.navigate('MultiSplitSequentialAssign');
      }}
      onViewSummary={() => navigation.navigate('MultiSplitSummary')}
      onRemoveReceipt={(splitId) => removeReceipt(splitId)}
      onCategoryChange={(category) => {
        for (const split of eventSplits) {
          saveSplit({ ...split, category, updatedAt: Date.now() }, true);
        }
      }}
      onBack={() => {
        clearMultiSplit();
        navigation.navigate('HomeList');
      }}
    />
  );
}

function MultiSplitReceiptViewConnector() {
  const { currentSplit, updateCurrentSplit, clearCurrentSplit } = useSplits();
  const navigation = useNavigation<any>();
  useEffect(() => {
    if (!currentSplit) navigation.replace('MultiSplitHub');
  }, [currentSplit, navigation]);
  if (!currentSplit) return null;
  return (
    <MultiSplitReceiptViewScreen
      split={currentSplit}
      onUpdate={(s) => updateCurrentSplit(() => s)}
      onBack={() => {
        clearCurrentSplit();
        navigation.goBack();
      }}
    />
  );
}

function MultiSplitSequentialAssignConnector() {
  const { assignQueueIndex, advanceAssignFlow, cancelAssignFlow, eventSplits } = useMultiSplit();
  const { currentSplit, updateCurrentSplit, loadSplit, clearCurrentSplit } = useSplits();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!currentSplit) navigation.replace('MultiSplitHub');
  }, [currentSplit, navigation]);

  if (!currentSplit) return null;

  const currentIdx = assignQueueIndex ?? 0;
  const totalReceipts = eventSplits.length;
  const receiptName = currentSplit.name || `Receipt ${currentIdx + 1}`;

  return (
    <AssignScreen
      split={currentSplit}
      onUpdate={(s) => updateCurrentSplit(() => s)}
      subtitle={`${receiptName} (${currentIdx + 1} of ${totalReceipts})`}
      onNext={() => {
        updateCurrentSplit((s) => ({ ...s, currentStep: 'export' }), true);
        const nextIdx = advanceAssignFlow();
        if (nextIdx !== null) {
          loadSplit(eventSplits[nextIdx].id);
        } else {
          clearCurrentSplit();
          navigation.navigate('MultiSplitHub');
        }
      }}
      onBack={() => {
        cancelAssignFlow();
        clearCurrentSplit();
        navigation.navigate('MultiSplitHub');
      }}
    />
  );
}

function MultiSplitReceiptConnector() {
  const { currentSplit, updateCurrentSplit } = useSplits();
  const navigation = useNavigation<any>();
  useEffect(() => {
    if (!currentSplit) navigation.replace('MultiSplitHub');
  }, [currentSplit, navigation]);
  if (!currentSplit) return null;
  return (
    <ReceiptScreen
      split={currentSplit}
      onUpdate={(s) => updateCurrentSplit(() => s)}
      onNext={() => {
        updateCurrentSplit((s) => ({ ...s, currentStep: 'assign' }), true);
        navigation.navigate('MultiSplitAssign');
      }}
      onBack={() => navigation.goBack()}
      saveError={null}
      clearSaveError={() => {}}
    />
  );
}

function MultiSplitAssignConnector() {
  const { currentSplit, updateCurrentSplit, clearCurrentSplit } = useSplits();
  const navigation = useNavigation<any>();
  useEffect(() => {
    if (!currentSplit) navigation.replace('MultiSplitHub');
  }, [currentSplit, navigation]);
  if (!currentSplit) return null;
  return (
    <AssignScreen
      split={currentSplit}
      onUpdate={(s) => updateCurrentSplit(() => s)}
      onNext={() => {
        updateCurrentSplit((s) => ({ ...s, currentStep: 'export' }), true);
        clearCurrentSplit();
        navigation.navigate('MultiSplitHub');
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

function MultiSplitSummaryConnector() {
  const { currentEvent, eventSplits, clearMultiSplit } = useMultiSplit();
  const navigation = useNavigation<any>();
  if (!currentEvent) {
    navigation.replace('HomeList');
    return null;
  }
  return (
    <MultiSplitSummaryScreen
      event={currentEvent}
      eventSplits={eventSplits}
      onBack={() => navigation.goBack()}
      onDone={() => {
        clearMultiSplit();
        navigation.navigate('HomeList');
      }}
    />
  );
}

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0B0C' },
      }}
    >
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      {/* Legacy single-split screens */}
      <Stack.Screen name="Receipt" component={ReceiptConnector} />
      <Stack.Screen name="People" component={PeopleConnector} />
      <Stack.Screen name="Assign" component={AssignConnector} />
      <Stack.Screen name="Summary" component={SummaryConnector} />
      <Stack.Screen name="Export" component={ExportConnector} />
      {/* Unified capture flow */}
      <Stack.Screen name="MultiSplitCapture" component={MultiSplitCaptureConnector} />
      <Stack.Screen name="MultiSplitPeople" component={MultiSplitPeopleConnector} />
      <Stack.Screen name="MultiSplitHub" component={MultiSplitHubConnector} />
      <Stack.Screen name="MultiSplitReceiptView" component={MultiSplitReceiptViewConnector} />
      <Stack.Screen name="MultiSplitSequentialAssign" component={MultiSplitSequentialAssignConnector} />
      <Stack.Screen name="MultiSplitReceipt" component={MultiSplitReceiptConnector} />
      <Stack.Screen name="MultiSplitAssign" component={MultiSplitAssignConnector} />
      <Stack.Screen name="MultiSplitSummary" component={MultiSplitSummaryConnector} />
    </Stack.Navigator>
  );
}
