## UI Reference Analysis: Apple-Inspired Design Language

**Status:** Analysis of the supplied React component references  
**Purpose:** Record the visual patterns found in the components and define a shared design direction for the application.  
**Scope:** This document analyses the supplied code. It does not replace component behaviour or prescribe a full redesign.

---

## 1. References reviewed

The analysis covers these eight component references:

1. Career / Job Listing Card (`Career3`)
2. Subscription Calendar
3. Trade Summary
4. Integrations Card
5. Meeting Card
6. Compose Email Card
7. Social Post Card (`Card11`)
8. Product Card (`Card12`)

The components use React, Tailwind CSS, Lucide icons, and motion libraries. Some also use shadcn-style UI primitives.

---

## 2. Overall visual direction

Across the references, the strongest shared traits are:

- Neutral backgrounds and surfaces.
- Thin, low-contrast borders.
- Rounded card and control shapes.
- Compact sans-serif typography.
- Clear separation between primary content and metadata.
- Small, restrained icons.
- Subtle hover and interaction states.
- Limited use of semantic accent colors.
- Light and dark surface variants.

Together, these traits point toward a **clean, restrained, Apple-inspired interface**. The aim should be consistency and clarity, not a literal copy of Apple's interfaces.

### Main design principle

Use one shared visual language, but keep different card types suited to their content. A calendar, trade list, social post, and product card should not all use the same internal layout.

---

## 3. Component-by-component analysis

### 3.1 Career / Job Listing Card

**Observed patterns**

- Large rounded outer card (`rounded-3xl`).
- Nested muted surface with inset-style shadows.
- Neutral job-type and category pills.
- Circular briefcase icon container.
- Medium-weight job title.
- Salary and location placed in a compact footer.
- Small, bold details action.
- Department selector uses a pill-shaped segmented control.
- Responsive grid moves from one to multiple columns.

**Visual character**

This card combines a soft, layered surface with a compact information layout. The heading carries the main emphasis, while salary, location, and tags remain secondary.

**Design notes**

- Keep the title and salary easy to scan.
- Use subtle inset treatment only where it adds depth.
- Avoid stacking several strong shadows and borders.
- Keep the segmented control visually related to the card, not like a separate design system.

### 3.2 Subscription Calendar

**Observed patterns**

- Compact panel, approximately 420px wide.
- Large corner radius, around 26px.
- Thin zinc border and white / near-black surface.
- Header contains month, year, Today action, and navigation.
- Add action uses an orange accent and pill shape.
- Add, search, and summary panels appear as overlays.
- Overlay surfaces use blur and high opacity.
- Inputs are compact with rounded corners.
- Summary tiles use small labels and larger values.
- Calendar labels are small and uppercase.
- Selected days use animated states.

**Visual character**

The calendar is dense and utility-focused. It uses a compact scale so that dates and summary data fit within a small panel.

**Design notes**

- Preserve the compact calendar layout.
- Keep date values more prominent than weekday labels.
- Use the orange accent only for the relevant action or financial emphasis.
- Reduce strong glow effects if they compete with the calendar content.
- Make overlays clear and easy to dismiss.

### 3.3 Trade Summary

**Observed patterns**

- Panel around 520px wide.
- Rounded outer container with a thin zinc border.
- White / near-black surface and a soft shadow.
- Trade entries are mainly rows, separated by fine dividers.
- Selected rows use a subtle background and rounded corners.
- Asset names use medium-weight text.
- Metadata is small, uppercase, and tracked.
- Profit and loss values use bold, tabular numerals.
- Green and red communicate positive and negative results.
- Tags and side labels use compact pills.
- Sparkline is small and sits beside trade data.
- Context menu uses a rounded, bordered floating surface.

**Visual character**

This is a data-first component. Its strength is the row layout and clear numeric hierarchy, rather than separate decorative cards for every trade.

**Design notes**

- Keep financial values aligned and easy to compare.
- Use tabular numerals for changing numeric values.
- Keep green and red tied to financial meaning.
- Prefer thin separators over heavy boxes around every row.
- Preserve a clear selected-row state.

### 3.4 Integrations Card

**Observed patterns**

- Panel around 580px wide.
- Rounded outer container with a thin zinc border.
- Header uses a compact title and circular close action.
- Filter and search strip has a muted background.
- Filter controls use small rounded borders.
- Integration rows use bordered icon containers around 40px.
- Titles are medium-weight; descriptions are smaller and muted.
- Availability uses a green badge.
- Tags, triggers, and actions use compact metadata styles.
- Popovers use rounded corners, fine borders, and strong floating elevation.
- Hover states use a subtle background change.

**Visual character**

