import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { goalsApi, type GoalData } from '../services/api';

const TABS = ['Overview', 'Milestones', 'Payments'];

const MILESTONES = [
  {
    title: 'Foundation', status: 'Done', statusColor: Colors.primary, statusBg: Colors.primaryFixed,
    icon: 'check' as const, iconBg: Colors.primary,
    description: 'Excavation, leveling, and slab casting completed on May 12, 2024.',
    date: 'May 12, 2024', progress: 100,
  },
  {
    title: 'Walls & Structural Frame', status: 'In Progress', statusColor: Colors.secondary, statusBg: 'transparent',
    icon: null, iconBg: Colors.secondaryContainer,
    description: 'Brickwork, reinforcement, and vertical structures.',
    date: 'Est. Aug 20', progress: 45,
  },
  {
    title: 'Roofing & Finishing', status: 'Pending', statusColor: Colors.outline, statusBg: 'transparent',
    icon: 'timer-sand' as const, iconBg: Colors.surfaceContainerHighest,
    description: 'Unlock after walls milestone is verified.',
    date: null, progress: 0,
  },
  {
    title: 'Interior & Handover', status: 'Pending', statusColor: Colors.outline, statusBg: 'transparent',
    icon: 'door' as const, iconBg: Colors.surfaceContainerHighest,
    description: 'Electrical, plumbing, painting, and final inspection.',
    date: null, progress: 0,
  },
];

const TRANSACTIONS = [
  { name: 'Sula Contractors', subtitle: 'Labor Release • 2 days ago', icon: 'hard-hat' as const, amount: '+$1,200.00', verified: true },
  { name: 'Hardware World', subtitle: 'Material Supply • Jul 28', icon: 'store' as const, amount: '+$4,550.00', verified: true },
  { name: 'Architect Fees', subtitle: 'Design Phase • Jun 15', icon: 'draw-pen' as const, amount: '+$800.00', verified: true },
];

function formatUgx(ugx: number): string {
  if (ugx >= 1_000_000) return `UGX ${(ugx / 1_000_000).toFixed(1)}M`;
  if (ugx >= 1_000) return `UGX ${(ugx / 1_000).toFixed(1)}K`;
  return `UGX ${ugx.toLocaleString()}`;
}

function formatUsdc(ugx: number, rate: number): string {
  return `$${(ugx / rate).toFixed(2)}`;
}

