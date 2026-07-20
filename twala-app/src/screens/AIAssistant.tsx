import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';

const SUGGESTED_REPLIES = ['Yes, show me breakdown', 'Check exchange rate', 'Update goal target'];
const QUICK_ACTIONS = [
  { icon: 'send' as const, label: 'Send Money' },
  { icon: 'piggy-bank' as const, label: 'Savings' },
  { icon: 'home' as const, label: 'Building' },
  { icon: 'school' as const, label: 'School Fees' },
];

function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={typingStyles.container}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            typingStyles.dot,
            { opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
          ]}
        />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.onSurfaceVariant + '99' },
});

export default function AIAssistant() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!message.trim()) return;
    setIsTyping(true);
    setMessage('');
    setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxWM82cYZtvfTL2ZJPksQNsPwop0gt7O134YPbsH5D3ifP60vCxcKcOGG-6GP0HAdOngLIpctH77a-OjANA759yWasxzK9NwIo7oBow4fkDt3UZl2F8f55Rk4UqScqoZux6Hui0uQKkwN9e4MeBkEMsvkl0MifBXkDm-g5XiYw0HV3Rb3rPFKTaZfCUzvgHqjVIYQ3gLkolU2-hpjz3mpPiHWkLicepVUEmcwfSdnNoSS-1G9HizjT' }}
              style={styles.avatarImage}
            />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Kanzu</Text>
            <Text style={styles.headerSub}>
              {isTyping ? 'Typing...' : 'Online • AI Companion'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifButton}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.dateMarker}>
          <MaterialCommunityIcons name="calendar-today" size={12} color={Colors.onSurfaceVariant} />
          <Text style={styles.dateText}>Today</Text>
        </View>

        <View style={styles.quickActionRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity key={action.label} style={styles.quickActionChip} activeOpacity={0.7}>
              <MaterialCommunityIcons name={action.icon} size={18} color={Colors.primary} />
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.userMessage}>
          <Text style={styles.userMessageText}>
            How am I doing with my house project savings for Wakiso?
          </Text>
          <Text style={styles.messageTime}>10:42 AM</Text>
        </View>

        <View style={styles.aiRow}>
          <View style={styles.aiAvatarSmall}>
            <MaterialCommunityIcons name="robot" size={18} color={Colors.onSecondaryContainer} />
          </View>
          <View style={styles.aiBlock}>
            <View style={styles.aiMessage}>
              <Text style={styles.aiMessageText}>
                I see you're planning to build a three-bedroom house in Wakiso. Based on your current savings, we can reach the roofing milestone by October. Would you like to see a breakdown?
              </Text>
              <Text style={styles.messageTime}>10:42 AM</Text>
            </View>

            <View style={styles.dataCard}>
              <View style={styles.dataCardDecor}>
                <MaterialCommunityIcons name="home-roof" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.dataLabel}>TARGET DATE</Text>
              <View style={styles.dataValueRow}>
                <Text style={styles.dataValue}>October 2024</Text>
                <View style={styles.dataBadge}>
                  <MaterialCommunityIcons name="check-circle" size={12} color={Colors.onSecondaryContainer} />
                  <Text style={styles.dataBadgeText}>On Track</Text>
                </View>
              </View>
              <View style={styles.dataBarBg}>
                <View style={[styles.dataBarFill, { width: '65%' }]} />
              </View>
              <View style={styles.dataBarLabels}>
                <Text style={styles.dataBarLabelLeft}>65% funded</Text>
                <Text style={styles.dataBarLabelRight}>UGX 97.5M / 150M</Text>
              </View>
            </View>

            <View style={styles.suggestedRow}>
              {SUGGESTED_REPLIES.map((reply) => (
                <TouchableOpacity key={reply} style={styles.suggestedChip} activeOpacity={0.7}>
                  <Text style={styles.chipText}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {isTyping && (
          <View style={styles.aiRow}>
            <View style={styles.aiAvatarSmall}>
              <MaterialCommunityIcons name="robot" size={18} color={Colors.onSecondaryContainer} />
            </View>
            <View style={styles.typingBubble}>
              <TypingDots />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.inputIcon}>
            <MaterialCommunityIcons name="plus" size={24} color={Colors.primaryContainer} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Message Twala..."
            placeholderTextColor={Colors.outline}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity style={styles.inputIcon}>
            <MaterialCommunityIcons name="microphone" size={24} color={Colors.primaryContainer} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]} onPress={handleSend} disabled={!message.trim()}>
            <MaterialCommunityIcons name="arrow-up" size={24} color={message.trim() ? Colors.onPrimary : Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>
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
  avatar: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', borderWidth: 2, borderColor: Colors.primaryFixed, position: 'relative' },
  avatarImage: { width: '100%', height: '100%' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.surface },
  headerTitle: { fontSize: Typography.headlineMd.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  headerSub: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },
  notifButton: { padding: 8, borderRadius: BorderRadius.full },
  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: Spacing.containerPaddingMobile, paddingBottom: 20 },
  dateMarker: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceContainerHighest + '80', paddingHorizontal: 16, paddingVertical: 6, borderRadius: BorderRadius.full, marginVertical: Spacing.gutter },
  dateText: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },
  quickActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.gutter },
  quickActionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.outlineVariant + '4D', ...Shadow.level1 },
  quickActionLabel: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.primary },
  userMessage: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: Colors.primary, padding: Spacing.stackMd, borderRadius: 20, borderTopRightRadius: 4, ...Shadow.level1, marginBottom: Spacing.gutter },
  userMessageText: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onPrimary },
  messageTime: { fontSize: 10, color: Colors.onPrimary, opacity: 0.7, textAlign: 'right', marginTop: 4 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  aiAvatarSmall: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.secondaryContainer, justifyContent: 'center', alignItems: 'center' },
  aiBlock: { flex: 1, gap: 8 },
  aiMessage: { backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.stackMd, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.outlineVariant + '1A', ...Shadow.level1 },
  aiMessageText: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onSurface, lineHeight: 24 },
  dataCard: {
    backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.stackMd, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant + '33', ...Shadow.level1, overflow: 'hidden', position: 'relative',
  },
  dataCardDecor: { position: 'absolute', top: 12, right: 12, opacity: 0.08 },
  dataLabel: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant, letterSpacing: 1, textTransform: 'uppercase' },
  dataValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dataValue: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  dataBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondaryContainer, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  dataBadgeText: { fontSize: 11, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSecondaryContainer },
  dataBarBg: { width: '100%', height: 8, backgroundColor: Colors.surfaceContainerHighest, borderRadius: BorderRadius.full, marginTop: Spacing.stackMd, overflow: 'hidden' },
  dataBarFill: { height: '100%', backgroundColor: Colors.secondaryContainer, borderRadius: BorderRadius.full },
  dataBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  dataBarLabelLeft: { fontSize: 11, fontFamily: 'Inter', color: Colors.onSurfaceVariant },
  dataBarLabelRight: { fontSize: 11, fontFamily: 'Inter', color: Colors.outline },
  suggestedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestedChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primaryFixedDim + '4D', ...Shadow.level1 },
  chipText: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.primary },
  typingBubble: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.outlineVariant + '1A', paddingHorizontal: 16, ...Shadow.level1 },
  inputArea: { paddingHorizontal: Spacing.containerPaddingMobile, paddingVertical: Spacing.stackSm, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.outlineVariant + '4D' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: Colors.surfaceContainerLowest, padding: 8, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant + '4D', ...Shadow.level2 },
  inputIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: BorderRadius.lg },
  input: { flex: 1, fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onSurface, paddingVertical: 8, paddingHorizontal: 4, maxHeight: 100 },
  sendButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, ...Shadow.level1 },
  sendButtonDisabled: { backgroundColor: Colors.surfaceContainerHigh },
});
