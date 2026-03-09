import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Write console messages to file
        def log_to_file(msg):
            with open("test_drag_console.txt", "a", encoding="utf-8") as f:
                f.write(f"Console: {msg.text}\n")
                
        page.on("console", log_to_file)
        page.on("pageerror", lambda err: log_to_file(type('obj', (object,), {'text': str(err)})))
        
        # Initialize log file
        with open("test_drag_console.txt", "w", encoding="utf-8") as f:
            f.write("--- Test Run ---\n")
        
        await page.goto("http://localhost:8080")
        await page.wait_for_timeout(1000)
        
        # We need a PDF loaded to select. Let's trigger a fake load or upload a dummy PDF.
        # But wait, without uploading a PDF, pdfCanvas is hidden!
        # Let's bypass the upload by directly unhiding and evaluating
        
        await page.evaluate('''
            document.getElementById('uploadArea').hidden = true;
            document.getElementById('canvasContainer').hidden = false;
            document.getElementById('canvasControls').hidden = false;
        ''')
        
        print("Ready. Emulating drag...")
        
        # Click and drag on pdfCanvas
        box = await page.evaluate('''
            () => {
                const canvas = document.getElementById('pdfCanvas');
                const rect = canvas.getBoundingClientRect();
                return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
            }
        ''')
        
        with open("test_drag_result.txt", "w") as f:
            f.write(f"pdfCanvas rect: {box}\n")
            
        x = box["left"] + 5
        y = box["top"] + 50
        
        # Check element at point
        element_id = await page.evaluate(f'''
            const el = document.elementFromPoint({x}, {y});
            el ? el.id || el.className || el.tagName : "NONE";
        ''')
        
        with open("test_drag_result.txt", "a") as f:
            f.write(f"Element at ({x}, {y}): {element_id}\n")
        
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.move(x + 50, y + 50)
        await page.mouse.up()
        
        await page.wait_for_timeout(1000)
        
        is_visible = await page.is_visible("#selectionBox")
        with open("test_drag_result.txt", "a") as f:
            f.write(f"Selection Box Visible: {is_visible}\n")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
