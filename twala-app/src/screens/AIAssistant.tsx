import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Animated, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { chatApi, isBackendOnline, notifyChange, type ChatMsg, type NavigateAction } from '../services/api';

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

// Parse simple markdown: ## heading, **bold**, newlines
function renderRichText(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      nodes.push(<View key={`sp-${idx}`} style={{ height: 8 }} />);
      return;
    }

    if (trimmed.startsWith('## ')) {
      nodes.push(
        <Text key={idx} style={richStyles.heading}>
          {trimmed.replace('## ', '')}
        </Text>
      );
      return;
    }

    // Split line into segments: **bold** and plain text
    const segments: { bold: boolean; text: string }[] = [];
    let remaining = trimmed;
    let segIdx = 0;
    while (remaining.length > 0 && segIdx < 20) {
      segIdx++;
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) segments.push({ bold: false, text: remaining.substring(0, boldMatch.index) });
        segments.push({ bold: true, text: boldMatch[1] });
        remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      } else {
        segments.push({ bold: false, text: remaining });
        remaining = '';
      }
    }

    // Check for emoji/list prefix
    const hasEmojiPrefix = /^[✅⚠️❌🎯🎉💸💰🏠📋💱📅⏰●→←]\s/.test(trimmed) || /^[•·]/.test(trimmed);

    nodes.push(
      <Text key={idx} style={[richStyles.line, hasEmojiPrefix && { flexDirection: 'row' as any }]}>
        {segments.map((seg, si) => (
          <Text key={si} style={seg.bold ? richStyles.bold : richStyles.normal}>
            {seg.text}
          </Text>
        ))}
      </Text>
    );
  });

  return nodes;
}

const richStyles = StyleSheet.create({
  heading: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
    marginTop: 4,
  },
  line: {
    fontSize: Typography.bodyMd.fontSize,
    fontFamily: 'Inter',
    color: Colors.onSurface,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    fontFamily: 'Inter',
    color: Colors.primary,
  },
  normal: {
    fontWeight: '400',
    fontFamily: 'Inter',
    color: Colors.onSurface,
  },
});

interface Props {
  onNavigate?: (screen: string) => void;
  onNavigateGoal?: (id: string) => void;
}

export type { Props as AIAssistantProps };