The card is a searchable directory. It relies on repeated rows, consistent icon placement, and clear text hierarchy.

**Design notes**

- Keep integration icons the same size and alignment.
- Make search and filters feel like one control group.
- Use green only for availability or a clear success state.
- Keep row descriptions readable and avoid excessive metadata density.

### 3.5 Meeting Card

**Observed patterns**

- Outer surface uses a soft gray background (`#F5F5F7`).
- Border is light gray (`#E5E5E5`).
- Outer radius is around 12px.
- White inner body has rounded top corners and a top border.
- Header uses a purple icon container, title, and muted subtitle.
- Participant avatars overlap.
- Expand control is a small bordered button.
- Expanded content uses rows, small icons, labels, and pill tags.
- Footer has a muted background and a top divider.
- Yes / No / Maybe actions are compact pill buttons.
- Toggle uses a short track and animated knob.

**Visual character**

The card has a layered structure: a muted outer shell, a clear inner content area, and a separate footer.

**Design notes**

- Keep the header, body, and footer visually distinct.
- Use the accent icon as a small identity cue.
- Keep participant avatars compact and aligned.
- Use dividers to separate sections without adding more boxes.
- The supplied implementation appears to keep its theme state fixed to light; confirm this before relying on it for dark mode.

### 3.6 Compose Email Card

**Observed patterns**

- Large panel around 580px wide.
- Rounded outer shell, around 24px.
- Thin gray border and soft shadow.
- Muted gray header surface (`#F5F5F7`).
- Header has a compact colored icon, title, and muted controls.
- Inner editor uses a white / dark surface, rounded corners, and a border.
- Editor content is scrollable.
- Fields and controls use compact typography.
- Sender identity appears as a pill with an avatar and subtle border.
- Popovers use small scale, position, and opacity transitions.

**Visual character**

This is a focused workspace inside a larger card. The outer shell frames the editor, while the inner surface keeps the writing area clear.

**Design notes**

- Keep the editor as the main visual focus.
- Use the muted header to distinguish window controls from editing content.
- Keep field labels and controls compact but readable.
- Avoid adding extra card layers inside the editor without a clear need.

### 3.7 Social Post Card (`Card11`)

**Observed patterns**

- Medium-width card with a rounded-xl outer shape.
- Thin border and subtle shadow.
- Header has a 36px circular avatar, 14px profile name, and 12px location.
- Verification mark uses a blue accent.
- Menu action is a 32px circular ghost button.
- Image fills the card width and uses a square aspect ratio.
- Action row uses 36px circular ghost buttons.
- Save action sits at the opposite end of the row.
- Likes count and caption use around 14px text.
- Caption links and hashtags use blue.

**Visual character**

This is an image-first card. The image carries most of the visual weight; the profile and actions should stay quiet.

**Design notes**

- Preserve the full-width image.
- Keep profile information compact.
- Use circular icon actions with consistent hit areas.
- Keep blue for links and verification, not for unrelated decoration.
- Make caption text comfortable to read.

### 3.8 Product Card (`Card12`)

**Observed patterns**

- Medium-width card with rounded-2xl corners.
- Large image area around 288px high.
- Image uses `object-cover`.
- A subtle dark gradient sits over the image.
- Floating heart action uses a translucent surface, border, and backdrop blur.
- Product content sits below the image.
- Metadata appears in compact badges.
- Description uses a relaxed line height.
- Price label is uppercase and small.
- Price value is prominent at around 24px.
- Primary CTA uses a blue accent.

**Visual character**

This is a product-led card. The image and price carry the strongest emphasis, while badges and description provide supporting detail.

**Design notes**

- Keep image treatment consistent across product cards.
- Make the price easy to find.
- Use the floating heart action without making it visually dominant.
- Keep metadata badges secondary to the product title and price.
- Use one clear primary action.

---

## 4. Shared patterns across the references

| Area | Pattern found | Shared direction |
|---|---|---|
| Surfaces | White, gray, zinc, and near-black surfaces | Use a small set of neutral surface levels |
| Borders | Mostly thin gray / zinc borders | Use subtle 1px borders |
| Corners | Rounded cards, controls, and pills | Define a small radius scale |
| Typography | Compact sans-serif text with clear weight changes | Use a consistent type hierarchy |
| Metadata | Small muted labels and badges | Keep metadata secondary |
| Icons | Lucide-style outline icons | Standardise size and stroke |
| Actions | Ghost, pill, and compact primary buttons | Define shared button variants |
| States | Subtle hover, selected, and semantic states | Make states clear but restrained |
| Motion | Short opacity, position, and spring transitions | Animate only useful feedback |
| Themes | Light and dark surface variants | Define both themes deliberately |

