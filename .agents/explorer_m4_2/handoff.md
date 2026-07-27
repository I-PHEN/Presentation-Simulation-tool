# Ambient Glow & Backlight CSS Tokens Analysis (Milestone 4)

## 1. Observation

### 1.1 Existing CSS Architecture & Tokens
In `src/app/globals.css`:
- **Tailwind Setup (v4)**: Uses `@import "tailwindcss"; @import "tw-animate-css"; @custom-variant dark (&:is(.dark *)); @theme inline { ... }` (lines 1-54).
- **Light Mode (`:root`)** (lines 56-97):
  - `--background`: `#FBFBFD`
  - `--surface`: `#F4F5F8`
  - `--card`: `#FFFFFF`
  - `--primary`: `#3E5FD9` (Cobalt blue)
  - `--border`: `#E5E7EE`
  - `--elev-1`: `0 1px 2px -1px rgb(0 0 0/.08), 0 1px 3px rgb(0 0 0/.06)`
  - `--elev-2`: `0 6px 16px -6px rgb(0 0 0/.12)`
  - `--elev-3`: `0 18px 40px -12px rgb(0 0 0/.18)`
  - `--glass-bg`: `rgba(255, 255, 255, 0.7)`
  - `--glass-shadow`: `0 8px 32px 0 rgba(0, 0, 0, 0.08)`
