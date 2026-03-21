const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../server");

test("GET /api/health returns status ok", async () => {
  const app = createApp();
  const res = await request(app).get("/api/health");

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(typeof res.body.timestamp, "string");
  assert.equal(typeof res.body.uptime, "number");
});

test("Unknown route returns JSON 404", async () => {
  const app = createApp();
  const res = await request(app).get("/api/does-not-exist");

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.error, /Route not found/);
});
