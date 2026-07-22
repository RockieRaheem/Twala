import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Alert, ActivityIndicator, RefreshControl, Dimensions, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback, useEffect } from 'react';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { goalsApi, notifyChange, type GoalData } from '../services/api';

const { width } = Dimensions.get('window');

function formatUgx(ugx: number): string {
  if (ugx >= 1_000_000) return `${(ugx / 1_000_000).toFixed(1)}M`;
  if (ugx >= 1_000) return `${(ugx / 1_000).toFixed(1)}K`;
  return ugx.toLocaleString();
}

function getGoalIcon(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('home') || c.includes('house')) return 'home';
  if (c.includes('land')) return 'grass';
  if (c.includes('school') || c.includes('education')) return 'school';
  if (c.includes('car')) return 'car';
  if (c.includes('business') || c.includes('shop')) return 'store';
  if (c.includes('savings')) return 'piggy-bank';
  return 'flag';
}

const CATEGORIES = [
  { value: 'home', label: 'Home', icon: 'home' },
  { value: 'land', label: 'Land', icon: 'grass' },
  { value: 'education', label: 'Education', icon: 'school' },
  { value: 'business', label: 'Business', icon: 'store' },
  { value: 'savings', label: 'Savings', icon: 'piggy-bank' },
  { value: 'other', label: 'Other', icon: 'flag' },
];

