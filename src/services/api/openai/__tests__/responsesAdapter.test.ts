import { afterEach, describe, expect, mock, test } from 'bun:test'

mock.module('../chatgptAuth.js', () => ({
  getValidChatGPTAuth: async () => ({
    accessToken: 'test-token',
    accountId: 'test-account',
  }),
}))

const { buildResponsesRequest, createChatGPTResponsesStream } = await import(
  '../responsesAdapter.js'
)

function buildMinimalResponsesRequest() {
  return buildResponsesRequest({
    model: 'gpt-5.5',
    messages: [{ role: 'user', content: 'hello' }],
    tools: [],
    toolChoice: undefined,
  })
}

afterEach(() => {
  delete process.env.CHATGPT_RESPONSES_TIMEOUT_MS
})

describe('buildResponsesRequest', () => {
  test('includes reasoning effort for ChatGPT Responses requests', () => {
    const request = buildResponsesRequest({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [],
      toolChoice: undefined,
      reasoningEffort: 'xhigh',
    })

    expect(request.reasoning).toEqual({ effort: 'xhigh' })
  })

  test('does not include unsupported max_output_tokens parameter', () => {
    const request = buildResponsesRequest({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [],
      toolChoice: undefined,
    }) as Record<string, unknown>

    expect('max_output_tokens' in request).toBe(false)
  })

  test('times out stalled ChatGPT Responses requests', async () => {
    process.env.CHATGPT_RESPONSES_TIMEOUT_MS = '5'

    const fetchOverride = ((_url, init) => {
      const signal = (init as RequestInit).signal as AbortSignal
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => reject(signal.reason ?? new Error('aborted')),
          { once: true },
        )
        setTimeout(() => reject(new Error('fetch was not aborted')), 30)
      })
    }) as typeof fetch

    await expect(
      createChatGPTResponsesStream({
        request: buildMinimalResponsesRequest(),
        signal: new AbortController().signal,
        fetchOverride,
      }),
    ).rejects.toThrow('timed out')
  })

  test('times out stalled ChatGPT Responses streams', async () => {
    process.env.CHATGPT_RESPONSES_TIMEOUT_MS = '5'

    const fetchOverride = (async (
      _url: Parameters<typeof fetch>[0],
      _init?: Parameters<typeof fetch>[1],
    ) =>
      new Response(
        new ReadableStream({
          start() {},
        }),
        { status: 200 },
      )) as unknown as typeof fetch

    const stream = await createChatGPTResponsesStream({
      request: buildMinimalResponsesRequest(),
      signal: new AbortController().signal,
      fetchOverride,
    })

    await expect(
      (async () => {
        for await (const _event of stream) {
          // The stream never yields; the timeout should abort the read.
        }
      })(),
    ).rejects.toThrow('timed out')
  })

  test('still honors the caller abort signal', async () => {
    const controller = new AbortController()
    const fetchOverride = ((_url, init) => {
      const signal = (init as RequestInit).signal as AbortSignal
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => reject(signal.reason ?? new Error('aborted')),
          { once: true },
        )
        queueMicrotask(() => controller.abort(new Error('caller aborted')))
      })
    }) as typeof fetch

    await expect(
      createChatGPTResponsesStream({
        request: buildMinimalResponsesRequest(),
        signal: controller.signal,
        fetchOverride,
      }),
    ).rejects.toThrow('caller aborted')
  })
})
