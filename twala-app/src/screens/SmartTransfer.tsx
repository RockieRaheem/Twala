import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useEffect, useState } from 'react';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';

const PURPOSES = [
  { label: 'Family Support', value: 'family', icon: 'face-woman-profile' as const, desc: 'Send to parents or spouse' },
  { label: 'Construction Milestone', value: 'construction', icon: 'hard-hat' as const, desc: 'Release payment to contractor' },
  { label: 'Savings', value: 'savings', icon: 'piggy-bank' as const, desc: 'Deposit to your Twala Vault' },
  { label: 'School Fees', value: 'education', icon: 'school' as const, desc: 'Pay tuition directly' },
  { label: 'Business Investment', value: 'business', icon: 'briefcase' as const, desc: 'Invoice or partnership payment' },
];

const PATH_NODES = [
  { label: 'Your Bank', icon: 'bank' as const, color: 'rgba(255,255,255,0.2)' },
  { label: 'USDC', icon: 'circle-multiple' as const, color: Colors.secondaryContainer },
  { label: 'Kotani', icon: 'lan' as const, color: 'rgba(255,255,255,0.2)' },
  { label: 'M-Money', icon: 'cellphone' as const, color: Colors.surfaceContainerLowest },
];

function StellarPath() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={stellarStyles.card}>
      <View style={stellarStyles.decorBg} />
      <View style={stellarStyles.pathRow}>
        {PATH_NODES.map((node, i) => (
          <View key={node.label}>
            <View style={stellarStyles.nodeCol}>
              <View style={[stellarStyles.nodeIcon, { backgroundColor: node.color }]}>
                <MaterialCommunityIcons name={node.icon} size={22} color={node.label === 'USDC' ? Colors.onSecondaryContainer : Colors.onPrimary} />
              </View>
              <Text style={[stellarStyles.nodeLabel, node.label === 'USDC' && { color: Colors.secondaryFixed }]}>{node.label}</Text>
            </View>
            {i < PATH_NODES.length - 1 && (
              <View style={stellarStyles.connectorWrap}>
                <View style={stellarStyles.connectorBase}>
                  <Animated.View style={[stellarStyles.connectorPulse, { opacity: pulseAnim }]} />
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
      <View style={stellarStyles.connectorRow}>
        {PATH_NODES.slice(0, -1).map((_, i) => (
          <View key={i} style={stellarStyles.connectorH}>
            <Animated.View style={[stellarStyles.connectorHFill, { opacity: pulseAnim }]} />
          </View>
        ))}
      </View>
      <Text style={stellarStyles.footer}>Ironclad security powered by Stellar blockchain rails.</Text>
    </View>
  );
}

const stellarStyles = StyleSheet.create({
  card: { backgroundColor: Colors.primary, padding: Spacing.gutter, borderRadius: BorderRadius.xl * 1.5, overflow: 'hidden', ...Shadow.level2 },
  decorBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.08 },
  pathRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nodeCol: { alignItems: 'center', gap: 8, zIndex: 2 },
  nodeIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  nodeLabel: { fontSize: 10, fontWeight: '700', color: Colors.onPrimary, letterSpacing: 0.5, textTransform: 'uppercase' },
  connectorWrap: { position: 'absolute', top: 22, left: 52, right: -20, height: 4, zIndex: 0 },
  connectorBase: { height: 2, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1, overflow: 'hidden' },
  connectorPulse: { height: '100%', backgroundColor: Colors.secondaryContainer, borderRadius: 1 },
  connectorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, marginTop: -12, marginBottom: 8 },
  connectorH: { height: 2, flex: 1, marginHorizontal: -8, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', borderRadius: 1 },
  connectorHFill: { height: '100%', backgroundColor: Colors.secondaryContainer, borderRadius: 1 },
  footer: { marginTop: Spacing.gutter, textAlign: 'center', fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.primaryFixed },
});

export default function SmartTransfer() {
  const [selectedPurpose, setSelectedPurpose] = useState(PURPOSES[1]);
  const [showPicker, setShowPicker] = useState(false);
  const [amount, setAmount] = useState('500');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const usdAmount = parseFloat(amount) || 0;
  const ugxAmount = usdAmount * 3750;
  const fee = 1.5;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.03, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [amount]);

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.transferCard}>
          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>You send</Text>
              <View style={styles.fieldInputRow}>
                <View style={styles.currencyBadgeLeft}>
                  <MaterialCommunityIcons name="currency-usd" size={18} color={Colors.primary} />
                  <Text style={styles.currencyBadgeText}>USD</Text>
                </View>
                <TextInput
                  style={styles.fieldInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.outline}
                />
              </View>
            </View>

            <View style={styles.swapButton}>
              <MaterialCommunityIcons name="arrow-down" size={20} color={Colors.onSecondaryContainer} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>They receive</Text>
              <View style={[styles.fieldInputRow, { backgroundColor: Colors.secondaryFixed + '33' }]}>
                <View style={[styles.currencyBadgeLeft, { backgroundColor: Colors.secondaryFixed }]}>
                  <MaterialCommunityIcons name="currency-usd" size={18} color={Colors.secondary} />
                  <Text style={[styles.currencyBadgeText, { color: Colors.secondary }]}>UGX</Text>
                </View>
                <Animated.Text style={[styles.fieldInputResult, { transform: [{ scale: scaleAnim }] }]}>
                  {ugxAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </Animated.Text>
              </View>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="bank-transfer" size={18} color={Colors.primary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Fee</Text>
                <Text style={styles.detailValue}>${fee.toFixed(2)}</Text>
              </View>
            </View>
            <View style={[styles.detailItem, { backgroundColor: Colors.secondary + '0D' }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={18} color={Colors.secondary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Arrival</Text>
                <Text style={[styles.detailValue, { color: Colors.secondary }]}>~5 seconds</Text>
              </View>
            </View>
            <View style={[styles.detailItem, { backgroundColor: Colors.tertiary + '0D' }]}>
              <MaterialCommunityIcons name="swap-horizontal-bold" size={18} color={Colors.tertiary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Rate</Text>
                <Text style={[styles.detailValue, { color: Colors.tertiary }]}>3,750</Text>
              </View>
            </View>
          </View>
        </View>

        <StellarPath />

        <View style={styles.purposeSection}>
          <Text style={styles.sectionLabel}>Select Purpose</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(!showPicker)}>
            <View style={styles.pickerLeft}>
              <View style={styles.pickerIcon}>
                <MaterialCommunityIcons name={selectedPurpose.icon} size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.pickerLabel}>{selectedPurpose.label}</Text>
                <Text style={styles.pickerDesc}>{selectedPurpose.desc}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name={showPicker ? 'chevron-up' : 'chevron-down'} size={24} color={Colors.outline} />
          </TouchableOpacity>
          {showPicker && (
            <View style={styles.pickerDropdown}>
              {PURPOSES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.pickerOption, selectedPurpose.value === p.value && styles.pickerOptionActive]}
                  onPress={() => { setSelectedPurpose(p); setShowPicker(false); }}
                >
                  <View style={[styles.pickerOptionIcon, selectedPurpose.value === p.value && { backgroundColor: Colors.primaryFixed }]}>
                    <MaterialCommunityIcons name={p.icon} size={20} color={selectedPurpose.value === p.value ? Colors.primary : Colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.pickerOptionText}>
                    <Text style={[styles.pickerOptionLabel, selectedPurpose.value === p.value && { color: Colors.primary }]}>{p.label}</Text>
                    <Text style={styles.pickerOptionDesc}>{p.desc}</Text>
                  </View>
                  {selectedPurpose.value === p.value && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.reviewButton} activeOpacity={0.8}>
          <View style={styles.reviewButtonContent}>
            <Text style={styles.reviewButtonText}>Review Transfer</Text>
            <Text style={styles.reviewButtonSub}>
              ${usdAmount.toFixed(2)} → {ugxAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} UGX
            </Text>
          </View>
          <View style={styles.reviewArrow}>
            <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.onPrimary} />
          </View>
        </TouchableOpacity>

        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="lightbulb-outline" size={24} color={Colors.secondary} />
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Smart Feature</Text>
            <Text style={styles.infoBannerDesc}>
              Transfers to <Text style={styles.infoBannerBold}>{selectedPurpose.label}</Text> automatically generate a digital receipt shareable with your recipient.
            </Text>
          </View>
        </View>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackMd },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryFixed, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { fontWeight: '700', color: Colors.onPrimaryFixed },
  scrollContent: { paddingHorizontal: Spacing.containerPaddingMobile, paddingTop: Spacing.gutter, paddingBottom: 100, gap: Spacing.stackLg },
  transferCard: { backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.stackMd, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.surfaceContainerHighest + '80', ...Shadow.level1 },
  fieldGroup: { gap: Spacing.stackSm },
  field: { gap: 8 },
  fieldLabel: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurfaceVariant },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: Spacing.stackMd, paddingVertical: 4, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.outlineVariant + '4D' },
  currencyBadgeLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primaryFixed, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md },
  currencyBadgeText: { fontWeight: '700', color: Colors.primary },
  fieldInput: { flex: 1, fontSize: Typography.headlineMd.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary, textAlign: 'right', paddingVertical: 12 },
  fieldInputResult: { fontSize: Typography.headlineMd.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.secondary, textAlign: 'right', paddingVertical: 12 },
  swapButton: { alignSelf: 'center', backgroundColor: Colors.secondaryContainer, padding: 10, borderRadius: BorderRadius.full, marginVertical: -14, zIndex: 1, borderWidth: 3, borderColor: Colors.surfaceContainerLowest },
  detailsRow: { flexDirection: 'row', gap: Spacing.stackSm, marginTop: Spacing.gutter },
  detailItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary + '0D', padding: 10, borderRadius: BorderRadius.md },
  detailInfo: {},
  detailLabel: { fontSize: 9, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant, letterSpacing: 0.3, textTransform: 'uppercase' },
  detailValue: { fontSize: 12, fontFamily: 'Inter', fontWeight: '700', color: Colors.primary },
  purposeSection: { gap: 8 },
  sectionLabel: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurfaceVariant },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceContainerLowest, borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: BorderRadius.xl, padding: Spacing.stackMd },
  pickerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm },
  pickerIcon: { width: 40, height: 40, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
  pickerLabel: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurface },
  pickerDesc: { fontSize: 11, fontFamily: 'Inter', color: Colors.onSurfaceVariant, marginTop: 1 },
  pickerDropdown: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, ...Shadow.level2, overflow: 'hidden' },
  pickerOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm, padding: Spacing.stackMd, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant + '33' },
  pickerOptionActive: { backgroundColor: Colors.primary + '08' },
  pickerOptionIcon: { width: 40, height: 40, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
  pickerOptionText: { flex: 1 },
  pickerOptionLabel: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurface },
  pickerOptionDesc: { fontSize: 11, fontFamily: 'Inter', color: Colors.onSurfaceVariant },
  reviewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, padding: Spacing.stackMd, borderRadius: BorderRadius.xl, ...Shadow.level2 },
  reviewButtonContent: {},
  reviewButtonText: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.onPrimary },
  reviewButtonSub: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onPrimary, opacity: 0.8, marginTop: 2 },
  reviewArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  infoBanner: { flexDirection: 'row', gap: Spacing.stackMd, padding: Spacing.stackMd, backgroundColor: Colors.secondaryContainer + '1A', borderWidth: 1, borderColor: Colors.secondaryContainer + '33', borderRadius: BorderRadius.xl },
  infoBannerContent: { flex: 1, gap: 4 },
  infoBannerTitle: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', fontWeight: '700', color: Colors.onSecondaryContainer },
  infoBannerDesc: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onSecondaryContainer, opacity: 0.8, lineHeight: 20 },
  infoBannerBold: { fontWeight: '700' },
});
