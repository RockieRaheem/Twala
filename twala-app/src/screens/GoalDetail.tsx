import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MILESTONES = [
  {
    title: 'Foundation',
    status: 'Done',
    statusColor: Colors.primary,
    statusBg: Colors.primaryFixed,
    icon: 'check' as const,
    iconBg: Colors.primary,
    description: 'Excavation, leveling, and slab casting completed on May 12, 2024.',
    date: null,
    progress: null,
  },
  {
    title: 'Walls & Structural Frame',
    status: 'In Progress — 45%',
    statusColor: Colors.secondary,
    statusBg: 'transparent',
    icon: null as string | null,
    iconBg: Colors.secondaryContainer,
    description: null,
    date: 'Estimated Aug 20',
    progress: 45,
  },
  {
    title: 'Roofing & Finishing',
    status: 'Pending',
    statusColor: Colors.outline,
    statusBg: 'transparent',
    icon: 'timer-sand' as const,
    iconBg: Colors.surfaceContainerHighest,
    description: 'Unlock after walls milestone is verified.',
    date: null,
    progress: null,
  },
];

const TRANSACTIONS = [
  {
    name: 'Sula Contractors',
    subtitle: 'Labor Release • 2 days ago',
    icon: 'hard-hat' as const,
    amount: '+$1,200.00',
  },
  {
    name: 'Hardware World',
    subtitle: 'Material Supply • July 28',
    icon: 'saw-blade' as const,
    amount: '+$4,550.00',
  },
];

