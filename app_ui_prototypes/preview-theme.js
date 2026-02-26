/**
 * Preview theme support for the prototype gallery.
 * Include this script in the <head> of new prototypes to support light/dark preview toggling.
 *
 * Usage: <script src="preview-theme.js"></script>
 * Place before other scripts so theme is applied before your app initializes.
 *
 * Requirements:
 * - Use data-theme="dark" and data-theme="light" on <html> for theming
 * - Define [data-theme="light"] and [data-theme="dark"] CSS variables
 * - Supports both localStorage keys: lplate_theme and lplate-theme
 */
(function() {
  var params = new URLSearchParams(location.search);
  var theme = params.get('theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('lplate_theme', theme);
      localStorage.setItem('lplate-theme', theme);
    } catch (e) {}
  }
})();
