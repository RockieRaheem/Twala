---
name: Heritage & Horizon
colors:
  surface: '#f6fafe'
  surface-dim: '#d6dade'
  surface-bright: '#f6fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f8'
  surface-container: '#eaeef2'
  surface-container-high: '#e4e9ed'
  surface-container-highest: '#dfe3e7'
  on-surface: '#171c1f'
  on-surface-variant: '#3f4945'
  inverse-surface: '#2c3134'
  inverse-on-surface: '#edf1f5'
  outline: '#6f7975'
  outline-variant: '#bec9c4'
  surface-tint: '#1a6a57'
  primary: '#004336'
  on-primary: '#ffffff'
  primary-container: '#005d4b'
  on-primary-container: '#89d3bc'
  inverse-primary: '#8bd5be'
  secondary: '#835400'
  on-secondary: '#ffffff'
  secondary-container: '#fcab28'
  on-secondary-container: '#694300'
  tertiary: '#004054'
  on-tertiary: '#ffffff'
  tertiary-container: '#005972'
  on-tertiary-container: '#5ed2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a6f1d9'
  primary-fixed-dim: '#8bd5be'
  on-primary-fixed: '#002019'
  on-primary-fixed-variant: '#005141'
  secondary-fixed: '#ffddb5'
  secondary-fixed-dim: '#ffb957'
  on-secondary-fixed: '#2a1800'
  on-secondary-fixed-variant: '#643f00'
  tertiary-fixed: '#bde9ff'
  tertiary-fixed-dim: '#64d3ff'
  on-tertiary-fixed: '#001f2a'
  on-tertiary-fixed-variant: '#004d64'
  background: '#f6fafe'
  on-background: '#171c1f'
  surface-variant: '#dfe3e7'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding-mobile: 16px
  container-padding-desktop: 32px
  gutter: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is built on the narrative of "Carrying Home Across Borders," specifically tailored for the Ugandan diaspora. It bridges the emotional distance between global residency and local roots. The visual style is **Corporate Modern with Tactile Warmth**, balancing the ironclad security of fintech with the organic, welcoming spirit of community growth.

The identity avoids the cold, sterile tropes of traditional banking, opting instead for a "High-Trust, High-Heart" approach. It utilizes expansive whitespace to denote clarity and professionalism, paired with rich, heritage-inspired tones that evoke a sense of belonging and progress. The interface is goal-oriented, ensuring that every interaction—from land purchase to school fee payments—feels like a tangible step toward a better future.

## Colors
The palette is grounded in the Ugandan landscape and the sky that connects us all.

- **Heritage Green (#005D4B):** The primary anchor. It represents stability, land ownership, and the lush fertility of home. Use this for primary actions, headers, and brand-critical moments.
- **Savannah Gold (#F9A825):** The secondary warmth. It signifies prosperity and the glow of achievement. Use this for highlights, secondary CTAs, and success indicators.
- **Stellar Blue (#08B5E5):** The technological bridge. A high-energy accent representing the blockchain infrastructure. Use sparingly for data visualizations, tech-specific features, and interactive links.
- **Surface & Backgrounds:** The UI sits on a base of Pure White (#FFFFFF) and Slate Grey (#F8FAFC) to maintain a clean, modern fintech aesthetic that ensures content legibility.

## Typography
This design system employs a dual-typeface strategy to signal both authority and accessibility.

- **Montserrat (Headlines):** Chosen for its geometric confidence and modern urban feel. It provides the "Strong" foundation required for a fintech brand. Use Bold weights for major headings and Semibold for subheaders.
- **Inter (Body & UI):** Chosen for its exceptional legibility and systematic performance. It handles data-dense screens and transactional details with professional clarity.
- **Hierarchy:** Maintain generous vertical rhythm. Titles should use tighter letter-spacing to appear more impactful, while small labels should use slightly increased tracking for readability on mobile devices.

## Layout & Spacing
The layout follows a **Fluid Grid** model to ensure seamless transitions across the global variety of devices used by the diaspora.

- **Desktop:** 12-column grid with 24px gutters. Max-width of 1280px to maintain focus.
- **Mobile:** 4-column grid with 16px gutters and 16px side margins.
- **Rhythm:** All spacing is derived from an 8px base unit. Component internal padding should prioritize `stack-md` (16px) for a breathable, "warm" feel.
- **Content Density:** Maintain high whitespace between sections to reduce cognitive load during complex financial tasks.

## Elevation & Depth
Depth is used to signify "Safety" and "Focus." The design system utilizes **Ambient Shadows** that are soft, diffused, and slightly tinted with Heritage Green to avoid a "dirty" grey look.

- **Level 1 (Cards/Lists):** 0px 4px 12px rgba(0, 93, 75, 0.05). Used for standard information blocks.
- **Level 2 (Modals/Active States):** 0px 12px 24px rgba(0, 93, 75, 0.1). Used for elements that require immediate user attention.
- **Interactive Surfaces:** Use subtle tonal layering (Slate 50 backgrounds) to differentiate the page base from interactive content containers.

## Shapes
The shape language is **Rounded**, reflecting the approachable and friendly nature of the brand.

- **Core Radius:** 0.75rem (12px) is the standard for cards, input fields, and standard buttons.
- **Large Components:** Containers and major dashboard sections should use 1rem (16px) to emphasize the "soft and safe" fintech feel.
- **Interactive Elements:** Buttons and tags should feel substantial and "touchable," avoiding sharp corners that create a sense of digital friction.

## Components
Consistent component styling reinforces the "Heritage & Horizon" narrative.

- **Buttons:** 
  - *Primary:* Heritage Green background, White text. High-contrast, 12px radius.
  - *Secondary:* White background, Heritage Green border (2px).
  - *Success:* Savannah Gold background for "Goal Achieved" moments.
- **Progress Indicators:** Use circular rings for long-term goals (e.g., land ownership progress) and linear bars for immediate transactional steps. Use Savannah Gold for active progress.
- **Input Fields:** 12px rounded corners, 1px Slate 200 border. On focus, the border transitions to Heritage Green with a soft outer glow.
- **Cards:** White background, Level 1 shadow, 16px internal padding. Cards should have a subtle 1px border in Slate 50 to define boundaries on bright screens.
- **Iconography:** Minimalist, single-weight strokes (2px). Use Heritage Green for functional icons and Savannah Gold/Stellar Blue for decorative "Milestone" icons (e.g., a gold mortarboard for education payments).
- **Chips/Tags:** Used for status (e.g., "Verified," "Pending"). Use low-saturation background tints of the status color with high-saturation text.