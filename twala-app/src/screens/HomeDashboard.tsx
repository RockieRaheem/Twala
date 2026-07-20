import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, Image, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import type { AppScreen } from '../components/BottomNavBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QUICK_SEND = [
  { name: 'Maama', initials: 'M', color: Colors.primaryFixed, bg: Colors.primary },
  { name: 'Ssekandi', initials: 'S', color: Colors.tertiaryFixed, bg: Colors.tertiary },
  { name: 'Sarah', initials: 'S', color: Colors.secondaryFixed, bg: Colors.secondary },
  { name: 'Taata', initials: 'T', color: Colors.tertiaryFixedDim, bg: Colors.tertiaryContainer },
];

const GOALS = [
  {
    title: 'Build My Home', phase: 'Foundation Phase', icon: 'home' as const,
    iconBg: Colors.primaryFixed, iconColor: Colors.primary,
    saved: '20M', target: '150M', progress: 13.3, progressColor: Colors.primary,
  },
  {
    title: 'Buy Land in Wakiso', phase: 'Acquisition', icon: 'grass' as const,
    iconBg: Colors.tertiaryFixed, iconColor: Colors.tertiary,
    saved: '5M', target: '30M', progress: 16.6, progressColor: Colors.tertiaryContainer,
  },
];

const EXCHANGE_RATES = [
  { from: '1 GBP', to: '4,750 UGX' },
  { from: '1 USD', to: '3,750 UGX' },
  { from: '1 EUR', to: '4,100 UGX' },
  { from: '1 AED', to: '1,020 UGX' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeDashboard({ onNavigate }: { onNavigate: (route: AppScreen) => void }) {
  const [refreshing, setRefreshing] = useState(false);
  const [rateIndex, setRateIndex] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const cycleRate = () => setRateIndex((i) => (i + 1) % EXCHANGE_RATES.length);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAF9wsLZ_0HCA4BZw063PHOO5uzAo_kkcjo_WDLWiVtTnDfHIKzIcmpUt4esR9KRhDcdNLbdCwyYECKow4DcdMa3SwDBAj33Po3WvUXYEqjkXfdCFFDPk-SGwKZ4ajYz9ahvm29Y2AjpBDaaL-NqyOBIoTGqniGsvDUulQrW7IwIcLWwrWyCGyKXgbfCoBzJff5yfBxE2KEYNoG_YUGNeFKh1Nf5eZS-FES2-IglCnJM2kQxxCIjSTn' }}
                style={styles.avatarImage}
              />
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={styles.appTitle}>Kanzu</Text>
              <Text style={styles.appSub}>Financial Companion</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>3</Text>
            </View>
            <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeSub}>{getGreeting()},</Text>
          <Text style={styles.welcomeName}>Kakuru</Text>
          <Text style={styles.welcomeTagline}>Your goals are on track this week</Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressRing}>
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                <Text style={styles.ringPercent}>65%</Text>
                <Text style={styles.ringLabel}>overall</Text>
              </View>
            </View>
            <View style={styles.progressRight}>
              <View style={styles.onTrackBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color={Colors.onSecondaryContainer} />
                <Text style={styles.onTrackText}>On Track</Text>
              </View>
              <View style={styles.progressStatItem}>
                <MaterialCommunityIcons name="calendar-check" size={16} color={Colors.onPrimary} />
                <Text style={styles.progressStatText}>Target: 2026</Text>
              </View>
              <View style={styles.progressStatItem}>
                <MaterialCommunityIcons name="trophy" size={16} color={Colors.onPrimary} />
                <Text style={styles.progressStatText}>25.4M UGX saved</Text>
              </View>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '65%' }]} />
          </View>
        </View>

        <View style={styles.quickSendSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Send</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickSendList}>
            <TouchableOpacity style={styles.quickSendItem} activeOpacity={0.6}>
              <View style={styles.quickSendAdd}>
                <MaterialCommunityIcons name="plus" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.quickSendName}>New</Text>
            </TouchableOpacity>
            {QUICK_SEND.map((person) => (
              <TouchableOpacity key={person.name} style={styles.quickSendItem} activeOpacity={0.6}>
                <View style={[styles.quickSendAvatar, { backgroundColor: person.color }]}>
                  <Text style={[styles.quickSendInitials, { color: person.bg }]}>{person.initials}</Text>
                </View>
                <Text style={styles.quickSendName}>{person.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.goalsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Goals</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Manage</Text>
            </TouchableOpacity>
          </View>
          {GOALS.map((goal, index) => (
            <TouchableOpacity
              key={index}
              style={styles.goalCard}
              activeOpacity={0.7}
              onPress={() => onNavigate('GoalDetail')}
            >
              <View style={styles.goalTop}>
                <View style={styles.goalInfo}>
                  <View style={[styles.goalIconBox, { backgroundColor: goal.iconBg }]}>
                    <MaterialCommunityIcons name={goal.icon} size={22} color={goal.iconColor} />
                  </View>
                  <View style={styles.goalTextWrap}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <View style={styles.goalPhaseRow}>
                      <View style={[styles.goalPhaseDot, { backgroundColor: goal.progressColor }]} />
                      <Text style={styles.goalPhase}>{goal.phase}</Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.goalPercent, { color: goal.progressColor }]}>{Math.round(goal.progress)}%</Text>
              </View>
              <View style={styles.goalProgressRow}>
                <Text style={styles.goalSaved}>{goal.saved} <Text style={styles.goalUnit}>UGX</Text></Text>
                <Text style={styles.goalTarget}>Target: {goal.target}</Text>
              </View>
              <View style={styles.goalBarBg}>
                <View style={[styles.goalBarFill, { width: `${goal.progress}%`, backgroundColor: goal.progressColor }]} />
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.urgentCard} activeOpacity={0.7}>
            <View style={styles.urgentIconWrap}>
              <View style={styles.urgentIcon}>
                <MaterialCommunityIcons name="school" size={22} color={Colors.onSecondaryContainer} />
              </View>
              <View style={styles.urgentPing} />
            </View>
            <View style={styles.urgentContent}>
              <View style={styles.urgentTop}>
                <Text style={styles.urgentTitle}>Junior's School Fees</Text>
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentBadgeText}>URGENT</Text>
                </View>
              </View>
              <View style={styles.urgentBottom}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.onSurfaceVariant} />
                <Text style={styles.urgentTime}>Upcoming payment in 12 days</Text>
              </View>
              <View style={styles.urgentProgressMini}>
                <View style={styles.urgentProgressFill} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.infoGrid}>
          <TouchableOpacity style={styles.infoCard} onPress={cycleRate} activeOpacity={0.7}>
            <View style={styles.infoCardHeader}>
              <MaterialCommunityIcons name="currency-usd" size={20} color={Colors.secondary} />
              <Text style={styles.infoCardBadge}>
                <MaterialCommunityIcons name="sync" size={12} color={Colors.secondary} /> Live
              </Text>
            </View>
            <Text style={styles.infoLabel}>Exchange Rate</Text>
            <Text style={styles.infoValue}>
              {EXCHANGE_RATES[rateIndex].from} = <Text style={styles.infoHighlight}>{EXCHANGE_RATES[rateIndex].to}</Text>
            </Text>
            <Text style={styles.infoTap}>Tap to cycle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportCard} activeOpacity={0.7} onPress={() => onNavigate('Assistant')}>
            <MaterialCommunityIcons name="robot" size={28} color={Colors.onTertiary} style={styles.supportIconTop} />
            <Text style={styles.supportLabel}>Need help?</Text>
            <Text style={styles.supportValue}>Chat with Kanzu</Text>
            <View style={styles.supportArrow}>
              <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.onTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.activityPreview}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => onNavigate('History')}>
              <Text style={styles.seeAll}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={[styles.activityDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.activityText}>Sent $250 to Maama</Text>
              <Text style={styles.activityTime}>2h ago</Text>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityItem}>
              <View style={[styles.activityDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.activityText}>$1,200 released to Sula Contractors</Text>
              <Text style={styles.activityTime}>Yesterday</Text>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityItem}>
              <View style={[styles.activityDot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.activityText}>School fees reminder set</Text>
              <Text style={styles.activityTime}>2d ago</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <MaterialCommunityIcons name="plus" size={28} color={Colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 120 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerPaddingMobile, paddingVertical: Spacing.stackSm,
    backgroundColor: Colors.surface, ...Shadow.level1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm },
  avatar: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', borderWidth: 2, borderColor: Colors.primaryFixed, position: 'relative' },
  avatarImage: { width: '100%', height: '100%' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.surface },
  appTitle: { fontSize: Typography.headlineMd.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  appSub: { fontSize: 11, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant, marginTop: -2 },
  notifButton: { padding: 8, borderRadius: BorderRadius.full, position: 'relative' },
  notifBadge: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center', zIndex: 1, borderWidth: 2, borderColor: Colors.surface },
  notifBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.onError },
  welcomeSection: { paddingHorizontal: Spacing.containerPaddingMobile, paddingTop: Spacing.gutter },
  welcomeSub: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onSurfaceVariant },
  welcomeName: { fontSize: Typography.displayLgMobile.fontSize, fontFamily: 'Montserrat', fontWeight: '700', color: Colors.primary, marginTop: 2 },
  welcomeTagline: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onSurfaceVariant, marginTop: 4, opacity: 0.8 },
  progressCard: {
    marginHorizontal: Spacing.containerPaddingMobile, marginTop: Spacing.gutter,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.xl,
    padding: Spacing.gutter, ...Shadow.level2, overflow: 'hidden',
  },
  progressRing: { flexDirection: 'row', gap: Spacing.stackLg, alignItems: 'center' },
  ringOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 6, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  ringInner: { alignItems: 'center' },
  ringPercent: { fontSize: 28, fontFamily: 'Montserrat', fontWeight: '700', color: Colors.onPrimary },
  ringLabel: { fontSize: 10, fontFamily: 'Inter', fontWeight: '500', color: Colors.onPrimary, opacity: 0.7, marginTop: -2 },
  progressRight: { flex: 1, gap: Spacing.stackSm },
  onTrackBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.secondaryContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
  onTrackText: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSecondaryContainer },
  progressStatItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressStatText: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onPrimary, opacity: 0.85 },
  progressBarBg: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.full, marginTop: Spacing.gutter, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.secondaryContainer, borderRadius: BorderRadius.full },
  quickSendSection: { marginTop: Spacing.gutter, paddingLeft: Spacing.containerPaddingMobile },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: Spacing.containerPaddingMobile, marginBottom: Spacing.stackMd },
  sectionTitle: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  seeAll: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.secondary },
  quickSendList: { flexDirection: 'row', gap: Spacing.stackMd, paddingRight: Spacing.containerPaddingMobile },
  quickSendItem: { alignItems: 'center', gap: 8 },
  quickSendAdd: { width: 60, height: 60, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.outlineVariant + '4D', borderStyle: 'dashed' },
  quickSendAvatar: { width: 60, height: 60, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  quickSendInitials: { fontSize: 22, fontFamily: 'Montserrat', fontWeight: '700' },
  quickSendName: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurface },
  goalsSection: { paddingHorizontal: Spacing.containerPaddingMobile, marginTop: Spacing.gutter },
  goalCard: { backgroundColor: Colors.surface, padding: Spacing.stackMd, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant + '33', ...Shadow.level1, marginBottom: Spacing.stackMd },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.stackSm },
  goalInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm },
  goalIconBox: { width: 44, height: 44, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  goalTextWrap: {},
  goalTitle: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurface },
  goalPhaseRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  goalPhaseDot: { width: 6, height: 6, borderRadius: 3 },
  goalPhase: { fontSize: 10, fontFamily: 'Inter', color: Colors.onSurfaceVariant, letterSpacing: 0.3, textTransform: 'uppercase' },
  goalPercent: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '700' },
  goalProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalSaved: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },
  goalUnit: { fontSize: 10 },
  goalTarget: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', color: Colors.outline },
  goalBarBg: { width: '100%', height: 8, backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.full, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: BorderRadius.full },
  urgentCard: { backgroundColor: Colors.secondaryFixed + '1A', padding: Spacing.stackMd, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.secondaryContainer + '33', flexDirection: 'row', gap: Spacing.stackMd, borderLeftWidth: 4, borderLeftColor: Colors.secondaryContainer, marginBottom: 8 },
  urgentIconWrap: { position: 'relative' },
  urgentIcon: { width: 44, height: 44, borderRadius: BorderRadius.lg, backgroundColor: Colors.secondaryContainer, justifyContent: 'center', alignItems: 'center' },
  urgentPing: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.error, borderWidth: 2, borderColor: Colors.secondaryFixed + '1A' },
  urgentContent: { flex: 1 },
  urgentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  urgentTitle: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurface },
  urgentBadge: { backgroundColor: Colors.secondaryContainer + '33', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  urgentBadgeText: { fontSize: 10, fontFamily: 'Inter', fontWeight: '700', color: Colors.onSecondaryContainer },
  urgentBottom: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  urgentTime: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onSurfaceVariant },
  urgentProgressMini: { width: '100%', height: 4, backgroundColor: Colors.secondaryContainer + '4D', borderRadius: 2, marginTop: Spacing.stackSm, overflow: 'hidden' },
  urgentProgressFill: { width: '65%', height: '100%', backgroundColor: Colors.secondaryContainer, borderRadius: 2 },
  infoGrid: { flexDirection: 'row', gap: Spacing.stackMd, paddingHorizontal: Spacing.containerPaddingMobile, marginTop: Spacing.gutter },
  infoCard: { flex: 1, backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.stackMd, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant + '1A', ...Shadow.level1 },
  infoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.stackSm },
  infoCardBadge: { fontSize: 10, fontFamily: 'Inter', fontWeight: '600', color: Colors.secondary, flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },
  infoValue: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary, marginTop: 4 },
  infoHighlight: { color: Colors.secondary },
  infoTap: { fontSize: 10, fontFamily: 'Inter', color: Colors.outline, marginTop: 4, fontStyle: 'italic' },
  supportCard: { flex: 1, backgroundColor: Colors.tertiary, padding: Spacing.stackMd, borderRadius: BorderRadius.xl, overflow: 'hidden', position: 'relative', justifyContent: 'space-between' },
  supportIconTop: { marginBottom: Spacing.stackSm },
  supportLabel: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onTertiary, opacity: 0.8 },
  supportValue: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.onTertiary, marginTop: 2 },
  supportArrow: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  activityPreview: { paddingHorizontal: Spacing.containerPaddingMobile, marginTop: Spacing.gutter },
  activityCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, padding: Spacing.stackMd, borderWidth: 1, borderColor: Colors.outlineVariant + '1A', ...Shadow.level1 },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm, paddingVertical: 6 },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityText: { flex: 1, fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onSurface },
  activityTime: { fontSize: 11, fontFamily: 'Inter', color: Colors.outline },
  activityDivider: { height: 1, backgroundColor: Colors.outlineVariant + '33', marginVertical: 2 },
  fab: {
    position: 'absolute', bottom: 100, right: Spacing.containerPaddingMobile,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', ...Shadow.level2,
    borderWidth: 3, borderColor: Colors.surface,
  },
});
