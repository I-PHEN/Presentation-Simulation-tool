# Explorer 2 Analysis Report: Design System, CSS Tokens & Studio Glassmorphism Integration Strategy

## Executive Summary
This analysis explores the design system of Presentation Sparring Partner (`sparring-partner`), focusing on `src/app/globals.css`, `tailwind.config.ts`, existing dark/light mode CSS variable tokens, surface colors, border styles, and backdrop-blur glass utilities.

The application uses **Tailwind CSS v4** (`@tailwindcss/postcss: ^4`, `@import "tailwindcss";`) combined with Next.js 16, React 19, and `next-themes` for class-based dark mode (`.dark`).

This report provides a complete token audit and a clean, zero-breakage strategy for adding **Studio Glassmorphism tokens** (backdrop-blur glass panels, specular border reflections, and dark/light surface tokens).

---

## 1. Design System Architecture & Config Audit

### 1.1 Key Styling Files
- **`src/app/globals.css`**: The central design system entry point.
  - Line 1: `@import "tailwindcss";`
  - Line 2: `@import "tw-animate-css";`
  - Line 4: `@custom-variant dark (&:is(.dark *));`
  - Lines 6–50: `@theme inline` block mapping CSS custom properties to Tailwind CSS v4 design tokens.
  - Lines 52–89: `:root` light mode CSS variable definitions.
  - Lines 91–129: `.dark` dark mode CSS variable definitions.
  - Lines 144–190: `@layer components` definitions for `.glass-panel`, `.dark .glass-panel`, `.glass-card`, `.dark .glass-card`, and `.ambient-glow`.
- **`tailwind.config.ts`**: Tailwind CSS configuration file.
  - Defines `darkMode: "class"`.
  - Defines fallback/legacy theme extensions mapping `hsl(var(--...))` CSS variables for shadcn UI component compatibility.
  - Content paths currently set to: `./pages/**/*.{js,ts,jsx,tsx,mdx}`, `./components/**/*.{js,ts,jsx,tsx,mdx}`, `./app/**/*.{js,ts,jsx,tsx,mdx}`. Note: Code is located under `src/`, so `./src/**/*.{js,ts,jsx,tsx,mdx}` should be explicitly included.
- **`components.json`**: shadcn UI configuration file (style: `new-york`, rsc: `true`, tailwind css: `src/app/globals.css`).

---

## 2. Existing Token Audit (Dark & Light Mode)

### 2.1 CSS Custom Property Mapping Table

| Token Name | Light Mode (`:root`) | Dark Mode (`.dark`) | Purpose / Component Context |
| :--- | :--- | :--- | :--- |
| `--background` | `#FBFBFD` | `#08090C` | Root page background (Flat ink in dark mode) |
| `--foreground` | `#14161B` | `#E7EAF0` | Primary high-contrast text color |
| `--surface` | `#F4F5F8` | `#0C0E12` | Secondary surface background (Cards/lists) |
| `--surface-foreground` | `#14161B` | `#E7EAF0` | Surface text color |
| `--card` | `#FFFFFF` | `#101217` | Card background surface |
| `--card-foreground` | `#14161B` | `#E7EAF0` | Card text color |
| `--popover` | `#FFFFFF` | `#171A20` | Floating popovers & dropdowns |
| `--popover-foreground` | `#14161B` | `#E7EAF0` | Popover text color |
| `--primary` | `#3E5FD9` | `#4C8DFF` | Primary action / brand blue |
| `--primary-foreground` | `#F8FAFF` | `#08090C` | Text on primary buttons |
| `--secondary` | `#F4F5F8` | `#0C0E12` | Secondary actions / badges |
| `--secondary-foreground` | `#14161B` | `#E7EAF0` | Text on secondary buttons |
| `--muted` | `#F4F5F8` | `#161920` | Muted backgrounds |
| `--muted-foreground` | `#5B616E` | `#868D99` | Subtitle / placeholder text |
| `--accent` | `#EDF1FE` | `#141F33` | Active / focused item highlight background |
| `--accent-foreground` | `#29429C` | `#A6C6FF` | Text on accent backgrounds |
| `--destructive` | `#DC2626` | `#E5484D` | Danger / error state color |
| `--border` | `#E5E7EE` | `#282C35` | Standard structural borders |
| `--input` | `#E5E7EE` | `#282C35` | Form input borders |
| `--ring` | `#3E5FD9` | `#4C8DFF` | Focus ring outline |
| `--sidebar` | `#F7F8FB` | `#060709` | Navigation sidebar background |
| `--sidebar-border` | `#E5E7EE` | `#20242C` | Sidebar border |
| `--warning` | `#B45309` | `#D9822B` | Warning state color |
| `--success` | `#15803D` | `#3FB950` | Success state color |
| `--elev-1` | `0 1px 2px -1px rgb(0 0 0/.08)...` | `none` | Subtle resting elevation |
| `--elev-2` | `0 6px 16px -6px rgb(0 0 0/.12)` | `0 8px 24px -12px rgb(0 0 0/.6)` | Medium floating card shadow |
| `--elev-3` | `0 18px 40px -12px rgb(0 0 0/.18)` | `0 16px 40px -16px rgb(0 0 0/.7)` | Modal / toolbar floating shadow |

