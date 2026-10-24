import type { Page } from "@playwright/test";
// Synthetic local tiles for automated gestures/screenshots. Never run automated
// pan/zoom tests against the community OpenStreetMap tile service.
export async function mockMapTiles(page: Page) {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e7ece7"/><path d="M0 90L256 180M70 0L160 256" stroke="#fff" stroke-width="12"/><path d="M210 0L180 256" stroke="#bddce8" stroke-width="24"/><text x="12" y="25" font-size="12" fill="#647b76">TEST TILE · not a real map</text></svg>',
    }),
  );
}
