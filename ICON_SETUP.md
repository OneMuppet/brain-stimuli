# PWA Icon Setup Guide

## Quick Start - Generate PNG Icons

**iOS requires PNG icons for home screen - SVG icons appear blurry!**

### Option 1: Using ImageMagick (Recommended)

1. Install ImageMagick:
   ```bash
   # macOS
   brew install imagemagick
   
   # Linux
   apt-get install imagemagick
   ```

2. Run the generation script:
   ```bash
   node scripts/generate-icons.js
   ```

This will generate all required PNG icons in `/public/`.

### Option 2: Online Converter

1. Go to https://cloudconvert.com/svg-to-png or https://svgtopng.com
2. Upload `public/logo.svg`
3. Generate these sizes:
   - 120x120 → `icon-120x120.png`
   - 152x152 → `icon-152x152.png`
   - 167x167 → `icon-167x167.png`
   - 180x180 → `icon-180x180.png` (REQUIRED for iOS)
   - 192x192 → `icon-192x192.png`
   - 512x512 → `icon-512x512.png`
4. Save all PNG files to `/public/` directory

### Option 3: Using Figma/Photoshop

1. Open `public/logo.svg` in Figma/Photoshop
2. Export as PNG at each required size
3. Save to `/public/` directory

## Required Icon Sizes

- `icon-180x180.png` - **iOS iPhone (REQUIRED)** - This is the main one iOS uses
- `icon-167x167.png` - iOS iPad Pro
- `icon-152x152.png` - iOS iPad
- `icon-120x120.png` - iOS iPhone (retina)
- `icon-192x192.png` - Android/Chrome
- `icon-512x512.png` - Android/Chrome (splash screen)

## Configuration

The app is already configured to use PNG icons:
- ✅ `manifest.json` - Updated with PNG icons
- ✅ `src/app/layout.tsx` - Updated with Apple icon sizes

## After Generating Icons

1. Verify PNG files are in `/public/` directory
2. Restart your dev server: `npm run dev`
3. On iOS device:
   - **Uninstall** the existing PWA (delete from home screen)
   - Clear Safari cache: Settings > Safari > Clear History and Website Data
   - Reinstall: Open in Safari > Share > Add to Home Screen

## Why PNG?

iOS Safari doesn't properly render SVG icons for PWA home screen installations. PNG icons ensure:
- ✅ Sharp, crisp icons on all iOS devices
- ✅ Consistent appearance across different iPhone/iPad models
- ✅ Proper masking and rendering

## Notes

- The manifest and layout are already configured - just generate the PNG files!
- iOS caches icons aggressively - you MUST uninstall and reinstall the PWA to see new icons

