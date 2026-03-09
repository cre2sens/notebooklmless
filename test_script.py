import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:8080")
        await page.wait_for_timeout(1000)
        
        # Press Ctrl+Shift+D
        await page.keyboard.press("Control+Shift+D")
        await page.wait_for_timeout(1000)
        
        # Trigger state change by clicking shortcut button
        await page.click("#shortcutHelpBtn")
        await page.wait_for_timeout(1000)
        
        # Take screenshot
        await page.screenshot(path="debug_console_screenshot.png")
        
        # Check if debug panel is visible
        is_visible = await page.is_visible("#debugPanel")
        print(f"Debug Panel Visible: {is_visible}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