export default function AIAssistant({ onNavigate, onNavigateGoal }: Props) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    setLocalMode(!isBackendOnline());
    const [chatRes, sugRes] = await Promise.all([chatApi.list(), chatApi.suggestions()]);
    if (chatRes.success && chatRes.data) setMessages(chatRes.data);
    if (sugRes.success && sugRes.data) setSuggestions(sugRes.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setMessage('');
    setIsTyping(true);
    setError(null);
    setLocalMode(!isBackendOnline());

    // Optimistically add user message locally
    const optimisticMsg: ChatMsg = { role: 'user', content: userMsg, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, optimisticMsg]);

    const [chatRes, sugRes] = await Promise.all([chatApi.send(userMsg), chatApi.suggestions()]);
    if (chatRes.success && chatRes.data) {
      const { messages: msgs, navigate } = chatRes.data as any;
      if (Array.isArray(msgs) && msgs.length > 0) {
        setMessages(msgs);
        notifyChange();
      }
      if (navigate) {
        const nav = navigate as NavigateAction;
        if (nav.screen === 'GoalDetail' && nav.goalId && onNavigateGoal) {
          onNavigateGoal(nav.goalId);
        } else if (onNavigate) {
          onNavigate(nav.screen);
        }
      }
    } else {
      setError(chatRes.message || 'Failed to send message. Please try again.');
    }
    if (sugRes.success && sugRes.data) setSuggestions(sugRes.data);
    setIsTyping(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarPlaceholder}>
            <MaterialCommunityIcons name="robot" size={24} color={Colors.onPrimary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Kanzu</Text>
            <Text style={styles.headerSub}>
              {isTyping ? 'Thinking...' : isBackendOnline() ? 'Online • AI Financial Companion' : 'Disconnected'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifButton}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              <View style={styles.dateMarker}>
                <MaterialCommunityIcons name="calendar-today" size={12} color={Colors.onSurfaceVariant} />
                <Text style={styles.dateText}>Today</Text>
              </View>

              {error && (
                <View style={styles.errorBanner}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.onError} />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={() => setError(null)}>
                    <MaterialCommunityIcons name="close" size={16} color={Colors.onError} />
                  </TouchableOpacity>
                </View>
              )}

              {messages.length <= 1 && (
                <View style={styles.quickActionRow}>
                  <TouchableOpacity style={styles.quickActionChip} activeOpacity={0.7} onPress={() => sendMessage('Send money to Uganda')}>
                    <MaterialCommunityIcons name="send" size={18} color={Colors.primary} />
                    <Text style={styles.quickActionLabel}>Send Money</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickActionChip} activeOpacity={0.7} onPress={() => sendMessage('Check my goal progress')}>
                    <MaterialCommunityIcons name="piggy-bank" size={18} color={Colors.primary} />
                    <Text style={styles.quickActionLabel}>Savings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickActionChip} activeOpacity={0.7} onPress={() => sendMessage('How much do I have?')}>
                    <MaterialCommunityIcons name="wallet" size={18} color={Colors.primary} />
                    <Text style={styles.quickActionLabel}>Balance</Text>
                  </TouchableOpacity>
                </View>
              )}

              {messages.map((msg, i) => (
                msg.role === 'user' ? (
                  <View key={i} style={styles.userMessage}>
                    <Text style={styles.userMessageText}>{msg.content}</Text>
                    <Text style={styles.messageTime}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ) : (
                  <View key={i} style={styles.aiRow}>
                    <View style={styles.aiAvatarSmall}>
                      <MaterialCommunityIcons name="robot" size={18} color={Colors.onSecondaryContainer} />
                    </View>
                    <View style={styles.aiBlock}>
                      <View style={styles.aiMessage}>
                        {renderRichText(msg.content)}
                        <Text style={styles.messageTime}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      {i === messages.length - 1 && msg.role === 'assistant' && suggestions.length > 0 && (
                        <View style={styles.suggestedRow}>
                          {suggestions.slice(0, 4).map((reply) => (
                            <TouchableOpacity key={reply} style={styles.suggestedChip} activeOpacity={0.7} onPress={() => sendMessage(reply)}>
                              <Text style={styles.chipText}>{reply.length > 35 ? reply.substring(0, 32) + '...' : reply}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )
              ))}

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
            </>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask Kanzu anything..."
              placeholderTextColor={Colors.outline}
              value={message}
              onChangeText={setMessage}
              multiline
              onSubmitEditing={() => sendMessage(message)}
              blurOnSubmit
            />
            <TouchableOpacity
              style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
              onPress={() => sendMessage(message)}
              disabled={!message.trim()}
            >
              <MaterialCommunityIcons
                name="arrow-up"
                size={24}
                color={message.trim() ? Colors.onPrimary : Colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
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
  suggestedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestedChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primaryFixedDim + '4D', ...Shadow.level1 },
  chipText: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.primary },
  typingBubble: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.outlineVariant + '1A', paddingHorizontal: 16, ...Shadow.level1 },
  inputArea: { paddingHorizontal: Spacing.containerPaddingMobile, paddingVertical: Spacing.stackSm, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.outlineVariant + '4D' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: Colors.surfaceContainerLowest, padding: 8, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant + '4D', ...Shadow.level2 },
  input: { flex: 1, fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onSurface, paddingVertical: 8, paddingHorizontal: 4, maxHeight: 100 },
  sendButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, ...Shadow.level1 },
  sendButtonDisabled: { backgroundColor: Colors.surfaceContainerHigh },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.errorContainer,
    padding: Spacing.stackMd, borderRadius: BorderRadius.lg, marginBottom: Spacing.gutter,
  },
  errorText: { flex: 1, fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onError },
});