---

## 5. Two card families

The references should be grouped by content type, not forced into one universal card template.

### A. Information and utility cards

References:
- Subscription Calendar
- Trade Summary
- Integrations Card
- Meeting Card
- Compose Email Card

Common traits:
- Data and actions take priority.
- Content uses rows, sections, and dividers.
- Metadata is compact.
- Surface layers help group related controls.
- Readability matters more than imagery.

### B. Visual and discovery cards

References:
- Career / Job Listing Card
- Social Post Card
- Product Card

Common traits:
- A title, image, or key value creates the visual focus.
- Metadata supports the main content.
- Actions are easy to find.
- Layout can use a stronger image or identity area.

Both families should share colors, typography, radii, borders, shadows, and control styles.

---

## 6. Initial design token proposal

The values below are a starting proposal based on the supplied references and the desired Apple-inspired direction. They are not exact values extracted from every component.

### 6.1 Typography

| Token | Proposed value | Use |
|---|---:|---|
| `--font-xs` | 11px | Secondary metadata |
| `--font-sm` | 12px | Labels and compact controls |
| `--font-base` | 14px | Main body text |
| `--font-md` | 16px | Card titles and emphasis |
| `--font-lg` | 20px | Section headings |
| `--font-xl` | 24px | Main headings and key values |

Use 10px text only for dense metadata where space requires it. Avoid making 8px or 9px text a common default.

Suggested weights:
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

Suggested system font stack:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### 6.2 Light theme colors

| Token | Proposed value | Use |
|---|---|---|
| `--background` | `#FFFFFF` | Main page surface |
| `--surface` | `#FFFFFF` | Cards and panels |
| `--surface-muted` | `#F5F5F7` | Secondary areas |
| `--surface-hover` | `#F2F2F4` | Hover state |
| `--border` | `#E5E5EA` | Standard border |
| `--border-strong` | `#D2D2D7` | Stronger separation |
| `--text-primary` | `#1D1D1F` | Main text |
| `--text-secondary` | `#6E6E73` | Supporting text |
| `--text-tertiary` | `#8E8E93` | Low-priority labels |
| `--accent` | `#007AFF` | Primary action and links |
| `--success` | `#34C759` | Positive state |
| `--danger` | `#FF3B30` | Error and negative state |
| `--warning` | `#FF9F0A` | Warning state |

These are proposed shared tokens. The source components also use local accents such as purple and orange. Retain those only where they serve a clear component purpose.

### 6.3 Dark theme direction

Use layered dark neutrals rather than pure black everywhere.

Suggested starting values:

| Token | Proposed value |
|---|---|
| `--background` | `#111113` |
| `--surface` | `#1C1C1E` |
| `--surface-muted` | `#2C2C2E` |
| `--surface-hover` | `#38383A` |
| `--border` | `#38383A` |
| `--border-strong` | `#48484A` |
| `--text-primary` | `#F5F5F7` |
| `--text-secondary` | `#A1A1A6` |
| `--text-tertiary` | `#8E8E93` |

Check contrast and semantic colors in both themes before release.

### 6.4 Radius scale

| Token | Proposed value | Use |
|---|---:|---|
| `--radius-sm` | 8px | Small controls and badges |
| `--radius-md` | 12px | Inputs and buttons |
| `--radius-lg` | 16px | Standard cards |
| `--radius-xl` | 20px | Large panels |
| `--radius-2xl` | 24px | Main windows and large cards |
| `--radius-pill` | 9999px | Pills and circular controls |

The references use a range of radii from 12px to around 26px. The token scale keeps that range controlled.

### 6.5 Spacing scale

Use a 4px base unit:

`4, 8, 12, 16, 20, 24, 32, 40, 48px`

Use the same scale for card padding, section gaps, row spacing, and control groups where possible.

### 6.6 Shadows

Use restrained elevation:

```css
--shadow-card:
  0 1px 2px rgba(0, 0, 0, 0.04),
  0 4px 12px rgba(0, 0, 0, 0.04);

--shadow-popover:
  0 8px 24px rgba(0, 0, 0, 0.12);

--shadow-modal:
  0 16px 48px rgba(0, 0, 0, 0.16);
```

Treat these as starting values. Tune dark-mode elevation separately.

---

## 7. Shared component rules

### Cards

- Use a neutral surface.
- Use a subtle border.
- Use a radius from the shared scale.
- Use consistent internal padding.
- Reserve shadows for cards that need separation.
- Avoid multiple nested card shells unless the content needs them.

### Buttons

Define these variants:
- Primary
- Secondary
- Ghost
- Destructive
- Icon-only

