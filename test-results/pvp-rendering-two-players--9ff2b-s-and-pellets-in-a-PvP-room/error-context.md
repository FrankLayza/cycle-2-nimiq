# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pvp-rendering.spec.ts >> two players visibly see both snakes and pellets in a PvP room
- Location: tests\e2e\pvp-rendering.spec.ts:58:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | import { PNG } from 'pngjs';
  3  | 
  4  | interface RenderSignals {
  5  |   coral: number;
  6  |   teal: number;
  7  |   pellets: number;
  8  | }
  9  | 
  10 | const COLORS = {
  11 |   coral: [0xff, 0x6b, 0x6b],
  12 |   teal: [0x3d, 0xdc, 0x84],
  13 |   lemon: [0xf7, 0xe0, 0x4d],
  14 |   bounty: [0xf2, 0xa9, 0x3b],
  15 | } as const;
  16 | 
  17 | function nearColor(data: Uint8Array, offset: number, target: readonly number[], tolerance = 12): boolean {
  18 |   return target.every((component, index) => Math.abs(data[offset + index] - component) <= tolerance);
  19 | }
  20 | 
  21 | function countRenderedSignals(image: Buffer): RenderSignals {
  22 |   const png = PNG.sync.read(image);
  23 |   const x0 = Math.floor(png.width * 0.21);
  24 |   const x1 = Math.ceil(png.width * 0.79);
  25 |   const y0 = Math.floor(png.height * 0.08);
  26 |   const y1 = Math.ceil(png.height * 0.86);
  27 |   const signals: RenderSignals = { coral: 0, teal: 0, pellets: 0 };
  28 | 
  29 |   for (let y = y0; y < y1; y++) {
  30 |     for (let x = x0; x < x1; x++) {
  31 |       const offset = (y * png.width + x) * 4;
  32 |       if (nearColor(png.data, offset, COLORS.coral)) signals.coral++;
  33 |       if (nearColor(png.data, offset, COLORS.teal)) signals.teal++;
  34 |       if (nearColor(png.data, offset, COLORS.lemon) || nearColor(png.data, offset, COLORS.bounty)) signals.pellets++;
  35 |     }
  36 |   }
  37 | 
  38 |   return signals;
  39 | }
  40 | 
  41 | async function waitForVisibleMatch(page: Page): Promise<RenderSignals> {
  42 |   const canvas = page.locator('#world canvas');
  43 |   await expect(canvas).toBeVisible();
  44 | 
  45 |   await expect
  46 |     .poll(
  47 |       async () => {
  48 |         const signals = countRenderedSignals(await canvas.screenshot());
  49 |         return signals.coral > 250 && signals.teal > 250 && signals.pellets > 250;
  50 |       },
  51 |       { timeout: 15_000, intervals: [250] },
  52 |     )
> 53 |     .toBe(true);
     |      ^ Error: expect(received).toBe(expected) // Object.is equality
  54 | 
  55 |   return countRenderedSignals(await canvas.screenshot());
  56 | }
  57 | 
  58 | test('two players visibly see both snakes and pellets in a PvP room', async ({ browser }) => {
  59 |   const firstContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  60 |   const secondContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  61 |   const first = await firstContext.newPage();
  62 |   const second = await secondContext.newPage();
  63 | 
  64 |   try {
  65 |     await Promise.all([first.goto('/'), second.goto('/')]);
  66 |     await first.getByRole('button', { name: 'Create room' }).click();
  67 | 
  68 |     const waitingMessage = first.getByText(/Room [0-9A-HJ-KM-NP-TV-Z]{4}: waiting for opponent/);
  69 |     await expect(waitingMessage).toBeVisible();
  70 |     const code = (await waitingMessage.textContent())?.match(/Room ([0-9A-HJ-KM-NP-TV-Z]{4})/)?.[1];
  71 |     expect(code).toBeTruthy();
  72 | 
  73 |     await second.getByRole('button', { name: 'Room code' }).click();
  74 |     await second.getByLabel('Room code').fill(code!);
  75 |     await second.getByRole('button', { name: 'Join' }).click();
  76 | 
  77 |     const [firstSignals, secondSignals] = await Promise.all([
  78 |       waitForVisibleMatch(first),
  79 |       waitForVisibleMatch(second),
  80 |     ]);
  81 | 
  82 |     expect(firstSignals.coral).toBeGreaterThan(250);
  83 |     expect(firstSignals.teal).toBeGreaterThan(250);
  84 |     expect(firstSignals.pellets).toBeGreaterThan(250);
  85 |     expect(secondSignals.coral).toBeGreaterThan(250);
  86 |     expect(secondSignals.teal).toBeGreaterThan(250);
  87 |     expect(secondSignals.pellets).toBeGreaterThan(250);
  88 |   } finally {
  89 |     await Promise.all([firstContext.close(), secondContext.close()]);
  90 |   }
  91 | });
  92 | 
```