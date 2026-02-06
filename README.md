# DocRender - Fast Local DOCX Preview for Chrome

Needed to open a `.docx`. No Word, no Google account, slow connection. Every option was either a 4GB install or uploading my file to someone's cloud.

So I built this. Drag a `.docx` into Chrome, read it, done. No uploads, no accounts, no installs. Everything stays on your device.

![Demo](./docs/demo.gif)

## The problem (you've been there)

Opening one Word file shouldn't mean:
- installing a 4+ GB office suite you'll use once
- uploading private/corporate stuff to cloud services
- waiting forever on a slow connection for something that's already on your disk

DocRender kills that. Open, read, close.

## How it works

```
.docx file > background parser > semantic HTML > styled viewer
```

DocRender doesn't try to be Word. It does **semantic-first rendering**: extract structure, restore visual hierarchy (headings, fonts, colors, spacing), optimize for reading. Result looks close to Google Docs but fully local, fully private.

What renders well:
- headings, paragraphs, alignment, spacing
- text colors and font families (Google Fonts fallback)
- ordered/unordered lists, tables, images
- multi-column layouts, dark mode

What's intentionally skipped (viewer not editor):
- floating images, complex text wrapping
- page headers/footers, exact print layout
- fonts not in Google Fonts (falls back to system)

Deliberate trade-offs. Speed and privacy over pixel-perfect reproduction.

## Privacy

- all processing happens locally in the browser
- no servers, no uploads, no tracking
- files never leave your device
- only external request: Google Fonts (optional)

Works for confidential docs, corporate environments, air-gapped setups.

## Usage

- drag and drop a `.docx`, or use the file picker
- recent docs are cached for quick access
- `.doc` intentionally not supported (legacy binary format, different beast)

<details>
<summary><b>Dev section</b></summary>

### Quick start

```bash
npm install        # applies a mammoth patch via patch-package
npm run build      #   (preserves text colors + font metadata)
```

```
chrome://extensions > Developer mode > Load unpacked > dist/
```

### Architecture

```
Download/Upload > Background stores ArrayBuffer in IndexedDB
               > Viewer requests by documentId
               > DOCX > HTML (mammoth + custom post-processing) > DocumentViewer renders
```

Core pipeline:
```ts
const doc = await getDocument(documentId);
const parsed = await convertDocxToHtml(doc.data);
render(parsed.html);
```

Mammoth does DOCX to HTML but out of the box it strips colors and font metadata. Patched it (`patch-package`) to preserve those. Custom post-processing layer then restores visual hierarchy that raw conversion loses.

### Stack

- TypeScript, Chrome Extension Manifest V3
- Mammoth.js (patched) for DOCX parsing
- custom post-render pipeline for semantic styling
- IndexedDB for document caching
- no backend, no runtime dependencies

### What this project shows

- parsing complex binary formats client-side under browser constraints
- memory management in extension context (large files, no Node.js luxuries)
- UX in constrained environments (popup + viewer inside an extension)
- pragmatic trade-offs: shipping something useful vs overengineering a Word clone

</details>

## Status

Actively developed. Roadmap: additional formats, smarter layout heuristics, accessibility.

## License

MIT