Each variant needs:
- Default state.
- Hover state.
- Pressed state.
- Focus-visible state.
- Disabled state.
- Loading state, where relevant.

### Icon buttons

- Use consistent hit areas.
- Prefer 32px to 36px for compact controls.
- Use 16px to 20px icons.
- Keep icon alignment centered.
- Give icon-only actions an accessible label.

### Inputs

- Use a consistent height and radius.
- Use a low-contrast border.
- Keep placeholder text muted.
- Make focus states visible.
- Keep labels readable.
- Do not rely on color alone to show errors.

### Badges

Create neutral, accent, success, warning, and danger variants.

- Keep labels short.
- Use compact padding.
- Avoid too many badge colors in one component.
- Use semantic colors only when they communicate a state or category.

### Dividers

Use thin, low-contrast separators between rows and sections. Avoid adding a border around every individual content block.

---

## 8. Motion and interaction

The supplied components use Motion / Framer Motion for overlays, expanding content, selected states, and small transitions.

Shared motion guidance:

- Standard control transitions: 150–250ms.
- Prefer opacity and small position changes.
- Use spring motion for meaningful expand/collapse interactions.
- Avoid large scale changes.
- Avoid glow effects on ordinary controls.
- Respect `prefers-reduced-motion`.

Motion should explain a state change, not decorate the interface.

---

## 9. Responsive behaviour

The references include responsive grids and compact panels. Apply these rules across the application:

- Use one-column layouts on narrow screens.
- Add columns as space allows.
- Prevent horizontal overflow.
- Allow long titles and descriptions to wrap.
- Keep important actions reachable.
- Preserve usable touch targets.
- Keep images at intentional aspect ratios.
- Do not shrink dense desktop layouts until text becomes unreadable.

---

## 10. Implementation guidance

The references use React and Tailwind CSS. Some use shadcn-style primitives, Lucide icons, and Motion libraries.

Recommended shared structure:

```text
src/
  styles/
    tokens.css
    theme.css
  components/
    ui/
      Button.tsx
      Card.tsx
      Badge.tsx
      Input.tsx
      IconButton.tsx
      Toggle.tsx
      Dropdown.tsx
      Tabs.tsx
  lib/
    utils.ts
```

Use CSS variables for shared design decisions. Use Tailwind for layout and component-level styling.

Example token setup:

```css
:root {
  --background: #ffffff;
  --surface: #ffffff;
  --surface-muted: #f5f5f7;
  --surface-hover: #f2f2f4;

  --border: #e5e5ea;
  --border-strong: #d2d2d7;

  --text-primary: #1d1d1f;
  --text-secondary: #6e6e73;
  --text-tertiary: #8e8e93;

  --accent: #007aff;
  --success: #34c759;
  --danger: #ff3b30;
  --warning: #ff9f0a;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-pill: 9999px;
}

.dark {
  --background: #111113;
  --surface: #1c1c1e;
  --surface-muted: #2c2c2e;
  --surface-hover: #38383a;

  --border: #38383a;
  --border-strong: #48484a;

  --text-primary: #f5f5f7;
  --text-secondary: #a1a1a6;
  --text-tertiary: #8e8e93;
}
```

Do not change component logic, data models, or event handlers just to apply visual styles.

---

## 11. What to preserve from the references

| Component | Preserve |
|---|---|
| Career Card | Job information hierarchy, salary/location footer, department selector |
| Subscription Calendar | Compact calendar, summary tiles, date selection, overlays |
| Trade Summary | Row-based trade layout, tabular values, P&L colors, sparklines |
| Integrations Card | Search/filter strip, icon-led rows, availability state |
| Meeting Card | Header/body/footer structure, participant avatars, response actions |
| Compose Email Card | Muted window header, focused editor surface, sender identity chip |
| Social Post Card | Full-width image, compact profile header, circular action row |
| Product Card | Large product image, floating save action, prominent price and CTA |

---

## 12. What to avoid

- Heavy shadows on every card.
- Too many nested rounded containers.
- Random radius values.
- Too many accent colors.
- Tiny text used for important information.
- Unnecessary gradients.
- Glass effects on every surface.
- Large glowing buttons.
- Inconsistent icon sizes.
- Different input styles on different screens.
- Decorative animation without a clear purpose.
- One universal card layout for every type of content.

---

## 13. Final design direction

The supplied references suggest a shared design language built around:

1. Neutral surfaces.
2. Thin borders.
3. Controlled corner radii.
4. Clear typography.
5. Compact but readable metadata.
6. Consistent icon sizing.
7. Restrained semantic accents.
8. Subtle elevation.
9. Useful motion.
10. Deliberate light and dark themes.

The application should feel like one product even when its components serve different jobs.
