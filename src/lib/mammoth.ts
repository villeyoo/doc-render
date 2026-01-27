import mammoth from 'mammoth'
import type { ParsedDocument } from '@/shared/types'

type Alignment = 'left' | 'center' | 'right' | 'justify'

interface MammothParagraph {
  alignment?: Alignment | null
  styleName?: string | null
  styleId?: string | null
  [key: string]: unknown
}

interface MammothRun {
  fontSize?: number | null
  styleName?: string | null
  [key: string]: unknown
}

const transforms = (mammoth as unknown as {
  transforms: {
    paragraph: (fn: (paragraph: MammothParagraph) => MammothParagraph) => (element: unknown) => unknown
    run: (fn: (run: MammothRun) => MammothRun) => (element: unknown) => unknown
  }
}).transforms

const ALIGNMENT_STYLE_NAMES = {
  center: 'DocRenderAlignCenter',
  right: 'DocRenderAlignRight',
  justify: 'DocRenderAlignJustify'
} as const

const STYLE_ALIASES: Record<string, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  'heading 1': 'Heading1',
  heading1: 'Heading1',
  'heading 2': 'Heading2',
  heading2: 'Heading2',
  'heading 3': 'Heading3',
  heading3: 'Heading3',
  'heading 4': 'Heading4',
  heading4: 'Heading4'
}

const STYLE_IDENTIFIERS: Record<string, string[]> = {
  Title: ['Title', 'title'],
  Subtitle: ['Subtitle', 'subtitle'],
  Heading1: ['Heading 1', 'heading 1', 'Heading1', 'heading1'],
  Heading2: ['Heading 2', 'heading 2', 'Heading2', 'heading2'],
  Heading3: ['Heading 3', 'heading 3', 'Heading3', 'heading3'],
  Heading4: ['Heading 4', 'heading 4', 'Heading4', 'heading4']
}

const STYLE_TAGS: Record<string, { tag: string; className: string }> = {
  Title: { tag: 'h1', className: 'doc-title' },
  Subtitle: { tag: 'p', className: 'doc-subtitle' },
  Heading1: { tag: 'h2', className: 'doc-section' },
  Heading2: { tag: 'h3', className: 'doc-role' },
  Heading3: { tag: 'h4', className: 'doc-meta' },
  Heading4: { tag: 'h5', className: 'doc-minor' }
}

const toAlignmentStyleName = (styleName: string, alignment: keyof typeof ALIGNMENT_STYLE_NAMES) =>
  `DocRender${styleName}${alignment[0].toUpperCase()}${alignment.slice(1)}`

const buildSizeStyleMap = (min: number, max: number) => {
  const entries: string[] = []
  for (let size = min; size <= max; size += 1) {
    entries.push(`r[style-name='DocRenderSize-${size}'] => span.doc-font-${size}`)
  }
  return entries
}

const baseStyleMap = Object.entries(STYLE_IDENTIFIERS).flatMap(([styleKey, identifiers]) => {
  const target = STYLE_TAGS[styleKey]
  if (!target) {
    return []
  }
  return identifiers.map(
    (identifier) =>
      `p[style-name='${identifier}'] => ${target.tag}.${target.className}:fresh`
  )
})

const alignedStyleMap = Object.entries(STYLE_TAGS).flatMap(([styleKey, target]) =>
  (['center', 'right', 'justify'] as const).map(
    (alignment) =>
      `p[style-name='${toAlignmentStyleName(styleKey, alignment)}'] => ${target.tag}.${target.className}.align-${alignment}:fresh`
  )
)

// Custom style mappings for better HTML output
const styleMap = [
  ...baseStyleMap,
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote.intense:fresh",
  "p[style-name='List Paragraph'] => li:fresh",
  `p[style-name='${ALIGNMENT_STYLE_NAMES.center}'] => p.align-center:fresh`,
  `p[style-name='${ALIGNMENT_STYLE_NAMES.right}'] => p.align-right:fresh`,
  `p[style-name='${ALIGNMENT_STYLE_NAMES.justify}'] => p.align-justify:fresh`,
  ...alignedStyleMap,
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  "b => strong",
  "i => em",
  "u => u",
  "strike => s",
  ...buildSizeStyleMap(6, 144)
]

export async function convertDocxToHtml(arrayBuffer: ArrayBuffer): Promise<ParsedDocument> {
  try {
    const fontSizes = new Set<number>()
    const transformDocument = (element: unknown) => {
      const alignTransform = transforms.paragraph((paragraph) => {
        const alignment = paragraph.alignment
        if (!alignment || alignment === 'left') {
          return paragraph
        }

        if (alignment === 'center' || alignment === 'right' || alignment === 'justify') {
          const styleKey = (paragraph.styleName || paragraph.styleId || '').toString().trim().toLowerCase()
          const baseStyle = STYLE_ALIASES[styleKey]
          if (baseStyle) {
            return {
              ...paragraph,
              styleName: toAlignmentStyleName(baseStyle, alignment)
            }
          }

          return {
            ...paragraph,
            styleName: ALIGNMENT_STYLE_NAMES[alignment]
          }
        }

        return paragraph
      })

      const sizeTransform = transforms.run((run) => {
        if (run.fontSize) {
          fontSizes.add(run.fontSize)
          if (!run.styleName) {
            return {
              ...run,
              styleName: `DocRenderSize-${run.fontSize}`
            }
          }
        }
        return run
      })

      return sizeTransform(alignTransform(element))
    }

    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap,
        transformDocument,
        convertImage: mammoth.images.imgElement((image) => {
          return image.read('base64').then((imageBuffer) => ({
            src: `data:${image.contentType};base64,${imageBuffer}`
          }))
        })
      }
    )

    const warnings = result.messages
      .filter((msg) => msg.type === 'warning')
      .map((msg) => msg.message)

    return {
      html: result.value,
      warnings,
      fontSizes: Array.from(fontSizes).sort((a, b) => a - b)
    }
  } catch (error) {
    throw new Error(
      `Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export async function extractRawText(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
