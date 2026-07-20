import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';

interface Transaction {
  id: string;
  name: string;
  avatar: string;
  amount: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  purpose: string;
  direction: 'sent' | 'received';
}

const TRANSACTIONS: Transaction[] = [
  { id: '1', name: 'Maama', avatar: 'face-woman-profile', amount: '$250.00', date: 'Today', status: 'completed', purpose: 'Family Support', direction: 'sent' },
  { id: '2', name: 'Ssekandi', avatar: 'face-man-profile', amount: '$1,200.00', date: 'Today', status: 'completed', purpose: 'Construction Milestone', direction: 'sent' },
  { id: '3', name: 'Sarah', avatar: 'face-woman-profile', amount: '$150.00', date: 'Yesterday', status: 'pending', purpose: 'School Fees', direction: 'sent' },
  { id: '4', name: 'Sula Contractors', avatar: 'hard-hat', amount: '$4,550.00', date: 'Jul 28', status: 'completed', purpose: 'Material Supply', direction: 'sent' },
  { id: '5', name: 'Hardware World', avatar: 'store', amount: '$890.00', date: 'Jul 26', status: 'completed', purpose: 'Business Investment', direction: 'sent' },
  { id: '6', name: 'Refund — Kotani Pay', avatar: 'refresh', amount: '$12.50', date: 'Jul 25', status: 'completed', purpose: 'Failed TX Reversal', direction: 'received' },
  { id: '7', name: 'Junior\'s School', avatar: 'school', amount: '$340.00', date: 'Jul 20', status: 'failed', purpose: 'Education', direction: 'sent' },
  { id: '8', name: 'Savings Vault', avatar: 'piggy-bank', amount: '$500.00', date: 'Jul 18', status: 'completed', purpose: 'Personal Savings', direction: 'sent' },
];

const FILTERS = ['All', 'Sent', 'Received'];

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: Colors.primary, bg: Colors.primaryFixed + '99' },
  pending: { label: 'Pending', color: Colors.secondary, bg: Colors.secondaryContainer + '66' },
  failed: { label: 'Failed', color: Colors.error, bg: Colors.errorContainer },
};

export default function History() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <TouchableOpacity style={styles.searchButton}>
          <MaterialCommunityIcons name="magnify" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} style={[styles.filterChip, f === 'All' && styles.filterChipActive]}>
              <Text style={[styles.filterText, f === 'All' && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Total Sent</Text>
            <Text style={styles.statCardValue}>$7,892.50</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.primary }]}>
            <Text style={[styles.statCardLabel, { color: Colors.onPrimary, opacity: 0.7 }]}>This Month</Text>
            <Text style={[styles.statCardValue, { color: Colors.onPrimary }]}>23 TX</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>

        {TRANSACTIONS.map((tx, i) => {
          const cfg = STATUS_CONFIG[tx.status];
          return (
            <TouchableOpacity key={tx.id} style={styles.txCard} activeOpacity={0.7}>
              <View style={styles.txLeft}>
                <View style={[styles.txAvatar, { backgroundColor: tx.direction === 'received' ? Colors.tertiaryFixed : Colors.surfaceContainer }]}>
                  <MaterialCommunityIcons name={tx.avatar as any} size={20} color={tx.direction === 'received' ? Colors.tertiary : Colors.primary} />
                </View>
                <View style={styles.txInfo}>
                  <View style={styles.txNameRow}>
                    <Text style={styles.txName}>{tx.name}</Text>
                    {i === 0 && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.txPurpose}>{tx.purpose}</Text>
                  <View style={styles.txMeta}>
                    <MaterialCommunityIcons name="clock-outline" size={12} color={Colors.outline} />
                    <Text style={styles.txDate}>{tx.date}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, tx.direction === 'received' && { color: Colors.tertiary }]}>
                  {tx.direction === 'received' ? '+' : '-'}{tx.amount}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerPaddingMobile, paddingVertical: Spacing.stackMd,
    backgroundColor: Colors.surface, ...Shadow.level1,
  },
  headerTitle: { fontSize: Typography.headlineMd.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  searchButton: { padding: 8, borderRadius: BorderRadius.full },
  scrollContent: { paddingBottom: 100 },
  filterRow: { paddingVertical: Spacing.stackSm, paddingLeft: Spacing.containerPaddingMobile },
  filterContent: { flexDirection: 'row', gap: 8, paddingRight: Spacing.containerPaddingMobile },
  filterChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerLow, borderWidth: 1, borderColor: Colors.outlineVariant + '66' },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },
  filterTextActive: { color: Colors.onPrimary },
  statsRow: { flexDirection: 'row', gap: Spacing.stackMd, paddingHorizontal: Spacing.containerPaddingMobile, marginTop: 12 },
  statCard: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant + '33', ...Shadow.level1,
  },
  statCardLabel: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },
  statCardValue: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.containerPaddingMobile, marginTop: Spacing.gutter, marginBottom: Spacing.stackSm },
  sectionTitle: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  exportText: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.secondary },
  txCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.stackSm, paddingHorizontal: Spacing.containerPaddingMobile,
    marginHorizontal: Spacing.containerPaddingMobile, marginBottom: 4,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant + '1A', ...Shadow.level1,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm, flex: 1 },
  txAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txName: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurface },
  newBadge: { backgroundColor: Colors.secondaryContainer, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  newBadgeText: { fontSize: 8, fontWeight: '700', color: Colors.onSecondaryContainer, letterSpacing: 0.5 },
  txPurpose: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onSurfaceVariant, marginTop: 1 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  txDate: { fontSize: 11, fontFamily: 'Inter', color: Colors.outline },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurface },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter', fontWeight: '600' },
});
