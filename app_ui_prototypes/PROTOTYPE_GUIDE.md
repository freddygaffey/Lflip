# Adding New Prototypes to the Gallery

New HTML prototypes in this folder are **automatically** listed in the gallery. To ensure they work with the preview theme toggle and screen thumbnails, follow these steps.

## 1. Theme Support (Light/Dark Preview)

Add this script in the `<head>`, **before** any other scripts:

```html
<script src="preview-theme.js"></script>
```

This reads `?theme=light` or `?theme=dark` from the URL and applies it. Your prototype must use:

- `data-theme="dark"` and `data-theme="light"` on the `<html>` element
- CSS variables under `[data-theme="light"]` and `[data-theme="dark"]`

## 2. Hash-Based Screen Previews

For the gallery to show different screens (Log, History, AI, Settings) as thumbnails, add this at the end of your prototype, before `</body>`:

```html
<script>
(function(){
  var params = new URLSearchParams(location.search);
  var theme = params.get('theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lplate_theme', theme);
  }
  var h = (location.hash || '').slice(1);
  var map = { logger: 'loggerScreen', history: 'historyScreen', chat: 'chatScreen', settings: 'settingsScreen' };
  if (map[h] && typeof demoLogin === 'function') {
    demoLogin('learner');
    setTimeout(function() {
      var el = document.querySelector('[data-screen="' + map[h] + '"]');
      if (el && typeof navigateTo === 'function') navigateTo(map[h], el);
    }, 600);
  }
})();
</script>
```

**Customize** the `map` object to match your screen IDs and nav elements. Use `data-screen` on your nav buttons and screens.

## 3. Custom Preview Screens

If your prototype uses different screen names (e.g. "Trips" instead of "History"), update `get_preview_screens` in `server.py` (project root) or `app_ui_prototypes/server.py`:

```python
def get_preview_screens(filename):
    # Add custom mappings for your prototype
    if "my-prototype.html" in filename:
        return [("Log", "logger"), ("Trips", "trips"), ("AI", "chat"), ("Settings", "settings")]
    # Default for all other prototypes
    return PREVIEW_SCREENS
```

## Summary

| Requirement | Action |
|-------------|--------|
| Appear in gallery | Place `.html` file in `app_ui_prototypes/` |
| Light/dark preview | Include `preview-theme.js` in `<head>` |
| Different screen thumbnails | Add hash-based script with your screen map |
| Custom screen labels | Update `get_preview_screens()` in server |
