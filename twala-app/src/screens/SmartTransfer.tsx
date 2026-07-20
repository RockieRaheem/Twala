import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';

const PURPOSES = [
  { label: 'Family Support', value: 'family' },
  { label: 'Construction Milestone', value: 'construction' },
  { label: 'Savings', value: 'savings' },
  { label: 'School Fees', value: 'education' },
  { label: 'Business Investment', value: 'business' },
];

export default function SmartTransfer() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Smart Transfer</Text>
        </View>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.primary} />
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>JD</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.transferCard}>
          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>You send</Text>
              <View style={styles.fieldInputRow}>
                <Text style={styles.fieldInputText}>$500</Text>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>USD</Text>
                </View>
              </View>
            </View>

            <View style={styles.swapButton}>
              <MaterialCommunityIcons name="swap-vertical" size={20} color={Colors.onSecondaryContainer} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>They receive</Text>
              <View style={styles.fieldInputRowReceive}>
                <Text style={styles.fieldInputTextReceive}>1,875,000</Text>
                <View style={styles.currencyBadgeReceive}>
                  <Text style={styles.currencyBadgeTextReceive}>UGX</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="bank-transfer" size={18} color={Colors.primary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Fee</Text>
                <Text style={styles.detailValue}>$1.50</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="lightning-bolt" size={18} color={Colors.secondary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Arrival</Text>
                <Text style={styles.detailValue}>&lt; 5 seconds</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.stellarSection}>
          <Text style={styles.stellarTitle}>Stellar Path Delivery</Text>
          <View style={styles.stellarCard}>
            <View style={styles.stellarPath}>
              <View style={styles.stellarNode}>
                <View style={styles.stellarNodeIcon}>
                  <MaterialCommunityIcons name="bank" size={20} color={Colors.onPrimary} />
                </View>
                <Text style={styles.stellarNodeLabel}>Bank</Text>
              </View>

              <View style={styles.stellarConnector}>
                <View style={styles.stellarConnectorLine} />
              </View>

              <View style={styles.stellarNode}>
                <View style={styles.stellarNodeIconHighlighted}>
                  <MaterialCommunityIcons name="circle-multiple" size={20} color={Colors.onSecondaryContainer} />
                </View>
                <Text style={styles.stellarNodeLabelLight}>USDC</Text>
              </View>

              <View style={styles.stellarConnector}>
                <View style={styles.stellarConnectorLine} />
              </View>

              <View style={styles.stellarNode}>
                <View style={styles.stellarNodeIcon}>
                  <MaterialCommunityIcons name="lan" size={20} color={Colors.onPrimary} />
                </View>
                <Text style={styles.stellarNodeLabel}>Kotani</Text>
              </View>

              <View style={styles.stellarConnector}>
                <View style={styles.stellarConnectorLine} />
              </View>

              <View style={styles.stellarNode}>
                <View style={styles.stellarNodeIconWhite}>
                  <MaterialCommunityIcons name="cellphone" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.stellarNodeLabel}>M-Money</Text>
              </View>
            </View>
            <Text style={styles.stellarFooter}>
              Ironclad security powered by blockchain rails.
            </Text>
          </View>
        </View>

        <View style={styles.purposeSection}>
          <Text style={styles.fieldLabel}>Select Purpose</Text>
          <View style={styles.picker}>
            <Text style={styles.pickerText}>Construction Milestone</Text>
            <MaterialCommunityIcons name="chevron-down" size={24} color={Colors.outline} />
          </View>
        </View>

        <TouchableOpacity style={styles.reviewButton} activeOpacity={0.8}>
          <Text style={styles.reviewButtonText}>Review Transfer</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.onPrimary} />
        </TouchableOpacity>

        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information" size={24} color={Colors.secondary} />
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Did you know?</Text>
            <Text style={styles.infoBannerDesc}>
              Transfers to{' '}
              <Text style={styles.infoBannerBold}>Construction Milestone</Text> automatically generate
              a digital receipt shareable with your project manager in Kampala.
            </Text>
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
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingTop: Spacing.gutter,
    paddingBottom: 100,
    gap: Spacing.stackLg,
  },
  transferCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest + '80',
    ...Shadow.level1,
  },
  fieldGroup: {
    gap: Spacing.stackMd,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: Typography.labelMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  fieldInputText: {
    fontSize: Typography.headlineMd.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.primary,
  },
  currencyBadge: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  currencyBadgeText: {
    fontWeight: '700',
    color: Colors.primary,
  },
  swapButton: {
    alignSelf: 'center',
    backgroundColor: Colors.secondaryContainer,
    padding: 8,
    borderRadius: BorderRadius.full,
    marginVertical: -16,
    zIndex: 1,
  },
  fieldInputRowReceive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  fieldInputTextReceive: {
    fontSize: Typography.headlineMd.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.secondary,
  },
  currencyBadgeReceive: {
    backgroundColor: Colors.secondaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  currencyBadgeTextReceive: {
    fontWeight: '700',
    color: Colors.secondary,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: Spacing.stackMd,
    marginTop: Spacing.gutter,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.stackSm,
    backgroundColor: Colors.primary + '0D',
    padding: Spacing.stackSm + 4,
    borderRadius: BorderRadius.md,
  },
  detailInfo: {},
  detailLabel: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: Colors.primary,
  },
  stellarSection: {
    gap: Spacing.stackMd,
  },
  stellarTitle: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.primary,
  },
  stellarCard: {
    backgroundColor: Colors.primary,
    padding: Spacing.gutter,
    borderRadius: BorderRadius.xl * 1.5,
    overflow: 'hidden',
    ...Shadow.level2,
  },
  stellarPath: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stellarNode: {
    alignItems: 'center',
    gap: 8,
  },
  stellarNodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  stellarNodeIconHighlighted: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    ...{
      shadowColor: Colors.secondaryContainer,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 15,
      elevation: 6,
    },
  },
  stellarNodeIconWhite: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stellarNodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stellarNodeLabelLight: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondaryFixed,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stellarConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },
  stellarConnectorLine: {
    height: '100%',
    backgroundColor: Colors.secondaryContainer,
    opacity: 0.5,
  },
  stellarFooter: {
    marginTop: Spacing.gutter,
    textAlign: 'center',
    fontSize: Typography.bodySm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.primaryFixed,
  },
  purposeSection: {
    gap: 8,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.stackMd,
    paddingVertical: Spacing.stackMd,
  },
  pickerText: {
    fontSize: Typography.bodyMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurface,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.stackSm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.stackMd + 4,
    borderRadius: BorderRadius.xl,
    ...Shadow.level2,
  },
  reviewButtonText: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.onPrimary,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: Spacing.stackMd,
    padding: Spacing.stackMd,
    backgroundColor: Colors.secondaryContainer + '1A',
    borderWidth: 1,
    borderColor: Colors.secondaryContainer + '33',
    borderRadius: BorderRadius.xl,
  },
  infoBannerContent: {
    flex: 1,
    gap: 4,
  },
  infoBannerTitle: {
    fontSize: Typography.bodyMd.fontSize,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: Colors.onSecondaryContainer,
  },
  infoBannerDesc: {
    fontSize: Typography.bodySm.fontSize,
    fontFamily: 'Inter',
    color: Colors.onSecondaryContainer,
    opacity: 0.8,
    lineHeight: 20,
  },
  infoBannerBold: {
    fontWeight: '700',
  },
});
