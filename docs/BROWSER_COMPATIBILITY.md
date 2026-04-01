# Browser Compatibility Documentation

This document outlines browser support, known limitations, and specific behaviors across different browsers for the VAKS platform.

## Supported Browsers

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Google Chrome | 90+ | ✅ Fully Supported |
| Brave | 1.20+ | ✅ Fully Supported |
| Mozilla Firefox | 88+ | ✅ Fully Supported |
| Microsoft Edge | 90+ | ✅ Fully Supported |
| Safari | 14+ | ⚠️ Supported with limitations |
| Opera | 76+ | ✅ Fully Supported |

## Required Browser Features

The application requires the following browser APIs:

| Feature | Chrome | Firefox | Safari | Edge | Brave |
|---------|--------|---------|--------|------|-------|
| localStorage | ✅ | ✅ | ✅ | ✅ | ✅ |
| sessionStorage | ✅ | ✅ | ✅ | ✅ | ✅ |
| WebSocket | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fetch API | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSS Grid | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSS Flexbox | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSS Variables | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSS 3D Transforms | ✅ | ✅ | ✅ | ✅ | ✅ |

## Known Browser-Specific Limitations

### Google Chrome
- **None known** - Full compatibility

### Brave Browser
- **Shields may block WebSocket connections**: If real-time notifications don't work, try disabling Brave Shields for this site or add the site to the "Allow all trackers" list
- **Crypto wallet conflicts**: If using Brave's built-in crypto wallet, ensure it doesn't conflict with VAKS wallet features
- **Fingerprinting protection**: May affect some canvas-based features; disable if experiencing issues

### Mozilla Firefox
- **Enhanced Tracking Protection**: May block some third-party API calls. Add site to exceptions if issues occur
- **Container tabs**: Different containers have separate localStorage, so login state won't persist across containers
- **Strict mode cookies**: May require adjusting privacy settings for authentication cookies

### Safari (macOS/iOS)
- **WebSocket limitations**: Safari has stricter WebSocket timeout handling; real-time features may disconnect more frequently
- **Private browsing**: localStorage is limited in private mode; some features may not persist
- **Date picker styling**: Native date inputs may appear differently than on other browsers
- **Custom scrollbar CSS**: WebKit scrollbar styles work but may differ slightly from Chrome
- **iOS Safari**:
  - No support for `position: fixed` inside scrolling containers
  - Pull-to-refresh may interfere with swipe gestures
  - 100vh includes browser chrome; use CSS `dvh` units for true viewport height

### Microsoft Edge
- **Internet Explorer mode**: Not supported; disable IE mode for this site
- **Sleep tabs**: Background tabs may disconnect WebSocket; re-focus triggers reconnection

### Opera
- **Built-in VPN**: May cause issues with WebSocket connections; disable if experiencing real-time update problems
- **Built-in ad blocker**: May interfere with certain features; whitelist the site if needed

## CSS-Specific Notes

### Custom Scrollbars
Custom scrollbar styling uses WebKit prefixes and works on:
- ✅ Chrome, Edge, Brave, Opera (WebKit/Blink)
- ⚠️ Firefox (limited support, uses `scrollbar-width` and `scrollbar-color`)
- ⚠️ Safari (supported but appearance may vary)

### CSS Animations
All browsers support the Framer Motion animations used in the app. For reduced motion preferences:
- The app respects `prefers-reduced-motion` media query
- Animations are reduced or disabled when this preference is set

### Dark Mode
Dark mode uses CSS variables and `prefers-color-scheme` media query:
- Supported in all listed browsers
- User can manually toggle theme regardless of system preference

## JavaScript Compatibility

### ES2017+ Features Used
- `async/await`
- Optional chaining (`?.`)
- Nullish coalescing (`??`)
- `Array.prototype.includes()`
- `Object.entries()` / `Object.values()`

All supported browsers include these features natively; no polyfills are required.

### localStorage Keys Used
The following keys are stored in localStorage:
- `vaks_access_token` - Authentication JWT
- `vaks_locale` - User language preference (pt, en, es, fr)
- `vaks_theme` - User theme preference (light, dark, system)
- `vaks_frequent_ops` - Frequent operations cache

**Privacy note**: Clear these keys to fully log out and reset preferences.

## Network Requirements

- **HTTPS**: Required for all production deployments
- **WebSocket**: Port 443 (wss://) for real-time features
- **API**: RESTful JSON API over HTTPS

## Accessibility

- Screen reader support (ARIA labels)
- Keyboard navigation
- Focus management
- High contrast mode compatible
- Reduced motion support

## Troubleshooting

### Real-time notifications not working
1. Check if WebSocket is being blocked by firewall or VPN
2. Disable browser extensions that may block connections
3. In Brave, add site to Shields exceptions
4. Check console for WebSocket errors

### Login state not persisting
1. Ensure cookies and localStorage are enabled
2. Don't use private/incognito mode for persistent sessions
3. Check if browser extensions are clearing storage

### Animations stuttering
1. Enable hardware acceleration in browser settings
2. Update graphics drivers
3. Close other resource-intensive tabs

### Date/time display issues
1. Check browser timezone settings
2. Ensure system clock is synchronized

## Mobile Browser Support

| Browser | iOS | Android | Status |
|---------|-----|---------|--------|
| Safari | ✅ | N/A | Supported |
| Chrome | ✅ | ✅ | Supported |
| Firefox | ⚠️ | ✅ | Limited iOS support |
| Samsung Internet | N/A | ✅ | Supported |

### Mobile-Specific Considerations
- Touch gestures supported for carousel navigation
- Responsive design adapts to all screen sizes
- PWA installation supported (when enabled)
- Portrait and landscape orientations supported