export default function Goals({ onNavigateGoal }: { onNavigateGoal?: (id: string) => void }) {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<string | null>(null);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [newDesc, setNewDesc] = useState('');

  // Edit form
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editCategory, setEditCategory] = useState('other');
  const [editDesc, setEditDesc] = useState('');

  const fetchGoals = useCallback(() => {
    goalsApi.list().then((res) => {
      if (res.success && Array.isArray(res.data)) setGoals(res.data);
    }).finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { fetchGoals(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchGoals(); }, [fetchGoals]);

  const resetForm = () => {
    setNewTitle(''); setNewTarget(''); setNewCategory('other'); setNewDesc('');
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newTarget.trim()) {
      Alert.alert('Required', 'Title and target amount are required');
      return;
    }
    const target = parseFloat(newTarget.replace(/,/g, ''));
    if (isNaN(target) || target <= 0) {
      Alert.alert('Invalid', 'Enter a valid target amount');
      return;
    }
    try {
      const res = await goalsApi.create({ title: newTitle.trim(), targetAmountUgx: target, category: newCategory, description: newDesc.trim() });
      if (res.success) {
        setShowCreate(false); resetForm(); notifyChange(); fetchGoals();
      } else Alert.alert('Error', res.message || 'Failed to create goal');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDelete = (goalId: string, title: string) => {
    Alert.alert('Delete Goal', `Permanently delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await goalsApi.remove(goalId);
          if (res.success) { notifyChange(); fetchGoals(); }
          else Alert.alert('Error', res.message || 'Delete failed');
        } catch (err: any) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  const handleEdit = async () => {
    if (!editGoalId || !editTitle.trim() || !editTarget.trim()) {
      Alert.alert('Required', 'Title and target amount are required');
      return;
    }
    const target = parseFloat(editTarget.replace(/,/g, ''));
    if (isNaN(target) || target <= 0) {
      Alert.alert('Invalid', 'Enter a valid target amount');
      return;
    }
    try {
      const res = await goalsApi.update(editGoalId, { title: editTitle.trim(), targetAmountUgx: target, category: editCategory, description: editDesc.trim() });
      if (res.success) {
        setShowEdit(null); setEditGoalId(null); notifyChange(); fetchGoals();
      } else Alert.alert('Error', res.message || 'Failed to update goal');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const totalSaved = goals.reduce((s, g) => s + g.savedAmountUgx, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmountUgx, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <MaterialCommunityIcons name="flag-checkered" size={28} color={Colors.primary} />
            <Text style={styles.headerTitle}>Savings Goals</Text>
          </View>
          <Text style={styles.headerSub}>{goals.length} goal{goals.length !== 1 ? 's' : ''} · {overallPct}% funded</Text>
        </View>

        {/* Summary Card */}
        {goals.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatUgx(totalSaved)}</Text>
                <Text style={styles.summaryLabel}>Total Saved</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatUgx(totalTarget)}</Text>
                <Text style={styles.summaryLabel}>Total Target</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatUgx(totalTarget - totalSaved)}</Text>
                <Text style={styles.summaryLabel}>Remaining</Text>
              </View>
            </View>
            <View style={styles.summaryBarBg}>
              <View style={[styles.summaryBarFill, { width: `${overallPct}%` }]} />
            </View>
          </View>
        )}

        {/* Goal List */}
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="flag-outline" size={64} color={Colors.outlineVariant} />
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptyDesc}>Create your first savings goal to get started</Text>
          </View>
        ) : (
          goals.map((goal) => {
            const pct = goal.targetAmountUgx > 0 ? Math.round((goal.savedAmountUgx / goal.targetAmountUgx) * 100) : 0;
            const remaining = Math.max(0, goal.targetAmountUgx - goal.savedAmountUgx);
            const icon = getGoalIcon(goal.category);

            return (
              <TouchableOpacity
                key={goal.id}
                style={styles.goalCard}
                activeOpacity={0.7}
                onPress={() => onNavigateGoal?.(goal.id)}
              >
                <View style={styles.goalHeader}>
                  <View style={[styles.goalIcon, { backgroundColor: goal.status === 'completed' ? Colors.primaryFixed : Colors.surfaceContainerHigh }]}>
                    <MaterialCommunityIcons name={icon as any} size={24} color={goal.status === 'completed' ? Colors.primary : Colors.primary} />
                  </View>
                  <View style={styles.goalHeaderInfo}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalStatus}>
                      {goal.status === 'completed' ? '✅ Completed' : goal.status === 'cancelled' ? '❌ Cancelled' : `${pct}% funded`}
                    </Text>
                  </View>
                  <View style={styles.goalActions}>
                    <TouchableOpacity onPress={() => { setEditGoalId(goal.id); setEditTitle(goal.title); setEditTarget(String(goal.targetAmountUgx)); setEditCategory(goal.category); setEditDesc(goal.description || ''); setShowEdit(goal.id); }} style={styles.actionBtn}>
                      <MaterialCommunityIcons name="pencil" size={18} color={Colors.outline} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(goal.id, goal.title)} style={styles.actionBtn}>
                      <MaterialCommunityIcons name="delete-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.goalProgressRow}>
                  <Text style={styles.goalSaved}>{formatUgx(goal.savedAmountUgx)} UGX</Text>
                  <Text style={styles.goalTarget}>of {formatUgx(goal.targetAmountUgx)}</Text>
                </View>

                <View style={styles.goalBarBg}>
                  <View style={[styles.goalBarFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? Colors.primary : Colors.secondaryContainer }]} />
                </View>

                <View style={styles.goalFooter}>
                  <Text style={styles.goalRemaining}>
                    {remaining > 0 ? `${formatUgx(remaining)} UGX remaining` : '🎉 Fully funded!'}
                  </Text>
                  <Text style={styles.goalMilestones}>
                    {goal.milestones?.length || 0} milestone{(goal.milestones?.length || 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => { resetForm(); setShowCreate(true); }}>
        <MaterialCommunityIcons name="plus" size={28} color={Colors.onPrimary} />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Savings Goal</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput style={styles.input} placeholder="e.g. Buy Land in Wakiso" placeholderTextColor={Colors.outline} value={newTitle} onChangeText={setNewTitle} />

            <Text style={styles.inputLabel}>Target Amount (UGX)</Text>
            <TextInput style={styles.input} placeholder="e.g. 50000000" placeholderTextColor={Colors.outline} keyboardType="numeric" value={newTarget} onChangeText={setNewTarget} />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c.value} style={[styles.categoryChip, newCategory === c.value && styles.categoryChipActive]} onPress={() => setNewCategory(c.value)}>
                  <MaterialCommunityIcons name={c.icon as any} size={16} color={newCategory === c.value ? Colors.onPrimary : Colors.onSurfaceVariant} />
                  <Text style={[styles.categoryChipText, newCategory === c.value && { color: Colors.onPrimary }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput style={[styles.input, { height: 60 }]} placeholder="What is this goal for?" placeholderTextColor={Colors.outline} multiline value={newDesc} onChangeText={setNewDesc} />

            <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
              <Text style={styles.createBtnText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEdit !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Goal</Text>
              <TouchableOpacity onPress={() => { setShowEdit(null); setEditGoalId(null); }}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput style={styles.input} placeholder="e.g. Buy Land in Wakiso" placeholderTextColor={Colors.outline} value={editTitle} onChangeText={setEditTitle} />

            <Text style={styles.inputLabel}>Target Amount (UGX)</Text>
            <TextInput style={styles.input} placeholder="e.g. 50000000" placeholderTextColor={Colors.outline} keyboardType="numeric" value={editTarget} onChangeText={setEditTarget} />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c.value} style={[styles.categoryChip, editCategory === c.value && styles.categoryChipActive]} onPress={() => setEditCategory(c.value)}>
                  <MaterialCommunityIcons name={c.icon as any} size={16} color={editCategory === c.value ? Colors.onPrimary : Colors.onSurfaceVariant} />
                  <Text style={[styles.categoryChipText, editCategory === c.value && { color: Colors.onPrimary }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput style={[styles.input, { height: 60 }]} placeholder="What is this goal for?" placeholderTextColor={Colors.outline} multiline value={editDesc} onChangeText={setEditDesc} />

            <TouchableOpacity style={styles.createBtn} onPress={handleEdit}>
              <Text style={styles.createBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 120 },
  header: { paddingHorizontal: Spacing.containerPaddingMobile, paddingTop: Spacing.gutter, paddingBottom: Spacing.stackMd },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm },
  headerTitle: { fontSize: Typography.displayLgMobile.fontSize, fontFamily: 'Montserrat', fontWeight: '700', color: Colors.primary },
  headerSub: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onSurfaceVariant, marginTop: 4 },
  summaryCard: { marginHorizontal: Spacing.containerPaddingMobile, backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.stackMd, ...Shadow.level2, marginBottom: Spacing.gutter },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  summaryValue: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '700', color: Colors.onPrimary },
  summaryLabel: { fontSize: 10, fontFamily: 'Inter', color: Colors.onPrimary, opacity: 0.7, marginTop: 2 },
  summaryBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginTop: Spacing.stackMd, overflow: 'hidden' },
  summaryBarFill: { height: '100%', backgroundColor: Colors.secondaryContainer, borderRadius: 3 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.onSurfaceVariant, marginTop: Spacing.stackMd },
  emptyDesc: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.outline, marginTop: 4 },
  goalCard: { marginHorizontal: Spacing.containerPaddingMobile, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.stackMd, ...Shadow.level1, marginBottom: Spacing.stackMd, borderWidth: 1, borderColor: Colors.outlineVariant + '33' },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.stackSm },
  goalIcon: { width: 44, height: 44, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  goalHeaderInfo: { flex: 1, marginLeft: Spacing.stackSm },
  goalTitle: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurface },
  goalStatus: { fontSize: 11, fontFamily: 'Inter', color: Colors.onSurfaceVariant, marginTop: 1 },
  goalActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceContainerLow },
  goalProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalSaved: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.primary },
  goalTarget: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.outline },
  goalBarBg: { height: 8, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 4, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 4 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  goalRemaining: { fontSize: 11, fontFamily: 'Inter', fontWeight: '500', color: Colors.secondary },
  goalMilestones: { fontSize: 11, fontFamily: 'Inter', color: Colors.outline },
  fab: { position: 'absolute', bottom: 24, right: Spacing.containerPaddingMobile, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadow.level2, borderWidth: 3, borderColor: Colors.surface },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.gutter, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.gutter },
  modalTitle: { fontSize: Typography.headlineMd.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  inputLabel: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant, marginBottom: 6, marginTop: Spacing.stackSm },
  input: { backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg, padding: 14, fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onSurface, borderWidth: 1, borderColor: Colors.outlineVariant + '4D' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerLow, borderWidth: 1, borderColor: Colors.outlineVariant + '4D' },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryChipText: { fontSize: 12, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },
  createBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.gutter },
  createBtnText: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onPrimary },
});
