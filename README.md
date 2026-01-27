# DocRender Fast Local DOCX Preview for Chrome
DocRender is a Chrome extension that allows you to preview `.docx` files quickly and locally, directly in your browser.

No uploads.
No accounts.
No office software required.

The document is processed entirely on your device.
The goal of DocRender is simple:
**open a Word document instantly to read it not to edit it.**

![Demo](./docs/demo.gif)

## Supported format
* `.docx` (classic `.doc` is intentionally not supported)

## Why DocRender exists
Opening a single `.docx` file often means:
* installing large office software, or
* uploading private documents to cloud services.
* installing large office software (4+ GB), or
* waiting forever on slow connections, or
* uploading private documents to cloud services

DocRender exists to remove that friction.
It provides a fast, local way to preview documents when you only need to see the content not modify it.

## Privacy-first by design
* All documents are processed locally in the browser
* No servers, no uploads, no tracking
* Files never leave the users device
This makes DocRender suitable for:
* confidential documents
* corporate and educational environments
* quick previews without cloud access

## Rendering approach
DocRender does **not** try to replicate Microsoft Word pixel-perfectly.
Instead, it follows a **semantic-first rendering approach** focused on readability.
Rendering pipeline:
* extract document structure (headings, paragraphs, lists, tables, images)
* apply a custom post-processing layer
* restore visual hierarchy (sizes, colors, layout) optimized for reading

This approach:
* avoids the complexity of fully reimplementing Word
* keeps rendering fast and predictable
* works well even for large documents
In practice, the result is visually close to Google Docs while remaining fully local.

## How it works (high-level)
```text
Download/Upload > Background stores ArrayBuffer in IndexedDB
> Viewer requests by documentId
> DOCX > HTML (mammoth) > DocumentViewer renders
```

Core pipeline (simplified):
```ts
const doc = await getDocument(documentId)
const parsed = await convertDocxToHtml(doc.data)
render(parsed.html)
```

## Supported features
* Headings with restored visual hierarchy
* Paragraph alignment and spacing
* Text colors and emphasis
* Ordered and unordered lists
* Tables
* Images
* Multi-column layouts (where possible)
* Dark mode friendly rendering

## Known limitations (intentional)
DocRender is a **viewer**, not an editor.
Some advanced Word features may be approximated:
* floating images and complex text wrapping
* deeply nested tables
* custom fonts (system fonts are used instead)
* page headers, footers, and exact print layout
These trade-offs are intentional to keep previews fast, readable, and fully local.

## Usage
* Drag & drop a `.docx` file into the extension
* Or open a file via the file picker
* Recently opened documents are cached for quick access
The workflow is optimized for speed:
**open > read > close**

## Quick start (local build)
```bash
npm install
npm run build
```

```text
chrome://extensions > Developer mode > Load unpacked > dist/
```

## Tech stack
* TypeScript
* Chrome Extension Manifest V3
* Fully local file processing (no backend)
* Semantic DOCX parsing with custom post-render styling
* Modern UI with smooth animations

## Project focus
This project demonstrates:
* working with complex file formats in the browser
* client-side performance and memory constraints
* UX design for constrained environments (extension popup and viewer)
* making pragmatic engineering trade-offs instead of overengineering

## Status
The project is actively developed.
Possible future improvements:
* additional document formats
* smarter layout heuristics
* accessibility enhancements
