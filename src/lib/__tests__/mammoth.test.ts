import { beforeEach, describe, expect, it, vi } from 'vitest'

const mammothMocks = vi.hoisted(() => ({
  convertToHtml: vi.fn(),
  extractRawText: vi.fn()
}))

vi.mock('mammoth', () => ({
  default: {
    convertToHtml: mammothMocks.convertToHtml,
    extractRawText: mammothMocks.extractRawText,
    transforms: {
      paragraph: (fn: (value: unknown) => unknown) => (element: unknown) => fn(element),
      run: (fn: (value: unknown) => unknown) => (element: unknown) => fn(element)
    },
    images: {
      imgElement: (fn: (value: unknown) => unknown) => fn
    }
  }
}))

import { convertDocxToHtml } from '../mammoth'

describe('convertDocxToHtml', () => {
  beforeEach(() => {
    mammothMocks.convertToHtml.mockReset()
  })

  it('collects warnings, font sizes, colors, and fonts from transforms', async () => {
    mammothMocks.convertToHtml.mockImplementation(async (_input: unknown, options: { transformDocument?: (value: unknown) => unknown }) => {
      options?.transformDocument?.({ alignment: 'center', styleName: 'Heading 1' })
      options?.transformDocument?.({ fontSize: 12 })
      options?.transformDocument?.({ fontSize: 10, styleName: 'Existing' })
      options?.transformDocument?.({ font: 'Roboto', color: 'ff0000' })

      return {
        value: '<p>Doc</p>',
        messages: [
          { type: 'warning', message: 'Unsupported font' },
          { type: 'info', message: 'Info' }
        ]
      }
    })

    const result = await convertDocxToHtml(new ArrayBuffer(8))

    expect(result.html).toBe('<p>Doc</p>')
    expect(result.warnings).toEqual(['Unsupported font'])
    expect(result.fontSizes).toEqual([10, 12])
    expect(result.colors).toEqual(['FF0000'])
    expect(result.fonts).toEqual(['Roboto'])
  })

  it('wraps mammoth errors with a consistent message', async () => {
    mammothMocks.convertToHtml.mockRejectedValueOnce(new Error('Boom'))

    await expect(convertDocxToHtml(new ArrayBuffer(4))).rejects.toThrow(
      'Failed to parse document: Boom'
    )
  })
})
