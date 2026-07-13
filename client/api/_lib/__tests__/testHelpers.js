// client/api/_lib/__tests__/testHelpers.js
// Minimal mock of Vercel's (req, res) serverless signature for testing
// handlers directly without spinning up an actual server.

export function mockReqRes({ method = 'GET', body = {}, query = {}, headers = {} } = {}) {
  const req = { method, body, query, headers }

  const res = {
    statusCode: 200,
    _json: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      // Mirror real res.json(): serialize through JSON so Mongoose
      // documents/ObjectIds come out the same way they would over the
      // wire (ObjectId -> hex string, documents -> plain objects),
      // rather than leaking raw driver objects into assertions.
      this._json = JSON.parse(JSON.stringify(payload))
      return this
    },
    end() {
      return this
    },
  }

  return { req, res }
}