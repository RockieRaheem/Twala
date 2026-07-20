export const Colors = {
  primary: '#004336',
  onPrimary: '#ffffff',
  primaryContainer: '#005d4b',
  onPrimaryContainer: '#89d3bc',
  primaryFixed: '#a6f1d9',
  primaryFixedDim: '#8bd5be',
  onPrimaryFixed: '#002019',
  onPrimaryFixedVariant: '#005141',
  inversePrimary: '#8bd5be',
  secondary: '#835400',
  onSecondary: '#ffffff',
  secondaryContainer: '#fcab28',
  onSecondaryContainer: '#694300',
  secondaryFixed: '#ffddb5',
  secondaryFixedDim: '#ffb957',
  onSecondaryFixed: '#2a1800',
  onSecondaryFixedVariant: '#643f00',
  tertiary: '#004054',
  onTertiary: '#ffffff',
  tertiaryContainer: '#005972',
  onTertiaryContainer: '#5ed2ff',
  tertiaryFixed: '#bde9ff',
  tertiaryFixedDim: '#64d3ff',
  onTertiaryFixed: '#001f2a',
  onTertiaryFixedVariant: '#004d64',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  background: '#f6fafe',
  onBackground: '#171c1f',
  surface: '#f6fafe',
  onSurface: '#171c1f',
  surfaceDim: '#d6dade',
  surfaceBright: '#f6fafe',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f0f4f8',
  surfaceContainer: '#eaeef2',
  surfaceContainerHigh: '#e4e9ed',
  surfaceContainerHighest: '#dfe3e7',
  onSurfaceVariant: '#3f4945',
  inverseSurface: '#2c3134',
  inverseOnSurface: '#edf1f5',
  outline: '#6f7975',
  outlineVariant: '#bec9c4',
  surfaceTint: '#1a6a57',
  surfaceVariant: '#dfe3e7',
} as const;

export const Fonts = {
  headline: {
    fontFamily: 'Montserrat',
    fontWeight: '600' as const,
  },
  headlineBold: {
    fontFamily: 'Montserrat',
    fontWeight: '700' as const,
  },
  headlineExtraBold: {
    fontFamily: 'Montserrat',
    fontWeight: '800' as const,
  },
  body: {
    fontFamily: 'Inter',
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontFamily: 'Inter',
    fontWeight: '500' as const,
  },
  bodySemiBold: {
    fontFamily: 'Inter',
    fontWeight: '600' as const,
  },
};

export const Typography = {
  displayLg: {
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -0.02,
    ...Fonts.headlineExtraBold,
  },
  displayLgMobile: {
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.01,
    ...Fonts.headlineBold,
  },
  headlineMd: {
    fontSize: 24,
    lineHeight: 32,
    ...Fonts.headline,
  },
  headlineSm: {
    fontSize: 20,
    lineHeight: 28,
    ...Fonts.headline,
  },
  bodyLg: {
    fontSize: 18,
    lineHeight: 28,
    ...Fonts.body,
  },
  bodyMd: {
    fontSize: 16,
    lineHeight: 24,
    ...Fonts.body,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    ...Fonts.body,
  },
  labelMd: {
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.02,
    ...Fonts.bodySemiBold,
  },
  labelSm: {
    fontSize: 12,
    lineHeight: 16,
    ...Fonts.bodyMedium,
  },
};

export const Spacing = {
  stackSm: 8,
  stackMd: 16,
  stackLg: 32,
  gutter: 24,
  containerPaddingMobile: 16,
  containerPaddingDesktop: 32,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Shadow = {
  level1: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  level2: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;
