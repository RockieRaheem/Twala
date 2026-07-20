import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { useState } from 'react';

const SUGGESTED_REPLIES = ['Yes, show me', 'Check exchange rate', 'Update goal target'];

export default function AIAssistant() {
  const [message, setMessage] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxWM82cYZtvfTL2ZJPksQNsPwop0gt7O134YPbsH5D3ifP60vCxcKcOGG-6GP0HAdOngLIpctH77a-OjANA759yWasxzK9NwIo7oBow4fkDt3UZl2F8f55Rk4UqScqoZux6Hui0uQKkwN9e4MeBkEMsvkl0MifBXkDm-g5XiYw0HV3Rb3rPFKTaZfCUzvgHqjVIYQ3gLkolU2-hpjz3mpPiHWkLicepVUEmcwfSdnNoSS-1G9HizjT' }}
              style={styles.avatarImage}
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>Kanzu</Text>
            <Text style={styles.headerSub}>Twala AI Companion</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifButton}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
        <View style={styles.dateMarker}>
          <Text style={styles.dateText}>Today</Text>
        </View>

        <View style={styles.userMessage}>
          <Text style={styles.userMessageText}>
            How am I doing with my house project savings for Wakiso?
          </Text>
          <Text style={styles.messageTime}>10:42 AM</Text>
        </View>

        <View style={styles.aiRow}>
          <View style={styles.aiAvatarSmall}>
            <MaterialCommunityIcons name="robot" size={16} color={Colors.onSecondaryContainer} />
          </View>
          <View style={styles.aiMessage}>
            <Text style={styles.aiMessageText}>
              I see you're planning to build a three-bedroom house in Wakiso. Based on your current savings, we can reach the roofing milestone by October. Would you like to see a breakdown?
            </Text>
            <Text style={styles.messageTime}>10:42 AM</Text>
          </View>
        </View>

        <View style={styles.dataCard}>
          <View style={styles.dataCardDecor}>
            <MaterialCommunityIcons name="home-roof" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.dataLabel}>TARGET DATE</Text>
          <View style={styles.dataValueRow}>
            <Text style={styles.dataValue}>October 2024</Text>
            <View style={styles.dataBadge}>
              <Text style={styles.dataBadgeText}>On Track</Text>
            </View>
          </View>
          <View style={styles.dataBarBg}>
            <View style={[styles.dataBarFill, { width: '65%' }]} />
          </View>
          <Text style={styles.dataSub}>65% of roofing fund accumulated</Text>
        </View>

        <View style={styles.suggestedRow}>
          {SUGGESTED_REPLIES.map((reply) => (
            <TouchableOpacity key={reply} style={styles.suggestedChip} activeOpacity={0.7}>
              <Text style={styles.chipText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
          />
          <TouchableOpacity style={styles.inputIcon}>
            <MaterialCommunityIcons name="microphone" size={24} color={Colors.primaryContainer} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendButton}>
            <MaterialCommunityIcons name="arrow-up" size={24} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primaryFixed,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontSize: Typography.headlineMd.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.primary,
  },
  headerSub: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  notifButton: {
    padding: 8,
    borderRadius: BorderRadius.full,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingBottom: 20,
  },
  dateMarker: {
    alignSelf: 'center',
    backgroundColor: Colors.surfaceContainerHighest + '80',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginVertical: Spacing.gutter,
  },
  dateText: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  userMessage: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: Colors.primary,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl * 1.5,
    borderTopRightRadius: 0,
    ...Shadow.level1,
    marginBottom: Spacing.gutter,
  },
  userMessageText: {
    fontSize: Typography.bodyMd.fontSize,
    fontFamily: 'Inter',
    color: Colors.onPrimary,
  },
  messageTime: {
    fontSize: 10,
    color: Colors.onPrimary,
    opacity: 0.7,
    textAlign: 'right',
    marginTop: 4,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  aiAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiMessage: {
    maxWidth: '85%',
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl * 1.5,
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '1A',
    ...Shadow.level1,
  },
  aiMessageText: {
    fontSize: Typography.bodyMd.fontSize,
    fontFamily: 'Inter',
    color: Colors.onSurface,
    lineHeight: 24,
  },
  dataCard: {
    marginLeft: 40,
    maxWidth: '85%',
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '33',
    ...Shadow.level1,
    marginTop: 8,
    marginBottom: Spacing.gutter,
    overflow: 'hidden',
    position: 'relative',
  },
  dataCardDecor: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.1,
  },
  dataLabel: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dataValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  dataValue: {
    fontSize: Typography.headlineSm.fontSize,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: Colors.primary,
  },
  dataBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  dataBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: Colors.onSecondaryContainer,
  },
  dataBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.stackMd,
    overflow: 'hidden',
  },
  dataBarFill: {
    height: '100%',
    backgroundColor: Colors.secondaryContainer,
    borderRadius: BorderRadius.full,
  },
  dataSub: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: Colors.onSurfaceVariant,
    marginTop: 8,
  },
  suggestedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 40,
  },
  suggestedChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryFixedDim + '4D',
    ...Shadow.level1,
  },
  chipText: {
    fontSize: Typography.labelSm.fontSize,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: Colors.primary,
  },
  inputArea: {
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingVertical: Spacing.stackMd,
    backgroundColor: Colors.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 8,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    ...Shadow.level2,
  },
  inputIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  input: {
    flex: 1,
    fontSize: Typography.bodyMd.fontSize,
    fontFamily: 'Inter',
    color: Colors.onSurface,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    ...Shadow.level1,
  },
});
