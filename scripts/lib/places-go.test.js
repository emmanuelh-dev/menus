import assert from "node:assert/strict";
import { test } from "node:test";
import { leerPlace, menuHeaders } from "./places-go.js";

test("private reader requires the server key and encodes the slug", async () => {
  assert.throws(() => menuHeaders({}), /GO_MENU_API_KEY/);
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://adminm.bysmax.com/api/public/places/a%2Fb");
      assert.deepEqual(init.headers, { "X-Menu-API-Key": "test-private" });
      return Response.json({ id: 1 });
    };
    assert.deepEqual(await leerPlace("a/b", { GO_MENU_API_KEY: "test-private" }), { id: 1 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
