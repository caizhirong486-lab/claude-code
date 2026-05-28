import { describe, expect, mock, test } from 'bun:test'
import type { CacheSafeParams } from '../../../utils/forkedAgent.js'
import type { Message } from '../../../types/message.js'

mock.module('bun:bundle', () => ({ feature: () => false }))

const { sanitizeCompactCacheSafeParams } = await import('../compact.js')

describe('compact media sanitization', () => {
  test('removes image and document blocks from cache-sharing fork context', () => {
    const originalMessage = {
      type: 'user',
      uuid: 'user-media-message',
      message: {
        role: 'user',
        content: [
          { type: 'text', text: 'look at these' },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: 'abc',
            },
          },
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: 'def',
            },
          },
          {
            type: 'tool_result',
            tool_use_id: 'toolu_1',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: 'nested',
                },
              },
            ],
          },
        ],
      },
    } as unknown as Message

    const cacheSafeParams = {
      forkContextMessages: [originalMessage],
    } as unknown as CacheSafeParams

    const result = sanitizeCompactCacheSafeParams(cacheSafeParams)
    const content = (result.forkContextMessages[0] as any).message.content
    const originalContent = (cacheSafeParams.forkContextMessages[0] as any)
      .message.content

    expect(result).not.toBe(cacheSafeParams)
    expect(content).toEqual([
      { type: 'text', text: 'look at these' },
      { type: 'text', text: '[image]' },
      { type: 'text', text: '[document]' },
      {
        type: 'tool_result',
        tool_use_id: 'toolu_1',
        content: [{ type: 'text', text: '[image]' }],
      },
    ])
    expect(originalContent[1].type).toBe('image')
    expect(originalContent[2].type).toBe('document')
    expect(originalContent[3].content[0].type).toBe('image')
  })
})
