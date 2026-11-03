import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import { isBlockedAddress, assertPublicUrl } from "../src/guard.js";
import { app } from "../src/server.js";

test("blocks loopback, private, link-local and unspecified addresses", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.9", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "::", "fe80::1", "fd00::5", "::ffff:127.0.0.1"]) {
    assert.equal(isBlockedAddress(ip), true, ip);
  }
});

test("allows public addresses", () => {
  for (const ip of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "2606:4700:4700::1111"]) {
    assert.equal(isBlockedAddress(ip), false, ip);
  }
});

test("assertPublicUrl rejects IP literals and localhost", async () => {
  for (const u of ["http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/meta-data/", "http://localhost/"]) {
    await assert.rejects(() => assertPublicUrl(new URL(u)), { code: "BLOCKED_TARGET" }, u);
  }
});

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

test("/preview never connects to a loopback target", async () => {
  let hits = 0;
  const internal = http.createServer((_req, res) => { hits++; res.end("<title>internal</title>"); });
  const internalPort = await listen(internal);
  const api = http.createServer(app);
  const apiPort = await listen(api);
  try {
    const res = await fetch(`http://127.0.0.1:${apiPort}/preview?url=${encodeURIComponent(`http://127.0.0.1:${internalPort}/`)}`);
    assert.equal(res.status, 400);
    assert.equal(hits, 0);
  } finally {
    api.close();
    internal.close();
  }
});
