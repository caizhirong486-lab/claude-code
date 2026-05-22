import { describe, expect, test } from 'bun:test'
import stripAnsi from 'strip-ansi'
import type { MCPServerConnection } from '../../services/mcp/types.js'
import { buildMcpProperties } from '../status.js'

const httpConfig = {
  type: 'http',
  url: 'http://127.0.0.1:12306/mcp',
  scope: 'dynamic',
} as const

describe('buildMcpProperties', () => {
  test('reports disabled MCP servers separately from failed servers', () => {
    const properties = buildMcpProperties(
      [
        { name: 'mcp-chrome', type: 'disabled', config: httpConfig },
        { name: 'computer-use', type: 'disabled', config: httpConfig },
      ] satisfies MCPServerConnection[],
      'dark',
    )

    const value = stripAnsi(String(properties[0]?.value ?? ''))
    expect(value).toContain('2 disabled')
    expect(value).not.toContain('failed')
  })
})
