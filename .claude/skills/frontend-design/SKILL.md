---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with intentional typography, color palettes, and responsive aesthetics. Use when building or refining web UIs, components, layouts, styling, micro-interactions, or design systems.
---

# Frontend Design

Create distinctive, polished, production-grade frontend interfaces that avoid generic AI aesthetics.

## Core Principles

1. **Intentional Typography**
   - Pair distinctive display fonts with readable body fonts (e.g., Lora + Plus Jakarta Sans).
   - Use clear scale and hierarchy with optical sizing and proportional line heights.

2. **Tailored Color Palettes**
   - Avoid generic primary colors (plain red/blue/green).
   - Use curated palettes with warm undertones, dark modes, and subtle surface elevations.

3. **Motion & Feedback**
   - Add micro-animations on interactive elements (hover, focus, active states).
   - Keep transitions purposeful and snappy (`150ms - 250ms`, `cubic-bezier(.32, .72, 0, 1)`).
   - Respect `prefers-reduced-motion`.

4. **Multi-device Responsive Fidelity**
   - Always design and verify layout in three viewport buckets:
     - Desktop (`>=1024px`)
     - Tablet (`768px - 1023px`)
     - Mobile (`<768px`)

## Verification Checklist

- [ ] Typography scale is consistent and readable
- [ ] Contrast meets WCAG AA standards
- [ ] Responsive behavior is solid across desktop, tablet, and mobile
- [ ] Hover and focus states exist for all interactive elements
