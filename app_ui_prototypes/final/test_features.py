#!/usr/bin/env python3
"""
Feature test for L-Plate Logger refactored app.
Run with: python test_features.py
Requires: pip install playwright && python -m playwright install chromium
Server must be running: python server.py (from app_ui_prototypes/)
"""
import asyncio
from playwright.async_api import async_playwright, expect

URL = "http://localhost:5000/prototypes/final/index.html"
results = []


def log(name, passed, msg=""):
    status = "PASS" if passed else "FAIL"
    results.append((name, status, msg))
    print(f"  [{status}] {name}" + (f" - {msg}" if msg else ""))


async def run_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Capture console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        try:
            await page.goto(URL, wait_until="load", timeout=10000)
            await page.wait_for_timeout(1)  # Let JS modules init
        except Exception as e:
            log("Page load", False, str(e))
            await browser.close()
            return

        log("Page load", True)

        # 1. Auth - Quick Demo Learner
        try:
            await page.click('button[data-action="demo-login"][data-type="learner"]')
            await page.wait_for_selector("#bottomNav:not(.hidden)", timeout=3000)
            log("Auth: Quick Demo Learner", True)
        except Exception as e:
            log("Auth: Quick Demo Learner", False, str(e))

        # 2. Navigation - History
        try:
            await page.click('button[data-action="navigate"][data-screen="historyScreen"]')
            await page.wait_for_selector("#historyScreen.active", timeout=2000)
            log("Navigation: History tab", True)
        except Exception as e:
            log("Navigation: History tab", False, str(e))

        # 3. Navigation - Rules (Chat)
        try:
            await page.click('button[data-action="navigate"][data-screen="chatScreen"]')
            await page.wait_for_selector("#chatScreen.active", timeout=2000)
            log("Navigation: Rules (Chat) tab", True)
        except Exception as e:
            log("Navigation: Rules (Chat) tab", False, str(e))

        # 4. Navigation - Settings
        try:
            await page.click('button[data-action="navigate"][data-screen="settingsScreen"]')
            await page.wait_for_selector("#settingsScreen.active", timeout=2000)
            log("Navigation: Settings tab", True)
        except Exception as e:
            log("Navigation: Settings tab", False, str(e))

        # 5. Navigation - Back to Drive
        try:
            await page.click('button[data-action="navigate"][data-screen="loggerScreen"]')
            await page.wait_for_selector("#loggerScreen.active", timeout=2000)
            log("Navigation: Drive tab", True)
        except Exception as e:
            log("Navigation: Drive tab", False, str(e))

        # 6. Pre-trip modal - open
        try:
            await page.click('button[data-action="brb"]')
            await page.wait_for_selector("#preTripModal.show", timeout=2000)
            log("Pre-trip modal: Open", True)
        except Exception as e:
            log("Pre-trip modal: Open", False, str(e))

        # 7. Pre-trip modal - Start Drive
        try:
            await page.click('button[data-action="start-drive"]')
            await page.wait_for_selector("#activeTripScreen.active", timeout=3000)
            log("Pre-trip modal: Start Drive (begin trip)", True)
        except Exception as e:
            log("Pre-trip modal: Start Drive", False, str(e))

        # 8. Trip recording - STOP
        try:
            await page.click('button[data-action="toggle-trip"]')
            await page.wait_for_selector("#loggerScreen.active", timeout=3000)
            log("Trip recording: STOP", True)
        except Exception as e:
            log("Trip recording: STOP", False, str(e))

        # 9. History - filter pills
        try:
            await page.click('button[data-action="navigate"][data-screen="historyScreen"]')
            await page.wait_for_selector("#historyScreen.active", timeout=2000)
            await page.click('span[data-action="filter-trips"][data-f="approved"]')
            await page.click('span[data-action="filter-trips"][data-f="pending"]')
            await page.click('span[data-action="filter-trips"][data-f="all"]')
            log("History: Filter pills", True)
        except Exception as e:
            log("History: Filter pills", False, str(e))

        # 10. Chatbot - suggestion
        try:
            await page.click('button[data-action="navigate"][data-screen="chatScreen"]')
            await page.wait_for_selector("#chatScreen.active", timeout=2000)
            await page.click('button[data-action="ask-question"]')
            await page.wait_for_timeout(1500)  # Wait for response
            msgs = await page.locator(".chat-msg").count()
            log("Chatbot: Suggestion click", msgs >= 2, f"chat messages: {msgs}")
        except Exception as e:
            log("Chatbot: Suggestion click", False, str(e))

        # 11. Settings - Dark mode toggle
        try:
            await page.click('button[data-action="navigate"][data-screen="settingsScreen"]')
            await page.wait_for_selector("#settingsScreen.active", timeout=2000)
            await page.click('[data-action="toggle-theme"]')
            log("Settings: Dark mode toggle", True)
        except Exception as e:
            log("Settings: Dark mode toggle", False, str(e))

        # 12. Vehicles screen (from Settings)
        try:
            await page.click('.settings-item[data-action="navigate"][data-screen="vehiclesScreen"]')
            await page.wait_for_selector("#vehiclesScreen.active", timeout=2000)
            log("Navigation: Cars & Vehicles", True)
        except Exception as e:
            log("Navigation: Cars & Vehicles", False, str(e))

        # 13. Add vehicle
        try:
            await page.fill("#vehiclePlate", "TEST-123")
            await page.fill("#vehicleName", "Test Car")
            await page.click('button[data-action="save-vehicle"]')
            await page.wait_for_timeout(500)
            list_html = await page.locator("#vehiclesList").inner_html()
            log("Vehicles: Add car", "Test Car" in list_html or "TEST-123" in list_html)
        except Exception as e:
            log("Vehicles: Add car", False, str(e))

        # 14. Sign out
        try:
            await page.click('button[data-action="navigate"][data-screen="settingsScreen"]')
            await page.wait_for_selector("#settingsScreen.active", timeout=2000)
            await page.click('button[data-action="sign-out"]')
            await page.wait_for_selector("#loginScreen.active", timeout=2000)
            log("Auth: Sign out", True)
        except Exception as e:
            log("Auth: Sign out", False, str(e))

        # Console errors
        if console_errors:
            log("Console errors", False, f"{len(console_errors)} error(s): " + "; ".join(console_errors[:3]))
        else:
            log("Console errors", True, "None")

        await browser.close()

    # Summary
    print("\n--- Summary ---")
    passed = sum(1 for _, s, _ in results if s == "PASS")
    total = len(results)
    print(f"{passed}/{total} tests passed")
    for name, status, msg in results:
        if status == "FAIL":
            print(f"  FAIL: {name}" + (f" - {msg}" if msg else ""))


if __name__ == "__main__":
    asyncio.run(run_tests())
