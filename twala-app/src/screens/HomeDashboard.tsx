import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QUICK_SEND = [
  { name: 'Maama', icon: 'face-woman-profile' as const, color: Colors.primaryFixed },
  { name: 'Ssekandi', icon: 'face-man-profile' as const, color: Colors.tertiaryFixed },
  { name: 'Sarah', icon: 'face-woman-profile' as const, color: Colors.secondaryFixed },
];

const GOALS = [
  {
    title: 'Build My Home',
    phase: 'Foundation Phase',
    icon: 'home' as const,
    iconBg: Colors.primaryFixed,
    iconColor: Colors.primary,
    saved: '20M',
    target: '150M',
    progress: 13.3,
    progressColor: Colors.primary,
  },
  {
    title: 'Buy Land in Wakiso',
    phase: 'Acquisition',
    icon: 'grass' as const,
    iconBg: Colors.tertiaryFixed,
    iconColor: Colors.tertiary,
    saved: '5M',
    target: '30M',
    progress: 16.6,
    progressColor: Colors.tertiaryContainer,
  },
];

import type { AppScreen } from '../components/BottomNavBar';

export default function HomeDashboard({ onNavigate }: { onNavigate: (route: AppScreen) => void }) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <View style={styles.avatarInner}>
                <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAF9wsLZ_0HCA4BZw063PHOO5uzAo_kkcjo_WDLWiVtTnDfHIKzIcmpUt4esR9KRhDcdNLbdCwyYECKow4DcdMa3SwDBAj33Po3WvUXYEqjkXfdCFFDPk-SGwKZ4ajYz9ahvm29Y2AjpBDaaL-NqyOBIoTGqniGsvDUulQrW7IwIcLWwrWyCGyKXgbfCoBzJff5yfBxE2KEYNoG_YUGNeFKh1Nf5eZS-FES2-IglCnJM2kQxxCIjSTn' }}
                  style={styles.avatarImage}
                />
              </View>
            </View>
            <Text style={styles.appTitle}>Kanzu</Text>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeSub}>Good morning,</Text>
          <Text style={styles.welcomeName}>Kakuru</Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressLabel}>Global Goal Progress</Text>
              <Text style={styles.progressPercent}>65%</Text>
            </View>
            <View style={styles.onTrackBadge}>
              <Text style={styles.onTrackText}>On Track</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '65%' }]} />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Saved</Text>
              <Text style={styles.statValue}>25.4M <Text style={styles.statUnit}>UGX</Text></Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Projected Goal</Text>
              <Text style={styles.statValue}>2026</Text>
            </View>
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
            <TouchableOpacity style={styles.quickSendItem}>
              <View style={styles.quickSendAdd}>
                <MaterialCommunityIcons name="plus" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.quickSendName}>New</Text>
            </TouchableOpacity>
            {QUICK_SEND.map((person) => (
              <TouchableOpacity key={person.name} style={styles.quickSendItem}>
                <View style={[styles.quickSendAvatar, { backgroundColor: person.color }]}>
                  <MaterialCommunityIcons name={person.icon} size={24} color={Colors.onPrimaryFixed} />
                </View>
                <Text style={styles.quickSendName}>{person.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.goalsSection}>
          <Text style={styles.sectionTitle}>Active Goals</Text>
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
                    <MaterialCommunityIcons name={goal.icon} size={20} color={goal.iconColor} />
                  </View>
                  <View>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalPhase}>{goal.phase}</Text>
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
            <View style={styles.urgentIcon}>
              <MaterialCommunityIcons name="school" size={20} color={Colors.onSecondaryContainer} />
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
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="trending-up" size={24} color={Colors.secondary} />
            <Text style={styles.infoLabel}>Exchange Rate</Text>
            <Text style={styles.infoValue}>1 GBP = 4,750 <Text style={styles.infoUnit}>UGX</Text></Text>
          </View>
          <TouchableOpacity style={styles.supportCard} activeOpacity={0.7} onPress={() => onNavigate('Assistant')}>
            <View>
              <Text style={styles.supportLabel}>Support</Text>
              <Text style={styles.supportValue}>Chat with Kanzu</Text>
            </View>
            <MaterialCommunityIcons
              name="robot"
              size={80}
              color={Colors.onTertiary}
              style={styles.supportIcon}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingVertical: Spacing.stackMd,
    backgroundColor: Colors.surface,
    ...Shadow.level1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.stackSm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primaryFixed,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryContainer,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    fontSize: Typography.headlineMd.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.primary,
  },
  notifButton: {
    padding: 8,
    borderRadius: BorderRadius.full,
  },
  welcomeSection: {
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingTop: Spacing.gutter,
  },
  welcomeSub: {
    fontSize: Typography.bodyMd.fontSize,
    fontFamily: 'Inter',
    color: Colors.onSurfaceVariant,
  },
  welcomeName: {
    fontSize: Typography.displayLgMobile.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  progressCard: {
    marginHorizontal: Spacing.containerPaddingMobile,
    marginTop: Spacing.gutter,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.gutter,
    ...Shadow.level2,
    overflow: 'hidden',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progressLabel: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.onPrimary,
    opacity: 0.8,
  },
  progressPercent: {
    fontSize: Typography.displayLgMobile.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '700',
    color: Colors.onPrimary,
    marginTop: 4,
  },
  onTrackBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  onTrackText: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSecondaryContainer,
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    marginTop: Spacing.gutter,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.secondaryContainer,
    borderRadius: BorderRadius.full,
  },
  progressStats: {
    flexDirection: 'row',
    gap: Spacing.stackMd,
    marginTop: Spacing.gutter,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.md,
  },
  statLabel: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onPrimary,
    opacity: 0.7,
  },
  statValue: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.onPrimary,
    marginTop: 4,
  },
  statUnit: {
    fontSize: 12,
  },
  quickSendSection: {
    marginTop: Spacing.gutter,
    paddingLeft: Spacing.containerPaddingMobile,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: Spacing.containerPaddingMobile,
    marginBottom: Spacing.stackMd,
  },
  sectionTitle: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.primary,
  },
  seeAll: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.secondary,
  },
  quickSendList: {
    flexDirection: 'row',
    gap: Spacing.stackMd,
    paddingRight: Spacing.containerPaddingMobile,
  },
  quickSendItem: {
    alignItems: 'center',
    gap: 8,
  },
  quickSendAdd: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  quickSendAvatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSendName: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurface,
  },
  goalsSection: {
    paddingHorizontal: Spacing.containerPaddingMobile,
    marginTop: Spacing.gutter,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '33',
    ...Shadow.level1,
    marginBottom: Spacing.stackMd,
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.stackSm,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.stackSm,
  },
  goalIconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTitle: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.onSurface,
  },
  goalPhase: {
    fontSize: 10,
    fontFamily: 'Inter',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  goalPercent: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  goalProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalSaved: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  goalUnit: {
    fontSize: 10,
  },
  goalTarget: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    color: Colors.outline,
  },
  goalBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  urgentCard: {
    backgroundColor: Colors.secondaryFixed + '1A',
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.secondaryContainer + '33',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.stackMd,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondaryContainer,
  },
  urgentIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentContent: {
    flex: 1,
  },
  urgentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgentTitle: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.onSurface,
  },
  urgentBadge: {
    backgroundColor: Colors.secondaryContainer + '33',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: Colors.onSecondaryContainer,
  },
  urgentBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  urgentTime: {
    fontSize: Typography.bodySm.fontSize,
    fontFamily: 'Inter',
    color: Colors.onSurfaceVariant,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: Spacing.stackMd,
    paddingHorizontal: Spacing.containerPaddingMobile,
    marginTop: Spacing.gutter,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '1A',
    ...Shadow.level1,
  },
  infoLabel: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.stackSm,
  },
  infoValue: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
  },
  infoUnit: {
    fontSize: 12,
  },
  supportCard: {
    flex: 1,
    backgroundColor: Colors.tertiary,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  supportLabel: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onTertiary,
    opacity: 0.8,
  },
  supportValue: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.onTertiary,
    marginTop: 4,
  },
  supportIcon: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    opacity: 0.1,
  },
});
