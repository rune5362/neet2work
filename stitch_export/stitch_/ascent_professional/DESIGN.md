---
name: Ascent Professional
colors:
  surface: '#faf9fd'
  surface-dim: '#dad9dd'
  surface-bright: '#faf9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f7'
  surface-container: '#efedf1'
  surface-container-high: '#e9e7eb'
  surface-container-highest: '#e3e2e6'
  on-surface: '#1a1c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2f3033'
  inverse-on-surface: '#f1f0f4'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#006e2c'
  on-secondary: '#ffffff'
  secondary-container: '#88fb99'
  on-secondary-container: '#00742f'
  tertiary: '#321b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f2e00'
  on-tertiary-container: '#c6955e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#88fb99'
  secondary-fixed-dim: '#6bde80'
  on-secondary-fixed: '#002108'
  on-secondary-fixed-variant: '#00531f'
  tertiary-fixed: '#ffddba'
  tertiary-fixed-dim: '#f2bc82'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#633f0f'
  background: '#faf9fd'
  on-background: '#1a1c1e'
  surface-variant: '#e3e2e6'
  growth-green: '#2DA44E'
  transition-orange: '#F6AD55'
  ai-indigo: '#4338CA'
  surface-muted: '#F6F8FA'
  border-subtle: '#D0D7DE'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  section-gap: 80px
---

## Brand & Style

The design system is engineered to bridge the gap between unemployment (NEET) and professional integration. It balances the gravity of career consulting with the optimism of personal growth. The personality is **authoritative yet empathetic**, acting as a steady mentor for youth in transition.

We utilize a **Modern Corporate** style with a focus on **Tonal Minimalism**. The aesthetic is defined by high legibility, generous whitespace to reduce cognitive load for users who may feel overwhelmed, and a sophisticated use of depth to guide focus. The inclusion of AI-driven career matching is reflected through subtle technical accents—precise lines and data-informed layouts—without feeling cold or mechanical. The emotional goal is to move the user from "uncertainty" to "structured action."

## Colors

The palette is anchored by **Trustworthy Deep Blue**, providing a foundation of stability and institutional reliability. 

- **Primary**: Used for navigation, primary headers, and foundational UI elements.
- **Secondary (Growth Green)**: Applied to success states, completion indicators, and "Apply" or "Start" actions to symbolize progress.
- **Accent (Transition Orange)**: Used sparingly for high-attention call-to-actions (CTAs) and notifications, representing the energy of change.
- **Neutral**: A sophisticated range of cool grays provides a clean environment, ensuring the chromatic brand colors remain purposeful and distinct.
- **AI-Indigo**: Reserved specifically for AI analysis features, matching algorithms, and automated insights to differentiate machine-generated content from human consulting.

## Typography

This design system utilizes **Hanken Grotesk** for its clean, sharp, and contemporary feel. It offers the precision of a geometric sans-serif while maintaining a humanist warmth suitable for supportive consulting.

- **Headlines**: Use heavy weights (600-700) with slight negative letter-spacing to create a strong visual hierarchy.
- **Body**: Standardized at 16px for optimal readability across career descriptions and reports.
- **Technical Labels**: **JetBrains Mono** is introduced for metadata, AI confidence scores, and specific system status indicators to give a subtle "technical" and "analyzed" feel to the career matching data.
- **Scale**: Mobile headings scale down aggressively to ensure no text wraps awkwardly on small viewports.

## Layout & Spacing

The system employs a **Fixed-Fluid Hybrid** grid. Content is contained within a 1200px max-width wrapper on desktop to prevent eye strain during long-form reading of career reports.

- **Rhythm**: An 8px baseline grid governs all vertical and horizontal spacing.
- **Desktop**: 12-column grid with 24px gutters. Large sections are separated by an 80px gap to provide the "generous whitespace" requested, reducing the feeling of clutter.
- **Mobile**: 4-column grid with 16px side margins. Elements reflow into a single column stack for clarity.
- **AI Cards**: Components related to analysis often use internal padding of 32px (4 units) to create a sense of importance and "breathing room" around results.

## Elevation & Depth

To maintain a "Modern Flat" aesthetic with "Soft Shadows," the system avoids heavy black drop shadows. Depth is communicated through:

1.  **Tonal Surfaces**: Secondary content sits on `surface-muted` (#F6F8FA) to distinguish it from the primary white background.
2.  **Luminescent Shadows**: Shadows are highly diffused, using a low-opacity tint of the primary color (e.g., `rgba(26, 54, 93, 0.08)`) rather than pure gray. This creates a "glow" effect that feels more supportive and less heavy.
3.  **Active Elevation**: Only interactive elements (cards, buttons) transition on the Z-axis. Upon hover, an element's shadow expands slightly to signal clickability.
4.  **Flat Dividers**: Structural separation uses 1px lines in `border-subtle`, ensuring the UI remains grounded and professional.

## Shapes

The shape language is **Rounded (0.5rem)**. This level was chosen to soften the "Corporate" feel of the deep blue, making the platform more approachable for younger users.

- **Standard Elements**: Buttons and input fields use a `0.5rem` (8px) radius.
- **Container Surfaces**: Large cards and content blocks use `rounded-lg` (16px) to create a friendly, modern container for information.
- **Data Pills**: Use a full-round (pill) shape to denote categorical data and status tags, differentiating them from interactive buttons.

## Components

### Buttons
- **Primary**: Solid `primary-color` with white text. High-contrast, sharp focus.
- **Growth (CTA)**: Solid `growth-green` for "Complete" or "Success" actions.
- **Ghost**: Transparent background with a `primary-color` border for secondary actions.

### AI Analysis Cards
Specialized containers with a subtle left-border accent in `ai-indigo`. These cards should use slightly more padding than standard cards to highlight their role as "automated insights."

### Input Fields
Clean, 1px bordered boxes that transition to a `primary-color` border with a 2px outer glow on focus. Labels use `label-md` for a precise, organized look.

### Chips & Tags
Used for "Required Skills" or "Career Keywords." They use the `rounded-full` shape and are styled with a light tint of the category color (e.g., a 10% opacity Green background for a "Growth" skill).

### Progress Tracks
Thin horizontal bars using `surface-muted` as the track and a gradient from `primary-color` to `growth-green` as the fill, visually representing the journey "From NEET to WORK."