- **Dark Mode (`.dark`)** (lines 99-141):
  - `--background`: `#08090C` (Ink: near-black, flat. Definition comes from borders + surface steps)
  - `--surface`: `#0C0E12`
  - `--card`: `#101217`
  - `--primary`: `#4C8DFF` (Lighter cobalt blue)
  - `--border`: `#282C35`
  - `--elev-1`: `none` (Resting surfaces are flat)
  - `--elev-2`: `0 8px 24px -12px rgb(0 0 0/.6)`
  - `--elev-3`: `0 16px 40px -16px rgb(0 0 0/.7)`
  - `--glass-bg`: `rgba(15, 23, 42, 0.7)`
  - `--glass-shadow`: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`

- **Current Ambient Glow Classes in `globals.css`** (lines 186-200):
  ```css
  .ambient-glow {
    position: absolute;
    inset: -12px;
    border-radius: 1.5rem;
    background: radial-gradient(circle at 50% 50%, var(--primary), transparent 70%);
    opacity: 0.15;
    filter: blur(24px);
    pointer-events: none;
    transition: opacity 0.5s ease;
  }

  .dark .ambient-glow {
    opacity: 0.22;
    filter: blur(32px);
  }
  ```

- **Current Usage in `SimulatorRoom.tsx`** (lines 107-114):
  ```tsx
  {/* Dynamic Ambient Backlight Glow */}
  <div
    className={cn(
      'ambient-glow transition-all duration-700',
      engine.speakingPersonaId ? 'opacity-30 scale-105' : engine.micActive ? 'opacity-20' : 'opacity-10',
    )}
    aria-hidden="true"
  />
  ```

- **Current Usage in `SlideStage.tsx`** (lines 17-25):
  ```tsx
  <section aria-label="Active presentation slide" className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
    <div className="relative flex h-full w-fit min-w-0 max-w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
      <AuthenticatedSlideImage source={slide.imageUrl} alt={`Slide ${position + 1}: ${slide.text}`} className="h-full w-auto max-w-full object-contain" />
      <span className="absolute right-3 top-3 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] backdrop-blur">
        {String(position + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </div>
  </section>
  ```

- **Tailwind Configuration (`tailwind.config.ts`)**:
  Maps `colors` (background, foreground, card, primary, secondary, muted, accent, destructive, border, ring, sidebar, chart) and `borderRadius` to CSS variables.

---

## 2. Logic Chain

### 2.1 Dynamic Slide Color & Token Variable Fallback
1. **Observation**: `.ambient-glow` in `globals.css:190` hardcodes `background: radial-gradient(circle at 50% 50%, var(--primary), transparent 70%)`.
2. **Deduction**: When dynamic slide palette extraction (Milestone 4) provides a dominant color (e.g. hex `#8B5CF6`, `#10B981`, or `rgb(...)`), the CSS gradient must read an overridable CSS custom property without breaking fallback behavior when no custom color is supplied.
3. **Conclusion**: Standardize an ambient glow color variable `--ambient-glow-color`.
   - Utility gradient definition:
     `background: radial-gradient(circle at 50% 50%, var(--ambient-glow-color, var(--primary)), transparent 70%);`
   - Setting `style={{ '--ambient-glow-color': dominantColor } as React.CSSProperties}` on the backdrop container seamlessly updates the backlight to match active slide palette, falling back to `--primary` cobalt when unspecified.

### 2.2 Presenter State Visual Modulation
1. **Observation**: `SimulatorRoom.tsx:111` currently toggles generic tailwind utility classes (`opacity-30 scale-105` vs `opacity-20` vs `opacity-10`) based on `engine.speakingPersonaId` and `engine.micActive`.
2. **Deduction**: Presenter interaction in the simulator consists of four distinct states that require dedicated visual treatment:
   - **Idle / Resting**: User silent, panel quiet. Calm, unobtrusive background presence.
     - Light mode: `opacity: 0.10`, `filter: blur(24px)`.
     - Dark mode: `opacity: 0.14`, `filter: blur(36px)`.
   - **User Speaking / Presenting** (`engine.micActive` & user active speech): Warm vocal response.
     - Light mode: `opacity: 0.22`, `scale: 1.04`, subtle breathing animation (`ambient-pulse` keyframe).
     - Dark mode: `opacity: 0.28`, `scale: 1.05`, subtle breathing animation.
   - **Panel / Examiner Interjecting** (`engine.speakingPersonaId !== null`): Panel interjection / asking question.
     - Light mode: `opacity: 0.30`, `scale: 1.08`, energetic pulse animation (`ambient-pulse-fast` keyframe).
     - Dark mode: `opacity: 0.38`, `scale: 1.10`, energetic pulse animation.
   - **Ready / Intro Phase**: Opening greeting stage.
     - Gentle steady glow (`opacity: 0.18`, `scale: 1.02`).

### 2.3 Light Mode vs Dark Mode Design Token Compliance
1. **Observation**: `globals.css:100` specifies for dark mode: *"Ink: near-black, flat. Definition comes from borders + surface steps, never glow. Resting surfaces are flat; only overlays get a neutral (never colored) shadow."*
2. **Deduction**:
   - In **Light Mode** (`#FBFBFD` canvas): Backlight glows must remain restrained (`opacity: 0.10` to `0.28`). If opacity exceeds `0.30` in light mode, it creates dirty/muddy halo artifacts on light backgrounds.
   - In **Dark Mode** (`#08090C` canvas): Dark backgrounds absorb light, so a slightly higher opacity (`0.14` to `0.38`) and wider blur radius (`36px` to `48px`) are required to prevent the glow from appearing pinprick or harsh. Crucially, the glow must remain behind the canvas (`pointer-events: none`, `z-0` or negative inset) and not pollute card borders or text contrast.
   - **Slide Canvas Shadow**: In Light mode, white slide cards (`#FFFFFF`) need crisp separation from `#FBFBFD` background. Use `--elev-2` (`shadow-e2` -> `0 6px 16px -6px rgb(0 0 0/.12)`) or `--elev-3` (`shadow-e3`) in maximized view. In Dark mode, `shadow-e2` maps to `0 8px 24px -12px rgb(0 0 0/.6)` neutral drop-shadow.

### 2.4 Backdrop Blur, Soft Drop-Shadow, & Reduced Motion
1. **Backdrop Blur**: The stage caption band and slide position badge use `backdrop-blur-md` with `bg-background/80` or `var(--glass-bg)` (`rgba(255, 255, 255, 0.7)` light / `rgba(15, 23, 42, 0.7)` dark), backed by `inset 0 1px 0 0 var(--glass-reflection-top)` for crisp glassmorphism.
2. **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)` (already active in `globals.css:209-214`), animation durations are set to `.01ms !important`. Pulse keyframes are bypassed, ensuring full accessibility compliance.

---

## 3. Caveats

1. **Read-Only Investigation Scope**: As an Explorer agent, no direct changes were made to source files. The design recommendations provided below are ready for implementation by the implementer agent (`implementer_m4_1`).
2. **Color Contrast & Format Handling**: When injecting dynamic slide palette colors, CSS `radial-gradient` works best with valid CSS color strings (Hex, RGB, HSL). If hex colors are extracted from images, passing them directly to `--ambient-glow-color` will function seamlessly without extra parsing.
3. **Maximization State**: When `SimulatorRoom` is maximized (`fullscreen`), the glow inset should expand from `-16px` to `-24px` to match the borderless viewport scale.

---

## 4. Conclusion & Concrete Recommendations

### 4.1 Recommended Additions to `src/app/globals.css`

Extend `.ambient-glow` and introduce presenter state tokens and keyframe animations in `globals.css`:

```css
/* --- Ambient Glow Tokens & Presenter State Keyframes --- */
@keyframes ambient-pulse {
  0% {
    opacity: var(--ambient-glow-user-opacity, 0.20);
    transform: scale(1.03);
  }
  100% {
    opacity: calc(var(--ambient-glow-user-opacity, 0.20) * 1.25);
    transform: scale(1.06);
  }
}

@keyframes ambient-pulse-fast {
  0% {
    opacity: var(--ambient-glow-panel-opacity, 0.28);
    transform: scale(1.05);
  }
  100% {
    opacity: calc(var(--ambient-glow-panel-opacity, 0.28) * 1.30);
    transform: scale(1.09);
  }
}

@layer components {
  .ambient-glow {
    position: absolute;
    inset: -16px;
    border-radius: 1.5rem;
    background: radial-gradient(
      circle at 50% 50%,
      var(--ambient-glow-color, var(--primary)) 0%,
      transparent 70%
    );
    opacity: 0.10;
    filter: blur(24px);
    pointer-events: none;
    transition: opacity 0.7s ease-out, transform 0.7s ease-out, filter 0.7s ease-out, background 0.7s ease-out;
  }

  .dark .ambient-glow {
    opacity: 0.14;
    filter: blur(40px);
  }

  /* Presenter State Utility Modifiers */
  .ambient-glow-idle {
    opacity: 0.10;
    transform: scale(1);
  }

  .dark .ambient-glow-idle {
    opacity: 0.14;
  }

  .ambient-glow-user {
    --ambient-glow-user-opacity: 0.22;
    opacity: 0.22;
    animation: ambient-pulse 3s ease-in-out infinite alternate;
  }

  .dark .ambient-glow-user {
    --ambient-glow-user-opacity: 0.28;
    opacity: 0.28;
  }

  .ambient-glow-panel {
    --ambient-glow-panel-opacity: 0.30;
    opacity: 0.30;
    animation: ambient-pulse-fast 2s ease-in-out infinite alternate;
  }

  .dark .ambient-glow-panel {
    --ambient-glow-panel-opacity: 0.38;
    opacity: 0.38;
  }
}
```

### 4.2 Recommended React Integration Pattern for `SlideStage` / `SimulatorRoom`

```tsx
// Example dynamic glow wrapper element in SimulatorRoom or SlideStage:
<div
  className={cn(
    'ambient-glow',
    engine.speakingPersonaId
      ? 'ambient-glow-panel'
      : engine.micActive
      ? 'ambient-glow-user'
      : 'ambient-glow-idle'
  )}
  style={
    slidePaletteColor
      ? ({ '--ambient-glow-color': slidePaletteColor } as React.CSSProperties)
      : undefined
  }
  aria-hidden="true"
/>
```

### 4.3 Slide Frame Drop-Shadow & Backdrop Styling in `SlideStage.tsx`

Enhance `SlideStage.tsx` canvas container:
```tsx
<div className="relative flex h-full w-fit min-w-0 max-w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card shadow-e2 transition-shadow duration-300">
  <AuthenticatedSlideImage
    source={slide.imageUrl}
    alt={`Slide ${position + 1}: ${slide.text}`}
    className="h-full w-auto max-w-full object-contain"
  />
  <span className="absolute right-3 top-3 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] backdrop-blur border border-border/50">
    {String(position + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
  </span>
</div>
```

---

## 5. Verification Method

1. **Test Suite Verification**:
   Run `npx vitest run` in project root. All tests must pass cleanly.
2. **Visual Token Inspection**:
   - Inspect `:root` and `.dark` variables in `src/app/globals.css`.
   - Verify `--primary` cobalt tokens (`#3E5FD9` light / `#4C8DFF` dark) serve as default fallback when `--ambient-glow-color` is absent.
   - Verify `prefers-reduced-motion` safety guard disables keyframe pulses for accessible playback.
