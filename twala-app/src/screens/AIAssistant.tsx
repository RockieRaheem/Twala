import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet, Animated, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl, Keyboard, Modal, Dimensions, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { chatApi, isBackendOnline, notifyChange, type ChatMsg, type ChatSessionData, type NavigateAction } from '../services/api';
import DismissKeyboard from '../components/DismissKeyboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
// Professional markdown renderer (unchanged)
// ---------------------------------------------------------------------------

interface InlineSegment { t: 'text' | 'bold' | 'code'; v: string; }

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let remaining = text;
  let guard = 0;
  while (remaining.length > 0 && guard < 30) {
    guard++;
    const b = remaining.match(/\*\*(.+?)\*\*/);
    const c = remaining.match(/`([^`]+)`/);
    let first: RegExpMatchArray | null = null;
    let type: 'bold' | 'code' = 'bold';
    if (b && c) { if (b.index! <= c.index!) { first = b; type = 'bold'; } else { first = c; type = 'code'; } }
    else if (b) { first = b; type = 'bold'; } else if (c) { first = c; type = 'code'; }
    if (first && first.index !== undefined) {
      if (first.index > 0) segments.push({ t: 'text', v: remaining.substring(0, first.index) });
      segments.push({ t: type, v: first[1] });
      remaining = remaining.substring(first.index + first[0].length);
    } else { segments.push({ t: 'text', v: remaining }); remaining = ''; }
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

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        nodes.push(<View key={`cb-${codeKey++}`} style={richStyles.codeBlock}><Text style={richStyles.codeText}>{codeBuffer.join('\n')}</Text></View>);
        codeBuffer = []; inCodeBlock = false;
      } else { inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) { codeBuffer.push(raw); continue; }

    if (!trimmed) { nodes.push(<View key={`sp-${idx}`} style={{ height: 6 }} />); continue; }

    if (/^[-*_]{3,}$/.test(trimmed)) { nodes.push(<View key={`hr-${idx}`} style={richStyles.hr} />); continue; }

    const hm = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      const level = hm[1].length;
      nodes.push(<Text key={`h-${idx}`} style={level === 1 ? richStyles.h1 : level === 2 ? richStyles.h2 : richStyles.h3}>{renderInline(parseInline(hm[2]), level === 1 ? richStyles.h1 : level === 2 ? richStyles.h2 : richStyles.h3, richStyles.boldInline, richStyles.codeInline)}</Text>);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      nodes.push(<View key={`bq-${idx}`} style={richStyles.blockquote}><Text style={richStyles.blockquoteText}>{renderInline(parseInline(trimmed.replace(/^>\s?/, '')), richStyles.blockquoteText, richStyles.boldInline, richStyles.codeInline)}</Text></View>);
      continue;
    }

    const ulMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      nodes.push(<View key={`ul-${idx}`} style={richStyles.listRow}><Text style={richStyles.bullet}>•</Text><Text style={richStyles.listText}>{renderInline(parseInline(ulMatch[1]), richStyles.listText, richStyles.boldInline, richStyles.codeInline)}</Text></View>);
      continue;
    }

    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      nodes.push(<View key={`ol-${idx}`} style={richStyles.listRow}><Text style={richStyles.olBullet}>{olMatch[1]}.</Text><Text style={richStyles.listText}>{renderInline(parseInline(olMatch[2]), richStyles.listText, richStyles.boldInline, richStyles.codeInline)}</Text></View>);
      continue;
    }

    const emojiMatch = trimmed.match(/^([✅❌⚠️🎯🎉💸💰🏠📋💱📅⏰🛡️💳🔒📊💡👋✨🔗🎓⭐]+)\s*/);
    if (emojiMatch) {
      const rest = trimmed.substring(emojiMatch[0].length);
      nodes.push(<View key={`em-${idx}`} style={richStyles.emojiRow}><Text style={richStyles.emojiChar}>{emojiMatch[1]}</Text><Text style={richStyles.emojiText}>{renderInline(parseInline(rest), richStyles.emojiText, richStyles.boldInline, richStyles.codeInline)}</Text></View>);
      continue;
    }

    const segs = parseInline(trimmed);
    nodes.push(<Text key={`p-${idx}`} style={richStyles.paragraph}>{renderInline(segs, richStyles.paragraph, richStyles.boldInline, richStyles.codeInline)}</Text>);
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    nodes.push(<View key={`cb-${codeKey}`} style={richStyles.codeBlock}><Text style={richStyles.codeText}>{codeBuffer.join('\n')}</Text></View>);
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
// Time grouping
// ---------------------------------------------------------------------------

function groupSessionsByTime(sessions: ChatSessionData[]): { title: string; data: ChatSessionData[] }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);

  const groups: Record<string, ChatSessionData[]> = { Today: [], Yesterday: [], 'Last 7 Days': [], Older: [] };

  for (const s of sessions) {
    const d = new Date(s.lastMessageAt);
    if (d >= todayStart) groups.Today.push(s);
    else if (d >= yesterdayStart) groups.Yesterday.push(s);
    else if (d >= weekStart) groups['Last 7 Days'].push(s);
    else groups.Older.push(s);
  }

  return Object.entries(groups)
    .filter(([, v]) => v.length > 0)
    .map(([title, data]) => ({ title, data }));
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  onNavigate?: (screen: string) => void;
  onNavigateGoal?: (id: string) => void;
}

export type { Props as AIAssistantProps };

export default function AIAssistant({ onNavigate, onNavigateGoal }: Props) {
  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const loadSessions = useCallback(async () => {
    setLocalMode(!isBackendOnline());
    const [sessionsRes, sugRes] = await Promise.all([chatApi.listSessions(), chatApi.suggestions()]);
    if (sessionsRes.success && sessionsRes.data) {
      setSessions(sessionsRes.data);
      if (sessionsRes.data.length > 0 && !activeSessionId) {
        loadSessionIntoState(sessionsRes.data[0].id);
      }
    }
    if (sugRes.success && sugRes.data) setSuggestions(sugRes.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadSessions(); }, []);

  const loadSessionIntoState = async (id: string) => {
    setActiveSessionId(id);
    const res = await chatApi.getSession(id);
    if (res.success && res.data) {
      setMessages(res.data.messages);
    }
  };

  const switchSession = (id: string) => {
    setSidebarVisible(false);
    loadSessionIntoState(id);
  };

  const createNewSession = async () => {
    const res = await chatApi.createSession();
    if (res.success && res.data) {
      setSessions((prev) => [res.data, ...prev]);
      setActiveSessionId(res.data.id);
      setMessages([]);
      setSidebarVisible(false);
    }
  };

  const deleteSession = (id: string, title: string) => {
    Alert.alert('Delete Chat', `Permanently delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await chatApi.deleteSession(id);
          setSessions((prev) => prev.filter((s) => s.id !== id));
          if (activeSessionId === id) {
            const remaining = sessions.filter((s) => s.id !== id);
            if (remaining.length > 0) {
              loadSessionIntoState(remaining[0].id);
            } else {
              setActiveSessionId(null);
              setMessages([]);
            }
          }
        },
      },
    ]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (!activeSessionId) {
      const res = await chatApi.createSession();
      if (!res.success || !res.data) return;
      setSessions((prev) => [res.data, ...prev]);
      setActiveSessionId(res.data.id);
    }
    const sid = activeSessionId || (await chatApi.createSession()).data?.id;
    if (!sid) return;

    const userMsg = text.trim();
    setMessage('');
    setIsTyping(true);
    setError(null);

    const optimisticMsg: ChatMsg = { role: 'user', content: userMsg, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, optimisticMsg]);

    const [chatRes, sugRes] = await Promise.all([chatApi.send(sid, userMsg), chatApi.suggestions()]);
    if (chatRes.success && chatRes.data) {
      const { messages: msgs, navigate } = chatRes.data as any;
      if (Array.isArray(msgs) && msgs.length > 0) {
        setMessages(msgs);
        notifyChange();
      }
      if (navigate) {
        const nav = navigate as NavigateAction;
        if (nav.screen === 'GoalDetail' && nav.goalId && onNavigateGoal) onNavigateGoal(nav.goalId);
        else if (onNavigate) onNavigate(nav.screen);
      }
      const sessionsRes = await chatApi.listSessions();
      if (sessionsRes.success && sessionsRes.data) setSessions(sessionsRes.data);
    } else {
      setError(chatRes.message || 'Failed to send message. Please try again.');
    }
    if (sugRes.success && sugRes.data) setSuggestions(sugRes.data);
    setIsTyping(false);
    inputRef.current?.blur();
  };

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  const groupedSessions = groupSessionsByTime(sessions);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const showQuickActions = messages.length <= 1 && !isTyping;

  // --- Render ---

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
            <MaterialCommunityIcons name="menu" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Kanzu</Text>
            <Text style={styles.headerSub}>
              {isTyping ? 'Thinking...' : activeSession ? activeSession.title : isBackendOnline() ? 'AI Financial Companion' : 'Disconnected'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.newChatButton} onPress={createNewSession} activeOpacity={0.7}>
          <MaterialCommunityIcons name="plus" size={22} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Sidebar Modal */}
      <Modal visible={sidebarVisible} animationType="slide" transparent onRequestClose={() => setSidebarVisible(false)}>
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity style={styles.sidebarBackdrop} activeOpacity={1} onPress={() => setSidebarVisible(false)} />
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Chats</Text>
              <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sidebarNewChat} onPress={createNewSession} activeOpacity={0.7}>
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.sidebarNewChatText}>New Chat</Text>
            </TouchableOpacity>

            <ScrollView style={styles.sidebarList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {loading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
              ) : sessions.length === 0 ? (
                <View style={styles.sidebarEmpty}>
                  <MaterialCommunityIcons name="message-outline" size={40} color={Colors.outlineVariant} />
                  <Text style={styles.sidebarEmptyText}>No chats yet</Text>
                </View>
              ) : (
                groupedSessions.map((group) => (
                  <View key={group.title}>
                    <Text style={styles.sidebarGroupTitle}>{group.title}</Text>
                    {group.data.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.sidebarItem, activeSessionId === s.id && styles.sidebarItemActive]}
                        onPress={() => switchSession(s.id)}
                        onLongPress={() => deleteSession(s.id, s.title)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.sidebarItemLeft}>
                          <MaterialCommunityIcons
                            name="message-text-outline"
                            size={18}
                            color={activeSessionId === s.id ? Colors.primary : Colors.onSurfaceVariant}
                          />
                        </View>
                        <View style={styles.sidebarItemContent}>
                          <Text style={[styles.sidebarItemTitle, activeSessionId === s.id && { color: Colors.primary }]} numberOfLines={1}>
                            {s.title}
                          </Text>
                          <Text style={styles.sidebarItemTime}>{formatRelativeTime(s.lastMessageAt)}</Text>
                        </View>
                        <TouchableOpacity style={styles.sidebarItemDelete} onPress={() => deleteSession(s.id, s.title)}>
                          <MaterialCommunityIcons name="delete-outline" size={18} color={Colors.error} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Chat Area */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <DismissKeyboard>
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSessions(); }} tintColor={Colors.primary} />}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {error && (
                <View style={styles.errorBanner}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.onError} />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={() => setError(null)}>
                    <MaterialCommunityIcons name="close" size={16} color={Colors.onError} />
                  </TouchableOpacity>
                </View>
              )}

              {showQuickActions && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <MaterialCommunityIcons name="robot" size={48} color={Colors.onPrimary} />
                  </View>
                  <Text style={styles.emptyTitle}>How can I help you?</Text>
                  <Text style={styles.emptyDesc}>Send money to Uganda, track savings, check balances</Text>
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
                </View>
              )}

              {messages.length > 0 && (
                <View style={styles.dateMarker}>
                  <MaterialCommunityIcons name="calendar-today" size={12} color={Colors.onSurfaceVariant} />
                  <Text style={styles.dateText}>
                    {activeSession ? new Date(activeSession.lastMessageAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Today'}
                  </Text>
                </View>
              )}

              {messages.map((msg, i) => (
                msg.role === 'user' ? (
                  <View key={msg.id || i} style={styles.userMessage}>
                    <Text style={styles.userMessageText}>{msg.content}</Text>
                    <Text style={styles.userMsgTime}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ) : (
                  <View key={msg.id || i} style={styles.aiRow}>
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

        {/* Input Area */}
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
  menuButton: { padding: 8, borderRadius: BorderRadius.full, marginLeft: -4 },
  headerTitle: { fontSize: Typography.headlineMd.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  headerSub: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant, maxWidth: SCREEN_WIDTH * 0.55 },
  newChatButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadow.level1 },

  // Sidebar
  sidebarOverlay: { flex: 1, flexDirection: 'row' },
  sidebarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sidebar: { width: SCREEN_WIDTH * 0.8, backgroundColor: Colors.surface, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.gutter, paddingBottom: Spacing.stackSm },
  sidebarTitle: { fontSize: Typography.headlineMd.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  sidebarNewChat: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.gutter, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: Colors.primaryFixed + '1A', borderRadius: BorderRadius.lg, marginBottom: Spacing.gutter },
  sidebarNewChatText: { fontSize: Typography.labelMd.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.primary },
  sidebarList: { flex: 1, paddingHorizontal: Spacing.gutter },
  sidebarEmpty: { alignItems: 'center', paddingVertical: 40 },
  sidebarEmptyText: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.outline, marginTop: 8 },
  sidebarGroupTitle: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '600', color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, paddingVertical: 8, paddingHorizontal: 4 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: BorderRadius.lg, marginBottom: 2 },
  sidebarItemActive: { backgroundColor: Colors.primaryFixed + '1A' },
  sidebarItemLeft: { width: 24, alignItems: 'center' },
  sidebarItemContent: { flex: 1 },
  sidebarItemTitle: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurface },
  sidebarItemTime: { fontSize: 10, fontFamily: 'Inter', color: Colors.outline, marginTop: 1 },
  sidebarItemDelete: { padding: 6, borderRadius: BorderRadius.md, opacity: 0.7 },

  // Chat
  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: Spacing.containerPaddingMobile, paddingBottom: 20 },
  dateMarker: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceContainerHighest + '80', paddingHorizontal: 16, paddingVertical: 6, borderRadius: BorderRadius.full, marginVertical: Spacing.gutter },
  dateText: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.onSurfaceVariant },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: Spacing.stackSm },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.stackMd, ...Shadow.level2 },
  emptyTitle: { fontSize: Typography.headlineSm.fontSize, fontFamily: 'Montserrat', fontWeight: '600', color: Colors.primary },
  emptyDesc: { fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onSurfaceVariant, textAlign: 'center' },
  quickActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: Spacing.stackMd },
  quickActionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.outlineVariant + '4D', ...Shadow.level1 },
  quickActionLabel: { fontSize: Typography.labelSm.fontSize, fontFamily: 'Inter', fontWeight: '500', color: Colors.primary },

  // Messages
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

  // Input
  inputArea: { paddingHorizontal: Spacing.containerPaddingMobile, paddingVertical: Spacing.stackSm, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.outlineVariant + '4D' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: Colors.surfaceContainerLowest, padding: 8, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant + '4D', ...Shadow.level2 },
  input: { flex: 1, fontSize: Typography.bodyMd.fontSize, fontFamily: 'Inter', color: Colors.onSurface, paddingVertical: 8, paddingHorizontal: 4, maxHeight: 100 },
  sendButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, ...Shadow.level1 },
  sendButtonDisabled: { backgroundColor: Colors.surfaceContainerHigh },

  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.errorContainer, padding: Spacing.stackMd, borderRadius: BorderRadius.lg, marginBottom: Spacing.gutter },
  errorText: { flex: 1, fontSize: Typography.bodySm.fontSize, fontFamily: 'Inter', color: Colors.onError },
});