---

## 3. Existing Glassmorphism & Translucency Audit

### 3.1 Hardcoded Component Classes (`globals.css`)
Currently, `globals.css` defines two custom glass classes under `@layer components`:

1. **`.glass-panel`**:
   - **Light**: `background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(229, 231, 238, 0.6);`
   - **Dark**: `background: rgba(16, 18, 23, 0.7); backdrop-filter: blur(14px); border: 1px solid rgba(40, 44, 53, 0.6);`
   - **Used in**: `AudiencePanel.tsx` (row items).

2. **`.glass-card`**:
   - **Light**: `background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(229, 231, 238, 0.8); shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);`
   - **Dark**: `background: rgba(16, 18, 23, 0.8); backdrop-filter: blur(16px); border: 1px solid rgba(40, 44, 53, 0.7); shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.5);`
   - **Used in**: `readiness-desk.tsx` (aside panel).

3. **`.ambient-glow`**:
   - Radial gradient (`circle at 50% 50%, var(--primary), transparent 70%`), `opacity: 0.15` (Light) / `0.22` (Dark), `filter: blur(24px)` (Light) / `blur(32px)` (Dark).
   - **Used in**: `SimulatorRoom.tsx` (behind stage).

### 3.2 In-Line Backdrop Blur Usages Across Components
- `SimulatorRoom.tsx`: `bg-background/80 backdrop-blur-xl` and `bg-background/85 backdrop-blur-xl` (ready / ended modal overlays).
- `SlideStage.tsx`: `bg-background/80 backdrop-blur` (slide counter badge).
- `StageCaption.tsx`: `bg-popover/95 backdrop-blur-sm` (caption overlay).
- `rehearsal-room.tsx`: `bg-background/80 backdrop-blur` (header and footer bars), `before:bg-gradient-to-r before:from-transparent before:via-primary before:to-transparent` (top border reflection line).
- `present-section.tsx` & `qna-section.tsx`: `bg-[#0a0a0c]/90 backdrop-blur-sm`, `bg-[#0c0c0e]/95 backdrop-blur-xl`, `bg-[#111113]/95 backdrop-blur-xl`, `bg-[#09090b]/95 backdrop-blur-xl`.

---

## 4. Studio Glassmorphism Integration Strategy

### 4.1 Identified Gaps in Current System
1. **Hardcoded Glass Values**: Glass background colors (`rgba(255,255,255,0.7)`, `rgba(16,18,23,0.7)`) and border colors are hardcoded inside CSS rules rather than exposed as reusable CSS custom properties.
2. **Missing Specular Reflection Token**: No formal token or utility class exists for subtle top/edge border light reflections (a core element of Studio Glassmorphism aesthetics).
3. **Tailwind v4 Theme Registration**: Glass properties are not registered under `@theme inline` in `globals.css`, preventing inline utility usage like `bg-glass-panel` or `border-glass`.
4. **Tailwind Content Path**: `tailwind.config.ts` content array lacks `./src/**/*.{js,ts,jsx,tsx,mdx}`.

### 4.2 Proposed Studio Glassmorphism CSS Tokens
To maintain 100% backward compatibility while empowering new and refactored components, we propose adding the following CSS tokens in `src/app/globals.css`:

#### A. CSS Custom Properties (`:root` and `.dark`)

