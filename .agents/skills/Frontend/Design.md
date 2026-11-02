---
version: alpha
name: Unstop
description: A bright, youth-oriented career discovery platform with crisp blue accents, airy spacing, and card-led content presentation.
colors:
  primary: "#0073E6"
  primary-60: "#4A9AF0"
  primary-20: "#D9ECFF"
  secondary: "#174073"
  tertiary: "#6A5AF9"
  neutral: "#DEEDFC"
  surface: "#FFFFFF"
  on-surface: "#383838"
  border: "#E2E2E2"
  muted: "#727272"
  error: "#E11D48"
typography:
  headline-display:
    fontFamily: Inter
    fontSize: 46px
    fontWeight: 800
    lineHeight: 55.2px
    letterSpacing: 0px
    fontFeature: "normal"
  headline-lg:
    fontFamily: Inter
    fontSize: 35px
    fontWeight: 600
    lineHeight: 42px
    letterSpacing: 0px
  headline-md:
    fontFamily: Inter
    fontSize: 27px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Inter
    fontSize: 21px
    fontWeight: 600
    lineHeight: 25px
    letterSpacing: 0px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 27px
    letterSpacing: 0px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 21px
    letterSpacing: 0px
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 18px
    letterSpacing: 0px
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 4px
  md: 12px
  lg: 18px
  xl: 24px
  full: 9999px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 34px
  xl: 58px
  gutter: 24px
  margin: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-60}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
    height: "40px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  card-soft:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
    height: "40px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  sidebar-item:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

# Unstop

## Overview
Unstop feels energetic, optimistic, and practical: a career-discovery platform built for students and early-career users who want fast access to opportunities. The UI balances playful promotional imagery with a structured, content-heavy marketplace layout, so it must stay approachable without becoming noisy. Visual emphasis comes from strong blue highlights, soft backgrounds, and generous whitespace around dense information.

## Colors
- **Primary (#0073E6):** The signature electric blue used for key actions, active states, section accents, and important emphasis such as the leading word in headings.
- **Primary tint (#D9ECFF):** A light sky-blue wash used for cards, pills, sidebar surfaces, and subtle container backgrounds to keep the interface airy.
- **Secondary (#174073):** A deep navy-blue used for stronger brand text, icon strokes, and contrasted button text where a more grounded tone is needed.
- **Tertiary (#6A5AF9):** A violet accent that appears in badges, helper highlights, and secondary promotional elements to add variety without breaking the palette.
- **Neutral (#DEEDFC):** The broad soft-blue canvas that supports the left rail and some card backgrounds, making the layout feel light and open.
- **Surface (#FFFFFF):** Pure white is used for the main content area, search field, cards, and elevated panels to preserve clarity.
- **On-surface (#383838):** The primary reading color for body copy and headings in the content area; it keeps text readable without the harshness of black.
- **Border (#E2E2E2):** A quiet gray border for inputs, cards, and subtle dividers, helping define structure with minimal visual weight.
- **Muted (#727272):** Used for secondary labels, helper text, and low-emphasis links where the content should recede.
- **Error (#E11D48):** Reserved for alerts and destructive states, though the page mostly avoids urgent messaging in the observed screen.

## Typography
Inter is the system font across headings, body, and labels, giving the product a modern and highly legible tone. Headlines are bold and compact: `headline-display` is reserved for the main hero line, while `headline-lg`, `headline-md`, and `headline-sm` step down through section headings and card titles. Body text uses `body-md` and `body-sm` with relaxed line heights for easy scanning in dense lists and card descriptions. Labels and pills rely on `label-md` and `label-sm`, typically medium weight, with minimal letter-spacing and no strong uppercase treatment visible in the source.

## Layout
The page uses a fixed, desktop-first composition with a narrow left sidebar and a wide central content column. Spacing follows a calm, predictable rhythm based on the extracted scale: `xs` 8px, `sm` 16px, `md` 24px, `lg` 34px, and `xl` 58px. Content blocks are separated by generous vertical gaps, especially between the hero, featured carousel, trust logos, and section headers. Cards and side panels rely on consistent internal padding around 16px to 24px, while the main canvas keeps plenty of negative space to prevent the dense marketplace content from feeling crowded.

## Elevation & Depth
The system is largely flat, using contrast, borders, and tonal layering rather than dramatic shadows. When shadow is present, it is subtle and mostly reserved for gentle surface lift, but the observed interface depends more on white cards, pale blue backgrounds, and light gray borders for separation. This creates a clean, modern marketplace feel that stays readable even with many thumbnail-rich modules on screen. Depth is achieved through hierarchy and spacing instead of heavy material effects.

## Shapes
The shape language is soft and friendly, with rounded corners used throughout. Pills, search fields, and prominent buttons use `rounded.full` to feel approachable and touch-friendly, while cards and sidebar modules use `rounded.md` for a tidy, consistent frame. There are no sharp or highly angular surfaces in the observed screen; the overall impression is smooth, contemporary, and slightly playful.

## Components
Buttons should feel compact, rounded, and easy to scan. Use `button-primary` for the strongest calls to action, such as posting or signing in; it should be filled blue with white text and full pill radius. Use `button-secondary` for alternate actions when the button needs to stand out without dominating, and reserve `button-tertiary` for low-emphasis links or text-like controls. Hover states should subtly lighten or shift the blue using `button-primary-hover`, rather than introducing shadows or motion-heavy effects.

Cards are a core building block of the interface. Use `card` for white content blocks and `card-soft` for informational panels or sidebar promos that need a softer blue tone. Cards should stay minimally shadowed, with a clear border, comfortable padding, and rounded corners to support image-first browsing. Featured item cards should keep title, tags, and favorite controls visually separated but compact.

Inputs should be pill-shaped and clean, especially search fields. Use `input` with a white background, fine border, and modest horizontal padding; keep the height around 40px so the field aligns well with compact header controls. Placeholder text should remain muted, and the input should avoid heavy outlines unless focused.

Chips and pills are used extensively for filters, tags, and meta labels. Use `chip` for small status badges like Online or Free, keeping them lightweight and low contrast. Sidebar items should use `sidebar-item` with quiet background treatment and a gentle active state, relying on icon + label hierarchy instead of strong color blocks. Icons should be simple line icons or small filled accents, matching the product’s practical, youth-oriented tone.

## Do's and Don'ts
- Do keep the interface airy with generous white space between major content zones.
- Do use blue as the primary action and emphasis color, with violet only as a supporting accent.
- Do keep typography bold and clear, especially for headings and section labels.
- Do use rounded pills for navigation, search, and primary actions.
- Do rely on light borders and soft tonal panels rather than heavy shadows.
- Don't introduce sharp corners or aggressive angular shapes in core UI elements.
- Don't make cards overly dense; preserve breathing room around thumbnails and metadata.
- Don't use saturated colors outside the established blue-violet-red promotional range.
