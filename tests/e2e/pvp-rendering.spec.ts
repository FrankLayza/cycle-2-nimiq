import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

interface RenderSignals {
  coral: number;
  teal: number;
  pellets: number;
}

const COLORS = {
  coral: [0xff, 0x6b, 0x6b],
  teal: [0x3d, 0xdc, 0x84],
  lemon: [0xf7, 0xe0, 0x4d],
  bounty: [0xf2, 0xa9, 0x3b],
} as const;

function nearColor(data: Uint8Array, offset: number, target: readonly number[], tolerance = 12): boolean {
  return target.every((component, index) => Math.abs(data[offset + index] - component) <= tolerance);
}

function countRenderedSignals(image: Buffer): RenderSignals {
  const png = PNG.sync.read(image);
  const x0 = Math.floor(png.width * 0.21);
  const x1 = Math.ceil(png.width * 0.79);
  const y0 = Math.floor(png.height * 0.08);
  const y1 = Math.ceil(png.height * 0.86);
  const signals: RenderSignals = { coral: 0, teal: 0, pellets: 0 };

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const offset = (y * png.width + x) * 4;
      if (nearColor(png.data, offset, COLORS.coral)) signals.coral++;
      if (nearColor(png.data, offset, COLORS.teal)) signals.teal++;
      if (nearColor(png.data, offset, COLORS.lemon) || nearColor(png.data, offset, COLORS.bounty)) signals.pellets++;
    }
  }

  return signals;
}

async function waitForVisibleMatch(page: Page): Promise<RenderSignals> {
  const canvas = page.locator('#world canvas');
  await expect(canvas).toBeVisible();

  await expect
    .poll(
      async () => {
        const signals = countRenderedSignals(await canvas.screenshot());
        return signals.coral > 250 && signals.teal > 250 && signals.pellets > 250;
      },
      { timeout: 15_000, intervals: [250] },
    )
    .toBe(true);

  return countRenderedSignals(await canvas.screenshot());
}

test('two players visibly see both snakes and pellets in a PvP room', async ({ browser }) => {
  const firstContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const secondContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();

  try {
    await Promise.all([first.goto('/'), second.goto('/')]);
    await first.getByRole('button', { name: 'Create room' }).click();

    const waitingMessage = first.getByText(/Room [0-9A-HJ-KM-NP-TV-Z]{4}: waiting for opponent/);
    await expect(waitingMessage).toBeVisible();
    const code = (await waitingMessage.textContent())?.match(/Room ([0-9A-HJ-KM-NP-TV-Z]{4})/)?.[1];
    expect(code).toBeTruthy();

    await second.getByRole('button', { name: 'Room code' }).click();
    await second.getByLabel('Room code').fill(code!);
    await second.getByRole('button', { name: 'Join' }).click();

    const [firstSignals, secondSignals] = await Promise.all([
      waitForVisibleMatch(first),
      waitForVisibleMatch(second),
    ]);

    expect(firstSignals.coral).toBeGreaterThan(250);
    expect(firstSignals.teal).toBeGreaterThan(250);
    expect(firstSignals.pellets).toBeGreaterThan(250);
    expect(secondSignals.coral).toBeGreaterThan(250);
    expect(secondSignals.teal).toBeGreaterThan(250);
    expect(secondSignals.pellets).toBeGreaterThan(250);
  } finally {
    await Promise.all([firstContext.close(), secondContext.close()]);
  }
});