```css
:root {
  /* Studio Glassmorphism Tokens - Light Mode */
  --glass-bg: rgba(255, 255, 255, 0.70);
  --glass-bg-hover: rgba(255, 255, 255, 0.82);
  --glass-bg-card: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(229, 231, 238, 0.60);
  --glass-border-subtle: rgba(229, 231, 238, 0.40);
  --glass-border-strong: rgba(229, 231, 238, 0.85);
  --glass-reflection: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 50%);
  --glass-reflection-top: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%);
  --glass-blur: 16px;
  --glass-blur-panel: 12px;
  --glass-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
}

.dark {
  /* Studio Glassmorphism Tokens - Dark Mode */
  --glass-bg: rgba(16, 18, 23, 0.70);
  --glass-bg-hover: rgba(22, 25, 33, 0.80);
  --glass-bg-card: rgba(16, 18, 23, 0.80);
  --glass-border: rgba(40, 44, 53, 0.60);
  --glass-border-subtle: rgba(40, 44, 53, 0.35);
  --glass-border-strong: rgba(40, 44, 53, 0.80);
  --glass-reflection: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 50%);
  --glass-reflection-top: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.18) 50%, transparent 100%);
  --glass-blur: 16px;
  --glass-blur-panel: 14px;
  --glass-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.5);
}
```

#### B. Tailwind v4 Theme Registration (`@theme inline` in `globals.css`)
```css
@theme inline {
  /* Existing mappings ... */
  --color-glass-bg: var(--glass-bg);
  --color-glass-bg-hover: var(--glass-bg-hover);
  --color-glass-card: var(--glass-bg-card);
  --color-glass-border: var(--glass-border);
  --color-glass-border-subtle: var(--glass-border-subtle);
  --color-glass-border-strong: var(--glass-border-strong);
  --shadow-glass: var(--glass-shadow);
}
```

#### C. Refactored Component Utility Classes (`@layer components`)
```css
@layer components {
  .glass-panel {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur-panel));
    -webkit-backdrop-filter: blur(var(--glass-blur-panel));
    border: 1px solid var(--glass-border);
  }

  .glass-card {
    background: var(--glass-bg-card);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border-strong);
    box-shadow: var(--glass-shadow);
  }

  /* Specular light reflection on top edge of glass container */
  .glass-reflection-top {
    position: relative;
  }
  .glass-reflection-top::before {
    content: "";
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 1px;
    background: var(--glass-reflection-top);
    pointer-events: none;
  }

  /* Ambient Glow Refinement */
  .ambient-glow {
    position: absolute;
    inset: -12px;
    border-radius: 1.5rem;
    background: radial-gradient(circle at 50% 50%, var(--primary), transparent 70%);
    opacity: 0.15;
    filter: blur(24px);
    pointer-events: none;
    transition: opacity 0.5s ease, filter 0.5s ease;
  }

  .dark .ambient-glow {
    opacity: 0.22;
    filter: blur(32px);
  }
}
```

---

## 5. Non-Breaking Implementation Safeguards
1. **Existing Base Variables Unchanged**: Standard CSS variables (`--background`, `--foreground`, `--card`, `--primary`, `--border`) remain identical so no default shadcn component or layout is broken.
2. **Backward Compatible Class Names**: Existing `.glass-panel`, `.glass-card`, and `.ambient-glow` class names are refactored to use the new tokens internally. All existing usages across `AudiencePanel`, `readiness-desk`, etc. immediately benefit from token consistency without code alterations.
3. **Tailwind Config Content Extension**: Adding `./src/**/*.{js,ts,jsx,tsx,mdx}` to `tailwind.config.ts` content array ensures full JIT scanner coverage for all `src/` subdirectories.

---

## 6. Implementation Checklist for Milestone 2
- [ ] Add Studio Glassmorphism CSS custom properties to `:root` and `.dark` in `src/app/globals.css`.
- [ ] Register glass color & shadow variables in `@theme inline` in `src/app/globals.css`.
- [ ] Update `@layer components` in `src/app/globals.css` with tokenized `.glass-panel`, `.glass-card`, `.glass-reflection-top`, and `.ambient-glow`.
- [ ] Update `tailwind.config.ts` content array to include `./src/**/*.{js,ts,jsx,tsx,mdx}`.
- [ ] Run `npx vitest run` and `npm run build` to verify clean compilation.
