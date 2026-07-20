import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeDashboard from '../screens/HomeDashboard';
import AIAssistant from '../screens/AIAssistant';
import SmartTransfer from '../screens/SmartTransfer';
import GoalDetail from '../screens/GoalDetail';
import History from '../screens/History';
import BottomNavBar, { AppScreen } from '../components/BottomNavBar';
import { Colors } from '../theme';

export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('Dashboard');
  const [history, setHistory] = useState<AppScreen[]>([]);
  const [goalId, setGoalId] = useState<string | null>(null);

  const navigate = (screen: AppScreen) => {
    if (screen === 'GoalDetail') {
      setHistory((prev) => [...prev, currentScreen]);
      setCurrentScreen('GoalDetail');
    } else if (screen === 'Dashboard') {
      setCurrentScreen('Dashboard');
      setHistory([]);
    } else {
      setCurrentScreen(screen);
    }
  };

  const navigateToGoal = (id: string) => {
    setGoalId(id);
    setHistory((prev) => [...prev, currentScreen]);
    setCurrentScreen('GoalDetail');
  };

  const handleBack = () => {
    setGoalId(null);
    const prev = history[history.length - 1];
    if (prev) {
      setHistory((prevH) => prevH.slice(0, -1));
      setCurrentScreen(prev);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Dashboard':
        return <HomeDashboard onNavigate={navigate} onNavigateGoal={navigateToGoal} />;
      case 'Assistant':
        return <AIAssistant />;
      case 'Transfer':
        return <SmartTransfer />;
      case 'GoalDetail':
        return <GoalDetail goalId={goalId} onBack={handleBack} />;
      case 'History':
        return <History />;
      default:
        return <HomeDashboard onNavigate={navigate} onNavigateGoal={navigateToGoal} />;
    }
  };

  const showBottomNav = currentScreen !== 'GoalDetail';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      {showBottomNav && (
        <BottomNavBar activeRoute={currentScreen} onNavigate={navigate} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
});
