import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSplits } from '../contexts/SplitsContext';
import HomeScreen from '../screens/HomeScreen';
import { ReceiptScreen } from '../screens/split/ReceiptScreen';
import { PeopleScreen } from '../screens/split/PeopleScreen';
import { AssignScreen } from '../screens/split/AssignScreen';
import { SummaryScreen } from '../screens/split/SummaryScreen';
import { ExportScreen } from '../screens/split/ExportScreen';

export type HomeStackParamList = {
  HomeList: undefined;
  Receipt: undefined;
  People: undefined;
  Assign: undefined;
  Summary: undefined;
  Export: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

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

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0B0C' },
      }}
    >
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="Receipt" component={ReceiptConnector} />
      <Stack.Screen name="People" component={PeopleConnector} />
      <Stack.Screen name="Assign" component={AssignConnector} />
      <Stack.Screen name="Summary" component={SummaryConnector} />
      <Stack.Screen name="Export" component={ExportConnector} />
    </Stack.Navigator>
  );
}
