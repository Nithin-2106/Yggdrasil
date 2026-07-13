// Minimal structural types for Vercel's (req, res) serverless function
// signature. Kept intentionally loose (not the full @vercel/node types)
// since this is a partial TS pass, not a hard dependency add.

export interface ApiRequest {
  method?: string
  query: Record<string, string | string[] | undefined>
  body: any
  headers: Record<string, string | string[] | undefined>
}

export interface ApiResponse {
  status(code: number): ApiResponse
  json(body: any): void
  end?(): void
}