export default function GoalDetail({ goalId, onBack }: { goalId?: string | null; onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!goalId) { setLoading(false); return; }
    goalsApi.get(goalId).then((res) => {
      if (res.success && res.data) setGoal(res.data);
      setLoading(false);
    });
  }, [goalId]);

  const pct = goal && goal.targetAmountUgx > 0 ? Math.round((goal.savedAmountUgx / goal.targetAmountUgx) * 100) : 0;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kanzu</Text>
        </View>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.onSurfaceVariant} />
          <TouchableOpacity style={styles.headerAction}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroImage}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzFEq8GlOz8yd-NIKSXqQPxEtjejFeSjgxy2yKOvhBILnKaO_9ayVwMMwZ1IHnV5VImfSzJqYafOHHm06ov9ITBanAcHjCjF0S6AJEETeRbivFWOBV5zFdQ5VOJ2J8P2m7VFaDjiUbYE2KNvuyg3_lcZt73gd7RLz10_iLg9mMTxCZN8flH4xG7SR8Rn7I6ru-LuwCGZBzs4ETmmnJ2030y_oHe-qLo5Ue9dr5auw27QELOY6XtUzu' }}
              style={styles.heroImageContent}
            />
            <View style={styles.heroOverlay}>
              <View style={styles.heroBadge}>
                <MaterialCommunityIcons name="home" size={14} color={Colors.onSecondaryContainer} />
                <Text style={styles.heroBadgeText}>{goal?.title || 'Build My Home'}</Text>
              </View>
              <Text style={styles.heroTitle}>{goal?.description || 'Modern Family Bungalow'}</Text>
              <Text style={styles.heroSubtitle}>ID: {goal?.id || 'KNZ-2024-08'}</Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{formatUgx(goal?.targetAmountUgx || 0)}</Text>
              <Text style={styles.heroStatLabel}>Total Value</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{formatUsdc(goal?.savedAmountUgx || 0, 3700)}</Text>
              <Text style={styles.heroStatLabel}>Released</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{pct}%</Text>
              <Text style={styles.heroStatLabel}>Funded</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Overview' && (
          <View style={styles.tabContent}>
            <View style={styles.verifiedBanner}>
              <MaterialCommunityIcons name="check-decagram" size={20} color={Colors.secondaryFixedDim} />
              <View style={styles.verifiedTextWrap}>
                <Text style={styles.verifiedTitle}>Verified Assets</Text>
                <Text style={styles.verifiedDesc}>Land title & building permits authenticated by Kanzu Legal Services.</Text>
              </View>
            </View>

            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <MaterialCommunityIcons name="calendar-month" size={24} color={Colors.primary} />
                <Text style={styles.overviewCardLabel}>Started</Text>
                <Text style={styles.overviewCardValue}>{goal ? new Date(goal.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Mar 2024'}</Text>
              </View>
              <View style={styles.overviewCard}>
                <MaterialCommunityIcons name="flag-checkered" size={24} color={Colors.secondary} />
                <Text style={styles.overviewCardLabel}>Target</Text>
                <Text style={styles.overviewCardValue}>{goal ? new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Dec 2025'}</Text>
              </View>
              <View style={styles.overviewCard}>
                <MaterialCommunityIcons name="account-group" size={24} color={Colors.tertiary} />
                <Text style={styles.overviewCardLabel}>Contractors</Text>
                <Text style={styles.overviewCardValue}>3 active</Text>
              </View>
              <View style={[styles.overviewCard, { backgroundColor: Colors.primaryContainer }]}>
                <MaterialCommunityIcons name="shield-check" size={24} color={Colors.onPrimary} />
                <Text style={[styles.overviewCardLabel, { color: Colors.onPrimary, opacity: 0.7 }]}>Status</Text>
                <Text style={[styles.overviewCardValue, { color: Colors.onPrimary }]}>{goal?.status === 'completed' ? 'Completed' : 'Active'}</Text>
              </View>
            </View>

            <View style={styles.progressDetail}>
              <View style={styles.progressDetailHeader}>
                <Text style={styles.progressDetailTitle}>Goal Progress</Text>
                <Text style={styles.progressDetailPercent}>{pct}% complete</Text>
              </View>
              <View style={styles.progressDetailBarBg}>
                <View style={[styles.progressDetailBarFill, { width: `${pct}%` }]} />
              </View>
              <View style={styles.progressDetailLabels}>
                <Text style={styles.progressDetailLabel}>Saved: {formatUgx(goal?.savedAmountUgx || 0)}</Text>
                <Text style={[styles.progressDetailLabel, { color: Colors.outline }]}>Target: {formatUgx(goal?.targetAmountUgx || 0)}</Text>
              </View>
            </View>

            <View style={styles.photoPreview}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Site Photos</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>View all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoList}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.photoCard}>
                    <View style={styles.photoPlaceholder}>
                      <MaterialCommunityIcons name="image" size={32} color={Colors.outline} />
                    </View>
                    <Text style={styles.photoLabel}>Site progress #{i}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {activeTab === 'Milestones' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Milestone Tracker</Text>
            {MILESTONES.map((ms, index) => (
              <View key={index} style={styles.milestoneItem}>
                <View style={styles.milestoneLine} />
                <View style={[styles.milestoneDot, { backgroundColor: ms.iconBg }]}>
                  {ms.icon ? (
                    <MaterialCommunityIcons name={ms.icon as any} size={14} color={Colors.onPrimary} />
                  ) : (
                    <View style={[styles.milestoneProgressDot, { backgroundColor: ms.progress > 0 ? Colors.secondaryContainer : Colors.outline }]} />
                  )}
                </View>
                <View style={styles.milestoneContent}>
                  <View style={styles.milestoneTop}>
                    <Text style={[styles.milestoneTitle, ms.progress === 0 && ms.status === 'Pending' && { color: Colors.outline }]}>{ms.title}</Text>
                    <View style={[styles.milestoneStatus, { backgroundColor: ms.status === 'Done' ? Colors.primaryFixed + '99' : ms.progress > 0 ? Colors.secondaryContainer + '66' : Colors.surfaceContainerHighest }]}>
                      <Text style={[styles.milestoneStatusText, { color: ms.statusColor }]}>{ms.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.milestoneDesc, ms.progress === 0 && ms.status === 'Pending' && { opacity: 0.5 }]}>{ms.description}</Text>
                  {ms.date && (
                    <View style={styles.milestoneDateRow}>
                      <MaterialCommunityIcons name="calendar" size={12} color={Colors.outline} />
                      <Text style={styles.milestoneDate}>{ms.date}</Text>
                    </View>
                  )}
                  {ms.progress > 0 && (
                    <View style={styles.milestoneProgressRow}>
                      <View style={styles.milestoneProgressBg}>
                        <View style={[styles.milestoneProgressFill, { width: `${ms.progress}%` }]} />
                      </View>
                      <Text style={styles.milestoneProgressLabel}>{ms.progress}%</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Payments' && (
          <View style={styles.tabContent}>
            <View style={styles.paymentsHeader}>
              <MaterialCommunityIcons name="bank-transfer" size={20} color={Colors.secondary} />
              <Text style={styles.sectionTitle}>Trusted Payments</Text>
            </View>
            <Text style={styles.paymentsDesc}>Funds held in escrow — released only upon milestone verification.</Text>

            <View style={styles.paymentSummary}>
              <View style={styles.paymentSummaryItem}>
                <Text style={styles.paymentSummaryLabel}>Released</Text>
                <Text style={styles.paymentSummaryValue}>{formatUsdc(goal?.savedAmountUgx || 16150, 3700)}</Text>
              </View>
              <View style={styles.paymentSummaryDivider} />
              <View style={styles.paymentSummaryItem}>
                <Text style={styles.paymentSummaryLabel}>Total Budget</Text>
                <Text style={[styles.paymentSummaryValue, { color: Colors.primary }]}>{formatUsdc(goal?.targetAmountUgx || 42500, 3700)}</Text>
              </View>
            </View>

            {TRANSACTIONS.map((tx, index) => (
              <View key={index} style={styles.txItem}>
                <View style={styles.txIcon}>
                  <MaterialCommunityIcons name={tx.icon as any} size={20} color={Colors.primary} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txName}>{tx.name}</Text>
                  <Text style={styles.txSubtitle}>{tx.subtitle}</Text>
                </View>
                <View style={styles.txAmountCol}>
                  <Text style={styles.txAmount}>{tx.amount}</Text>
                  <View style={styles.txVerified}>
                    <MaterialCommunityIcons name="check-decagram" size={12} color={Colors.primary} />
                    <Text style={styles.txVerifiedText}>Verified</Text>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.sendPaymentButton} activeOpacity={0.8}>
              <MaterialCommunityIcons name="send" size={20} color={Colors.onPrimary} />
              <Text style={styles.sendPaymentText}>Send Progress Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerPaddingMobile, paddingVertical: Spacing.stackSm,
    backgroundColor: Colors.surface, ...Shadow.level1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm },
  backButton: { padding: 8, borderRadius: BorderRadius.full },
  headerTitle: { fontSize: Typography.headlineMd.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm },
  headerAction: { padding: 8, borderRadius: BorderRadius.full },
  scrollContent: { paddingBottom: 100 },
  heroSection: { paddingHorizontal: Spacing.containerPaddingMobile, paddingTop: Spacing.gutter },
  heroImage: { height: 260, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadow.level2 },
  heroImageContent: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.stackLg, backgroundColor: 'rgba(0,67,54,0.55)' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.secondaryContainer, paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginBottom: 8 },
  heroBadgeText: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSecondaryContainer },
  heroTitle: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.onPrimary, marginBottom: 2 },
  heroSubtitle: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onPrimary, opacity: 0.8 },
  heroStats: { flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest, marginTop: Spacing.stackMd, borderRadius: BorderRadius.xl, padding: Spacing.stackMd, ...Shadow.level1, borderWidth: 1, borderColor: Colors.outlineVariant + '33' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatDivider: { width: 1, backgroundColor: Colors.outlineVariant + '4D', marginVertical: 4 },
  heroStatValue: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '700', color: Colors.primary },
  heroStatLabel: { fontSize: 11, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant, marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: 4, paddingHorizontal: Spacing.containerPaddingMobile, marginTop: Spacing.gutter, backgroundColor: Colors.surfaceContainerLow, marginHorizontal: Spacing.containerPaddingMobile, borderRadius: BorderRadius.lg, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.surfaceContainerLowest, ...Shadow.level1 },
  tabText: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },
  tabTextActive: { color: Colors.primary, fontWeight: '600' },
  tabContent: { paddingHorizontal: Spacing.containerPaddingMobile, marginTop: Spacing.gutter, gap: Spacing.stackMd },
  verifiedBanner: { flexDirection: 'row', gap: Spacing.stackMd, alignItems: 'center', backgroundColor: Colors.primaryContainer, padding: Spacing.stackMd, borderRadius: BorderRadius.xl },
  verifiedTextWrap: { flex: 1 },
  verifiedTitle: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onPrimary },
  verifiedDesc: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.primaryFixedDim, marginTop: 2 },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.stackSm },
  overviewCard: { width: '48%', backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.stackMd, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant + '33', ...Shadow.level1, gap: 4 },
  overviewCardLabel: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },
  overviewCardValue: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  progressDetail: { backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.stackMd, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant + '33', ...Shadow.level1 },
  progressDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.stackSm },
  progressDetailTitle: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurface },
  progressDetailPercent: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.secondary },
  progressDetailBarBg: { width: '100%', height: 10, backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.full, overflow: 'hidden' },
  progressDetailBarFill: { height: '100%', backgroundColor: Colors.secondaryContainer, borderRadius: BorderRadius.full },
  progressDetailLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressDetailLabel: { fontSize: 10, fontFamily: 'Inter', fontWeight: '500', color: Colors.primary },
  photoPreview: {},
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.stackSm },
  sectionTitle: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  seeAllText: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.secondary },
  photoList: { flexDirection: 'row', gap: Spacing.stackSm, paddingRight: Spacing.containerPaddingMobile },
  photoCard: { alignItems: 'center', gap: 6 },
  photoPlaceholder: { width: 100, height: 100, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.outlineVariant + '33' },
  photoLabel: { fontSize: 10, fontFamily: 'Inter', color: Colors.onSurfaceVariant },
  milestoneItem: { flexDirection: 'row', gap: Spacing.stackMd, position: 'relative', marginBottom: Spacing.stackLg },
  milestoneLine: { position: 'absolute', left: 11, top: 24, bottom: -8, width: 2, backgroundColor: Colors.outlineVariant },
  milestoneDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 1, flexShrink: 0 },
  milestoneProgressDot: { width: 8, height: 8, borderRadius: 4 },
  milestoneContent: { flex: 1, paddingBottom: Spacing.stackMd, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant + '33' },
  milestoneTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  milestoneTitle: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.primary },
  milestoneStatus: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full },
  milestoneStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  milestoneDesc: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onSurfaceVariant, marginBottom: 6 },
  milestoneDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  milestoneDate: { fontSize: 11, fontFamily: 'Inter', color: Colors.outline },
  milestoneProgressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm },
  milestoneProgressBg: { flex: 1, height: 6, backgroundColor: Colors.surfaceContainer, borderRadius: BorderRadius.full, overflow: 'hidden' },
  milestoneProgressFill: { height: '100%', backgroundColor: Colors.secondaryContainer, borderRadius: BorderRadius.full },
  milestoneProgressLabel: { fontSize: 11, fontFamily: 'Inter', fontWeight: '600', color: Colors.secondary },
  paymentsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentsDesc: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onSurfaceVariant, marginTop: -8 },
  paymentSummary: { flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.stackMd, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant + '33', ...Shadow.level1 },
  paymentSummaryItem: { flex: 1, alignItems: 'center' },
  paymentSummaryDivider: { width: 1, backgroundColor: Colors.outlineVariant + '4D', marginVertical: 4 },
  paymentSummaryLabel: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },
  paymentSummaryValue: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '700', color: Colors.secondary, marginTop: 2 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.stackSm },
  txIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceContainer, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1, marginLeft: Spacing.stackMd },
  txName: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurface },
  txSubtitle: { fontSize: 12, fontFamily: 'Inter', color: Colors.outline, marginTop: 1 },
  txAmountCol: { alignItems: 'flex-end' },
  txAmount: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.primary },
  txVerified: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  txVerifiedText: { fontSize: 10, fontFamily: 'Inter', fontWeight: '500', color: Colors.primary },
  sendPaymentButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: Spacing.stackMd, borderRadius: BorderRadius.xl, ...Shadow.level1, marginTop: Spacing.stackSm },
  sendPaymentText: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onPrimary },
});
