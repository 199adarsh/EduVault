# EduVault Design System

## Design Direction

Premium, minimal, and content-first.
Inspired by Apple’s visual language:

* Neutral base colors
* Very subtle accent color use
* Soft borders instead of heavy outlines
* Gentle shadows
* Rounded corners
* Strong typography hierarchy
* Spacious layout with lots of breathing room

---

## Color System

### Light Theme

#### Backgrounds

* **Background**: `#F5F5F7`
* **Surface**: `#FFFFFF`
* **Surface Secondary**: `#FBFBFD`
* **Surface Elevated**: `#FFFFFF`

#### Text

* **Primary Text**: `#1D1D1F`
* **Secondary Text**: `#6E6E73`
* **Tertiary Text**: `#8E8E93`

#### Borders

* **Border Light**: `#E5E5EA`
* **Border Strong**: `#D2D2D7`

#### Accent

* **Primary**: `#0071E3`
* **Primary Hover**: `#005BB5`
* **Primary Active**: `#004494`
* **Primary Foreground**: `#FFFFFF`

#### Semantic

* **Success**: `#34C759`
* **Warning**: `#FF9F0A`
* **Error**: `#FF3B30`
* **Info**: `#007AFF`

---

### Dark Theme

#### Backgrounds

* **Background**: `#000000`
* **Surface**: `#1C1C1E`
* **Surface Secondary**: `#2C2C2E`
* **Surface Elevated**: `#242426`

#### Text

* **Primary Text**: `#FFFFFF`
* **Secondary Text**: `#AEAEB2`
* **Tertiary Text**: `#8E8E93`

#### Borders

* **Border Light**: `#2C2C2E`
* **Border Strong**: `#3A3A3C`

#### Accent

* **Primary**: `#0A84FF`
* **Primary Hover**: `#409CFF`
* **Primary Active**: `#0066CC`
* **Primary Foreground**: `#FFFFFF`

#### Semantic

* **Success**: `#30D158`
* **Warning**: `#FFD60A`
* **Error**: `#FF453A`
* **Info**: `#64D2FF`

---

## Typography

* **Primary Font**: `Inter, sans-serif`
* **Preferred Alternative**: `SF Pro Display, Inter, sans-serif`

### Type Scale

* **Display**: 48px / 56px / 700
* **H1**: 36px / 44px / 700
* **H2**: 28px / 36px / 600
* **H3**: 22px / 30px / 600
* **Body**: 16px / 24px / 400
* **Body Small**: 14px / 20px / 400
* **Caption**: 12px / 16px / 500
* **Label**: 11px / 14px / 600

### Typography Rules

* Use large headings sparingly.
* Keep body text highly readable.
* Avoid all caps except small labels or metadata.
* Use medium and semibold weights instead of bold everywhere.

---

## Layout

* **Max Content Width**: `1440px`
* **Page Padding**: `24px` desktop, `16px` mobile
* **Section Spacing**: `32px` to `48px`
* **Card Spacing**: `16px` to `24px`
* **Internal Card Padding**: `20px` to `28px`

### Principles

* Prefer whitespace over separators.
* Keep sections visually grouped.
* Avoid crowded dashboards.
* Use consistent alignment and rhythm.

---

## Border Radius

* **Small**: `8px`
* **Medium**: `12px`
* **Large**: `16px`
* **Extra Large**: `20px`
* **Pill**: `999px`

---

## Shadows

### Light Theme

```css
0 1px 2px rgba(0, 0, 0, 0.04),
0 8px 24px rgba(0, 0, 0, 0.06)
```

### Dark Theme

```css
0 1px 2px rgba(0, 0, 0, 0.35),
0 12px 28px rgba(0, 0, 0, 0.28)
```

### Usage

* Shadows should be subtle.
* Never use harsh black shadows.
* Elevation should feel soft and premium.

---

## Cards

### Standard Card

* Background should match the theme surface.
* Border should be 1px and subtle.
* Radius should be 16px.
* Hover state should slightly raise the card.

### Card Style

```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: 16px;
box-shadow: var(--card-shadow);
```

### Card Rules

* No heavy gradients.
* No neon glows.
* Keep content the focus.
* Use icons only when they add meaning.

---

## Buttons

### Primary Button

* Solid accent color
* White text
* Soft radius
* Smooth hover transition

### Secondary Button

* Neutral background
* Border only
* Text matches primary text

### Ghost Button

* Transparent background
* Used for low-emphasis actions

### Button Rules

* One strong action per view.
* Avoid too many button colors.
* Keep button styling consistent across the app.

---

## Inputs

* Rounded corners
* Soft borders
* Clear focus ring
* Minimal placeholder styling

### Input Style

```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: 12px;
padding: 12px 14px;
```

### Focus State

* Use accent border or a subtle glow.
* Never make focus states noisy.

---

## Glass / Blur Effects

Use blur only in headers, floating toolbars, or overlays.

```css
backdrop-filter: blur(20px);
background: rgba(255, 255, 255, 0.72);
```

For dark mode:

```css
backdrop-filter: blur(20px);
background: rgba(28, 28, 30, 0.72);
```

### Rules

* Blur should be subtle.
* Do not overuse glass panels.
* Content must remain readable.

---

## Icons

* Use clean, simple line icons.
* Keep icon style consistent.
* Use icons only where they help scanning.
* Avoid mixing many icon styles.

---

## Motion

* **Transition Duration**: `180ms` to `240ms`
* **Easing**: `ease-out`
* **Hover Scale**: `1.01` to `1.02`
* **Pressed Scale**: `0.98`

### Motion Rules

* Keep motion smooth and understated.
* No bouncy or playful animation.
* Animate only what improves clarity.

---

## Scrollbars

* Thin
* Minimal contrast
* Visible only when needed

### Scrollbar Style

* Track: neutral surface color
* Thumb: slightly darker neutral
* Hover: a touch more visible

---

## Visual Principles

### Do

* Use one accent color
* Use neutral surfaces
* Keep layouts airy
* Use typography as the main hierarchy
* Make interaction states subtle but clear

### Do Not

* Use many bright colors
* Use thick borders
* Use aggressive shadows
* Use overly decorative gradients
* Crowd the UI with too many elements

---

## EduVault Usage Notes

EduVault should feel:

* calm
* premium
* focused
* modern
* easy to scan

Best suited for:

* cards with soft elevation
* clean tables
* subtle status indicators
* minimal charts
* strong spacing and alignment

This design system should make EduVault feel closer to a polished Apple-style product than a heavy dashboard.
