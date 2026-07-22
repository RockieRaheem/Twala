import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Animated, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl, Keyboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { chatApi, isBackendOnline, notifyChange, type ChatMsg, type NavigateAction } from '../services/api';
import DismissKeyboard from '../components/DismissKeyboard';

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

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
          style={[typingStyles.dot, { opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]}
        />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary + '99' },
});

// ---------------------------------------------------------------------------
// Professional markdown renderer
// ---------------------------------------------------------------------------

interface InlineSegment {
  t: 'text' | 'bold' | 'code';
  v: string;
}

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let remaining = text;
  let guard = 0;
  while (remaining.length > 0 && guard < 30) {
    guard++;
    // bold **text**
    const b = remaining.match(/\*\*(.+?)\*\*/);
    // inline code `text`
    const c = remaining.match(/`([^`]+)`/);
    // pick whichever comes first
    let first: RegExpMatchArray | null = null;
    let type: 'bold' | 'code' = 'bold';
    if (b && c) {
      if (b.index! <= c.index!) { first = b; type = 'bold'; } else { first = c; type = 'code'; }
    } else if (b) { first = b; type = 'bold'; } else if (c) { first = c; type = 'code'; }

    if (first && first.index !== undefined) {
      if (first.index > 0) segments.push({ t: 'text', v: remaining.substring(0, first.index) });
      segments.push({ t: type, v: first[1] });
      remaining = remaining.substring(first.index + first[0].length);
    } else {
      segments.push({ t: 'text', v: remaining });
      remaining = '';
    }
  }
  return segments;
}

function renderInline(segments: InlineSegment[], baseStyle: any, boldStyle: any, codeStyle: any): React.ReactNode[] {
  return segments.map((s, i) => {
    if (s.t === 'bold') return <Text key={i} style={boldStyle}>{s.v}</Text>;
    if (s.t === 'code') return <Text key={i} style={codeStyle}>{s.v}</Text>;
    return <Text key={i} style={baseStyle}>{s.v}</Text>;
  });
}

function renderRichText(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeKey = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    const trimmed = raw.trim();

    // Code block fence
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        nodes.push(
          <View key={`cb-${codeKey++}`} style={richStyles.codeBlock}>
            <Text style={richStyles.codeText}>{codeBuffer.join('\n')}</Text>
          </View>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeBuffer.push(raw); continue; }

    if (!trimmed) { nodes.push(<View key={`sp-${idx}`} style={{ height: 6 }} />); continue; }

    // --- Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      nodes.push(<View key={`hr-${idx}`} style={richStyles.hr} />);
      continue;
    }

    // --- Heading
    const hm = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      const level = hm[1].length;
      nodes.push(
        <Text key={`h-${idx}`} style={level === 1 ? richStyles.h1 : level === 2 ? richStyles.h2 : richStyles.h3}>
          {renderInline(parseInline(hm[2]), level === 1 ? richStyles.h1 : level === 2 ? richStyles.h2 : richStyles.h3, richStyles.boldInline, richStyles.codeInline)}
        </Text>
      );
      continue;
    }

    // --- Blockquote
    if (trimmed.startsWith('> ')) {
      nodes.push(
        <View key={`bq-${idx}`} style={richStyles.blockquote}>
          <Text style={richStyles.blockquoteText}>
            {renderInline(parseInline(trimmed.replace(/^>\s?/, '')), richStyles.blockquoteText, richStyles.boldInline, richStyles.codeInline)}
          </Text>
        </View>
      );
      continue;
    }

    // --- Unordered list
    const ulMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      nodes.push(
        <View key={`ul-${idx}`} style={richStyles.listRow}>
          <Text style={richStyles.bullet}>•</Text>
          <Text style={richStyles.listText}>
            {renderInline(parseInline(ulMatch[1]), richStyles.listText, richStyles.boldInline, richStyles.codeInline)}
          </Text>
        </View>
      );
      continue;
    }

    // --- Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      nodes.push(
        <View key={`ol-${idx}`} style={richStyles.listRow}>
          <Text style={richStyles.olBullet}>{olMatch[1]}.</Text>
          <Text style={richStyles.listText}>
            {renderInline(parseInline(olMatch[2]), richStyles.listText, richStyles.boldInline, richStyles.codeInline)}
          </Text>
        </View>
      );
      continue;
    }

    // --- Emoji / status prefix
    const emojiMatch = trimmed.match(/^([✅❌⚠️🎯🎉💸💰🏠📋💱📅⏰🛡️💳🔒📊💡👋✨🔗🎓⭐]+)\s*/);
    if (emojiMatch) {
      const rest = trimmed.substring(emojiMatch[0].length);
      const segs = parseInline(rest);
      nodes.push(
        <View key={`em-${idx}`} style={richStyles.emojiRow}>
          <Text style={richStyles.emojiChar}>{emojiMatch[1]}</Text>
          <Text style={richStyles.emojiText}>
            {renderInline(segs, richStyles.emojiText, richStyles.boldInline, richStyles.codeInline)}
          </Text>
        </View>
      );
      continue;
    }

    // --- Regular paragraph
    const segs = parseInline(trimmed);
    nodes.push(
      <Text key={`p-${idx}`} style={richStyles.paragraph}>
        {renderInline(segs, richStyles.paragraph, richStyles.boldInline, richStyles.codeInline)}
      </Text>
    );
  }

  // Close unclosed code block
  if (inCodeBlock && codeBuffer.length > 0) {
    nodes.push(
      <View key={`cb-${codeKey}`} style={richStyles.codeBlock}>
        <Text style={richStyles.codeText}>{codeBuffer.join('\n')}</Text>
      </View>
    );
  }

  return nodes;
}

const richStyles = StyleSheet.create({
  h1: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '700', color: Colors.primary, marginTop: 12, marginBottom: 4, lineHeight: 28 },
  h2: { fontSize: 16, fontFamily: 'Montserrat', fontWeight: '700', color: Colors.primary, marginTop: 10, marginBottom: 3, lineHeight: 24 },
  h3: { fontSize: 15, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurface, marginTop: 8, marginBottom: 2, lineHeight: 22 },
  paragraph: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onSurface, lineHeight: 22, marginBottom: 4 },
  boldInline: { fontWeight: '700', fontFamily: 'Inter', color: Colors.primary },
  codeInline: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, backgroundColor: Colors.surfaceContainerHigh, color: Colors.tertiary, paddingHorizontal: 4, borderRadius: 4 },
  codeBlock: { backgroundColor: Colors.surfaceContainerHigh, padding: 12, borderRadius: BorderRadius.lg, marginVertical: 6, borderWidth: 1, borderColor: Colors.outlineVariant + '4D' },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, color: Colors.onSurface, lineHeight: 20 },
  hr: { height: 1, backgroundColor: Colors.outlineVariant + '80', marginVertical: 10 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: Colors.primary + '80', paddingLeft: 12, marginVertical: 4, backgroundColor: Colors.surfaceContainerLow, paddingVertical: 8, paddingRight: 12, borderRadius: 4 },
  blockquoteText: { fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onSurfaceVariant, lineHeight: 20, fontStyle: 'italic' },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginVertical: 2, paddingLeft: 4 },
  bullet: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.primary, lineHeight: 22, width: 10, textAlign: 'center' },
  olBullet: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.primary, lineHeight: 22, minWidth: 20, textAlign: 'right' },
  listText: { flex: 1, fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onSurface, lineHeight: 22 },
  emojiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginVertical: 3, paddingLeft: 2 },
  emojiChar: { fontSize: 16, lineHeight: 22, width: 22, textAlign: 'center' },
  emojiText: { flex: 1, fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onSurface, lineHeight: 22 },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const inputRef = useRef<TextInput>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setMessage('');
    setIsTyping(true);
    setError(null);
    setLocalMode(!isBackendOnline());

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
    inputRef.current?.blur();
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <DismissKeyboard>
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                    <Text style={styles.userMsgTime}>
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
                        <Text style={styles.aiMsgTime}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      {i === messages.length - 1 && msg.role === 'assistant' && suggestions.length > 0 && (
                        <View style={styles.suggestedRow}>
                          {suggestions.slice(0, 4).map((reply) => (
                            <TouchableOpacity key={reply} style={styles.suggestedChip} activeOpacity={0.7} onPress={() => sendMessage(reply)}>
                              <MaterialCommunityIcons name="flash-outline" size={12} color={Colors.primary} />
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
        </DismissKeyboard>

        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Ask Kanzu anything..."
              placeholderTextColor={Colors.outline}
              value={message}
              onChangeText={setMessage}
              multiline
              blurOnSubmit
              returnKeyType="send"
              onSubmitEditing={() => { if (message.trim()) sendMessage(message); }}
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
  userMsgTime: { fontSize: 10, color: Colors.onPrimary, opacity: 0.7, textAlign: 'right', marginTop: 4 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  aiAvatarSmall: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.secondaryContainer, justifyContent: 'center', alignItems: 'center' },
  aiBlock: { flex: 1, gap: 8 },
  aiMessage: { backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.stackMd, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.outlineVariant + '1A', ...Shadow.level1 },
  aiMsgTime: { fontSize: 10, color: Colors.onSurfaceVariant, opacity: 0.6, textAlign: 'right', marginTop: 6 },
  suggestedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primaryFixedDim + '4D', ...Shadow.level1 },
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
