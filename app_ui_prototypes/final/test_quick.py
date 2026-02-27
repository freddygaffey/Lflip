#!/usr/bin/env python3
"""Quick smoke test - minimal checks."""
import asyncio
from playwright.async_api import async_playwright

URL = "http://localhost:5000/prototypes/final/index.html"
# Use hash to trigger gallery preview flow (demoLogin + navigateTo)
URL_DEMO = "http://127.0.0.1:5000/prototypes/final/index.html#logger"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 390, "height": 844})  # Mobile viewport
        page = await context.new_page()
        page.set_default_timeout(5000)
        errs = []
        page.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type == "error" else None)
        try:
            await page.goto(URL, wait_until="load")
            await page.evaluate("sessionStorage.clear(); localStorage.clear();")
            await page.wait_for_function("() => typeof window.__lplateDemoLogin === 'function'", timeout=5000)
            print("1. Page load: OK")
            if errs:
                print("   Console errors:", errs[:5])
            await page.evaluate("window.__lplateDemoLogin()")
            await page.wait_for_timeout(0.5)
            # Debug: what's visible?
            visible = await page.evaluate("""() => {
                const login = document.getElementById('loginScreen');
                const logger = document.getElementById('loggerScreen');
                const nav = document.getElementById('bottomNav');
                return {
                    loginActive: login?.classList.contains('active'),
                    loggerActive: logger?.classList.contains('active'),
                    navHidden: nav?.classList.contains('hidden'),
                };
            }""")
            print(f"   State: {visible}")
            await page.wait_for_selector("#loggerScreen.active", timeout=3000)
            print("2. Demo login: OK")
            await page.click('button[data-action="navigate"][data-screen="historyScreen"]')
            await page.wait_for_selector("#historyScreen.active", timeout=2000)
            print("3. History nav: OK")
            await page.click('button[data-action="navigate"][data-screen="chatScreen"]')
            await page.wait_for_selector("#chatScreen.active", timeout=2000)
            print("4. Chat nav: OK")
            await page.click('button[data-action="navigate"][data-screen="settingsScreen"]')
            await page.wait_for_selector("#settingsScreen.active", timeout=2000)
            print("5. Settings nav: OK")
            await page.click('button[data-action="sign-out"]')
            await page.wait_for_selector("#loginScreen.active", timeout=2000)
            print("6. Sign out: OK")
            print("\nAll quick tests PASSED")
        except Exception as e:
            print(f"FAIL: {e}")
            if errs:
                print("Console errors:", errs[:10])
            # Debug: check if main.js script tag exists
            try:
                has_script = await page.evaluate("""() => {
                    const s = document.querySelector('script[src*=\"main.js\"]');
                    return { hasScript: !!s, src: s?.src };
                }""")
                print("Script check:", has_script)
            except: pass
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