export default function GoalDetail({ onBack }: { onBack?: () => void }) {
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
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>JD</Text>
          </View>
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
                <Text style={styles.heroBadgeText}>Build My Home</Text>
              </View>
              <Text style={styles.heroTitle}>Modern Family Bungalow — Kira Estate</Text>
              <Text style={styles.heroSubtitle}>Kira, Kampala • Project ID: KNZ-2024-08</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statsCard}>
              <Text style={styles.statsCardLabel}>Total Project Value</Text>
              <Text style={styles.statsCardValue}>$42,500</Text>
              <View style={styles.statsBarBg}>
                <View style={[styles.statsBarFill, { width: '62%' }]} />
              </View>
              <View style={styles.statsBarLabels}>
                <Text style={styles.statsBarLeft}>62% Funded</Text>
                <Text style={styles.statsBarRight}>$26,350 released</Text>
              </View>
            </View>
            <View style={styles.verifiedCard}>
              <View style={styles.verifiedRow}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={20}
                  color={Colors.secondaryFixedDim}
                />
                <Text style={styles.verifiedTitle}>Verified Assets</Text>
              </View>
              <Text style={styles.verifiedDesc}>
                Land title and building permits have been authenticated by Kanzu Legal Services.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.milestonesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Milestone Tracker</Text>
              <TouchableOpacity style={styles.viewDocsButton}>
                <Text style={styles.viewDocsText}>View Docs</Text>
                <MaterialCommunityIcons name="open-in-new" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {MILESTONES.map((ms, index) => (
              <View key={index} style={styles.milestoneItem}>
                <View style={styles.milestoneLine} />
                <View style={[styles.milestoneDot, { backgroundColor: ms.iconBg }]}>
                  {ms.icon ? (
                    <MaterialCommunityIcons name={ms.icon as any} size={14} color={Colors.onPrimary} />
                  ) : (
                    <View style={styles.milestonePulse} />
                  )}
                </View>
                <View style={styles.milestoneContent}>
                  <View style={styles.milestoneTop}>
                    <Text style={styles.milestoneTitle}>{ms.title}</Text>
                    <View style={[styles.milestoneStatus, { backgroundColor: ms.statusBg }]}>
                      <Text style={[styles.milestoneStatusText, { color: ms.statusColor }]}>
                        {ms.status}
                      </Text>
                    </View>
                  </View>
                  {ms.description && (
                    <Text style={styles.milestoneDesc}>{ms.description}</Text>
                  )}
                  {ms.progress !== null && (
                    <View style={styles.milestoneProgressRow}>
                      <View style={styles.milestoneProgressBg}>
                        <View style={[styles.milestoneProgressFill, { width: `${ms.progress}%` }]} />
                      </View>
                      <Text style={styles.milestoneProgressDate}>{ms.date}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.paymentsSection}>
            <View style={styles.paymentsHeader}>
              <MaterialCommunityIcons
                name="bank-transfer"
                size={20}
                color={Colors.secondary}
              />
              <Text style={styles.paymentsTitle}>Trusted Payments</Text>
            </View>
            <Text style={styles.paymentsDesc}>
              Funds are held in escrow and released only upon milestone verification.
            </Text>

            {TRANSACTIONS.map((tx, index) => (
              <View key={index} style={styles.txItem}>
                <View style={styles.txIcon}>
                  <MaterialCommunityIcons name={tx.icon} size={20} color={Colors.primary} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txName}>{tx.name}</Text>
                  <Text style={styles.txSubtitle}>{tx.subtitle}</Text>
                </View>
                <View style={styles.txAmount}>
                  <Text style={styles.txAmountText}>{tx.amount}</Text>
                  <View style={styles.txStatus}>
                    <Text style={styles.txStatusText}>Released</Text>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.sendPaymentButton} activeOpacity={0.8}>
              <MaterialCommunityIcons name="send" size={20} color={Colors.onPrimary} />
              <Text style={styles.sendPaymentText}>Send Progress Payment</Text>
            </TouchableOpacity>
          </View>
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
  backButton: {
    padding: 8,
    borderRadius: BorderRadius.full,
  },
  headerTitle: {
    fontSize: Typography.headlineMd.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.stackMd,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontWeight: '700',
    color: Colors.onPrimaryFixed,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroSection: {
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingTop: Spacing.stackLg,
  },
  heroImage: {
    height: 300,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.level2,
  },
  heroImageContent: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.stackLg,
    backgroundColor: 'rgba(0,67,54,0.6)',
  },
  heroBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroBadgeText: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSecondaryContainer,
  },
  heroTitle: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.onPrimary,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: Typography.bodySm.fontSize,
    fontFamily: 'Inter',
    color: Colors.onPrimary,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.gutter,
    marginTop: Spacing.gutter,
  },
  statsCard: {
    flex: 2,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest + '80',
    ...Shadow.level1,
  },
  statsCardLabel: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statsCardValue: {
    fontSize: Typography.displayLgMobile.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.stackMd,
  },
  statsBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: 8,
  },
  statsBarFill: {
    height: '100%',
    backgroundColor: Colors.secondaryContainer,
    borderRadius: BorderRadius.full,
  },
  statsBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsBarLeft: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  statsBarRight: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: Colors.secondary,
  },
  verifiedCard: {
    flex: 1,
    backgroundColor: Colors.primaryContainer,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl,
    ...Shadow.level1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.stackSm,
    marginBottom: 8,
  },
  verifiedTitle: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.onPrimary,
  },
  verifiedDesc: {
    fontSize: Typography.bodySm.fontSize,
    fontFamily: 'Inter',
    color: Colors.primaryFixedDim,
  },
  sectionRow: {
    flexDirection: 'column',
    gap: Spacing.gutter,
    paddingHorizontal: Spacing.containerPaddingMobile,
    marginTop: Spacing.gutter,
  },
  milestonesSection: {
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.stackLg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest + '80',
    ...Shadow.level1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.stackLg,
  },
  sectionTitle: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.primary,
  },
  viewDocsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDocsText: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.primary,
  },
  milestoneItem: {
    flexDirection: 'row',
    gap: Spacing.stackMd,
    position: 'relative',
    marginBottom: Spacing.stackLg,
  },
  milestoneLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: -8,
    width: 2,
    backgroundColor: Colors.outlineVariant,
  },
  milestoneDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    flexShrink: 0,
  },
  milestonePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.onSecondaryContainer,
  },
  milestoneContent: {
    flex: 1,
    paddingBottom: Spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '33',
  },
  milestoneTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  milestoneTitle: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.primary,
  },
  milestoneStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  milestoneStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  milestoneDesc: {
    fontSize: Typography.bodySm.fontSize,
    fontFamily: 'Inter',
    color: Colors.onSurfaceVariant,
  },
  milestoneProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.stackSm,
    marginTop: 8,
  },
  milestoneProgressBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    backgroundColor: Colors.secondaryContainer,
    borderRadius: BorderRadius.full,
  },
  milestoneProgressDate: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  paymentsSection: {
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.stackLg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest + '80',
    ...Shadow.level1,
  },
  paymentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  paymentsTitle: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.primary,
  },
  paymentsDesc: {
    fontSize: Typography.bodySm.fontSize,
    fontFamily: 'Inter',
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.stackLg,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.stackSm,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    flex: 1,
    marginLeft: Spacing.stackMd,
  },
  txName: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.onSurface,
  },
  txSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: Colors.outline,
  },
  txAmount: {
    alignItems: 'flex-end',
  },
  txAmountText: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.primary,
  },
  txStatus: {
    backgroundColor: Colors.primaryFixed + '4D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  txStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  sendPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.stackMd,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.gutter,
    ...Shadow.level1,
  },
  sendPaymentText: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.onPrimary,
  },
});
