# PWA Icon Setup Guide

## Current Status
The app currently uses SVG icons (`logo.svg`) which work for most platforms, but iOS sometimes has issues with SVG icons for home screen installation.

## For Better iOS Icon Support

To improve icon quality on iOS devices, you should generate PNG versions of the logo in the following sizes:

### Required Icon Sizes:
- `icon-180x180.png` - iOS home screen (iPhone)
- `icon-167x167.png` - iOS iPad Pro
- `icon-152x152.png` - iOS iPad
- `icon-120x120.png` - iOS iPhone (retina)
- `icon-192x192.png` - Android/Chrome
- `icon-512x512.png` - Android/Chrome (splash screen)

### Steps:
1. Use the `logo.svg` file as the source
2. Convert to PNG at each size listed above
3. Place PNG files in the `/public` directory
4. Update `manifest.json` to include PNG icons:
   ```json
   "icons": [
     {
       "src": "/icon-192x192.png",
       "sizes": "192x192",
       "type": "image/png",
       "purpose": "any"
     },
     {
       "src": "/icon-512x512.png",
       "sizes": "512x512",
       "type": "image/png",
       "purpose": "any"
     }
   ]
   ```
5. Update `src/app/layout.tsx` metadata to reference PNG apple icons

### Tools for Conversion:
- Online: https://cloudconvert.com/svg-to-png
- Command line: `inkscape --export-filename=icon-180x180.png --export-width=180 --export-height=180 logo.svg`
- Image editors: Figma, Photoshop, GIMP, etc.

### Note:
The current SVG implementation should work, but PNG icons will provide better quality and compatibility, especially on iOS devices.

