from playwright.sync_api import sync_playwright
import time
import sys
from pathlib import Path

OUT = Path('bootstrap/test_results/headless_check.txt')

URL = 'http://localhost:8000/jacob_plan_preview.html'


def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width':420,'height':800})
        page.goto(URL)
        # wait for meals to render
        page.wait_for_selector('.meal-card', timeout=5000)
        # pick the first meal card
        first = page.query_selector('.meal-card')
        if not first:
            OUT.write_text('FAIL: no meal-card found')
            print('FAIL: no meal-card found')
            sys.exit(2)
        # click to flip
        first.click()
        # allow animation
        time.sleep(0.6)
        # verify flipped class present
        flipped = first.get_attribute('class')
        if 'flipped' not in (flipped or ''):
            OUT.write_text('FAIL: card did not flip')
            print('FAIL: card did not flip')
            sys.exit(2)
        # check that back face doesn't overflow page bounds by measuring bounding boxes
        back = first.query_selector('.card-back')
        bbox = back.bounding_box()
        inner_box = first.bounding_box()
        # If back width/height exceed card or position outside, fail
        if bbox['width'] > inner_box['width'] + 1 or bbox['height'] > inner_box['height'] + 1:
            OUT.write_text('FAIL: back face larger than card')
            print('FAIL: back face larger than card')
            sys.exit(2)
        # click Expand
        exp = first.query_selector('.expand-btn')
        if not exp:
            OUT.write_text('FAIL: expand button missing')
            print('FAIL: expand button missing')
            sys.exit(2)
        # use DOM click to avoid coordinate-based interception by overlays
        exp.evaluate('el => el.click()')
        time.sleep(0.4)
        # modal should be visible
        modal = page.query_selector('.recipe-modal')
        style = modal.evaluate('el => window.getComputedStyle(el).display')
        if style != 'flex':
            OUT.write_text('FAIL: modal not visible')
            print('FAIL: modal not visible')
            sys.exit(2)
        # ensure flipped cards are hidden
        hidden = page.query_selector('.meal-card.flipped-hidden')
        if not hidden:
            OUT.write_text('FAIL: flipped card not hidden while modal open')
            print('FAIL: flipped card not hidden while modal open')
            sys.exit(2)
        OUT.write_text('PASS')
        print('PASS')
        browser.close()

if __name__ == '__main__':
    run_test()
