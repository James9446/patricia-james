# Style Guide

## Color Palette

| Role | Color Name | Hex Code | CSS Variable | Usage Guidelines |
|------|-----------|----------|--------------|------------------|
| Primary | Solstice Blue | #4DC5E3 | `--solstice-blue` | Primary buttons, active links, key headings, main interactive color |
| Secondary | Periwinkle | #8B9FD4 | `--lavender-haze` | Secondary actions, decorative borders, subtle accents |
| Accent | Light Periwinkle | #A8B8E0 | `--blush-pink` | Tertiary actions, backgrounds, soft highlights |
| Text | Charcoal | #333333 | `--charcoal` | Main body text and paragraph content |
| Text Secondary | Slate Gray | #6B7280 | `--slate-gray` | Secondary text, captions, subtle labels |

## Button Pattern

All buttons follow this consistent pattern to prevent layout shifts:

**Normal State:**
- Background: `var(--solstice-blue)`
- Border: `2px solid var(--solstice-blue)` (invisible - matches background)
- Shadow: `0 4px 15px rgba(77, 197, 227, 0.3)`

**Hover State:**
- Background: `rgba(255, 255, 255, 0.8)` (translucent white)
- Color: `var(--slate-gray)`
- Border: `2px solid var(--solstice-blue)` (now visible)
- Shadow: `0 2px 8px rgba(0, 0, 0, 0.1)` (smaller)
- Transform: `translateY(-2px)`

**Key Principles:**
1. Borders are always 2px to prevent layout shift
2. Border color matches background in normal state (invisible)
3. Use `transform` for movement, never padding/margin changes
4. Shadow gets smaller on hover, not larger

## Typography

**Font Families:**
- Primary: Inter (body text)
- Script: Dancing Script (decorative)
- Serif: Playfair Display (headings)
- Elegant: Cormorant Garamond (special text)
- Custom: Lucy Said OK, Great Vibes (hero sections)
