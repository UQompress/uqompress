# UQompress

**A study platform that turns the materials you already have into something you can learn from — then a page-constrained cheat sheet you can actually print.**

UQompress is the cheat-sheet making version of Canva: a visual, drag-and-drop studio for A4 revision sheets, built for UQ students. You upload lecture slides, past exams, tutorials, and notes. The app reads those files, shows you what the course actually tests, generates compact study cards, and lets you design the final sheet like a canvas — not a document editor.

UQCS 2026 Hackathon project.

---

## What it does

Most revision tools stop at summaries. UQompress is two products in one flow:

1. **Learn from what you uploaded.** PDFs are extracted and analysed against the course profile (learning outcomes). You get ranked topics, question types, and short quizzes so you can see gaps before you start laying out a page.
2. **Design the cheat sheet.** The editor is a Canva-style page: A4 portrait or landscape, grids, text styles, shapes, images, tables, and a pen for handwriting. AI suggestions sit in a side bar and drag onto the page. Export is a real PDF at print size.

The sheet is meant to be printed and read under exam pressure. Generated content is written as tight reference cards (`Concept: the thing itself`), not tutor essays.

---

## How a session works

1. **Start with a course code** (for example `CSSE2010` or `INFS1200`).
2. **Setup** — UQompress looks up learning outcomes from the public course profile. You upload PDFs (slides, past papers, solutions, notes). Analysis ranks topics by how often they appear in the material.
3. **Choose page orientation** — portrait or landscape A4. That is the physical sheet you will print.
4. **Editor**
   - Left: pages, layout grid, text kinds (topic / subtopic / body / sub-body), tables, images, and design marks (line, arrow, tick, circle, cross).
   - Centre: a real A4 canvas. Snap, align, resize, rotate, zoom.
   - Right: AI Suggestion Bar — pick a topic, optionally sit a short quiz, then generate *key theory*, *worked examples*, and *common errors*. Drag a card onto the page.
   - Top: formatting (bold, italic, underline, colour, highlight) and a **pen** for freehand ink (draw, underline, handwrite).
5. **Export** selected pages to PDF. On-screen sizes match print (1 CSS pixel = 1 pt), so 12 px body text exports as 12 pt.

You can add more PDFs later; analysis re-runs on the full set. Uploaded files stay available under **View materials**.

---

## Features

**Study from your own corpus**
- PDF text extraction
- Automatic course-profile (ECP) learning-outcome lookup
- Topic ranking with frequency and rationale
- Per-topic quizzes and results
- Generated content grounded in the files you uploaded, with a sources list

**Canva-style cheat-sheet studio**
- Multi-page A4 canvas (portrait / landscape)
- Drag from the sidebar or from AI cards
- Text hierarchy, highlight, font colour, size
- Tables, images, dividers, and exam-style marks
- Freehand pen annotation (colour + stroke width, undo per stroke)
- Grid layout, snap-to-block alignment, zoom and pan
- Sample sheets for reference
- PDF export of chosen pages

**In progress**
- **QuickFill** — one action that generates the high-frequency study cards and *places them on the A4 page* in a readable layout, instead of dragging each card from the Suggestion Bar. Today “Skip all” already generates every question type into the side bar; QuickFill is the missing layout step (pack cards into the grid, respect page bounds, leave room for the student’s own notes).
- **Handwritten → text** — turn handwriting into an editable text block. A first cut is in the Design Bar: upload a photo of notes → `POST /api/ocr` → Gemini multimodal transcription → new body text on the canvas. Next: read ink already drawn with the pen, not only an uploaded image, and keep math as Unicode rather than LaTeX.

---

## Architecture

The UI is a Next.js 16 App Router app (React 19, TypeScript, Tailwind CSS 4). Almost all product state lives in a single Zustand store on the client. API routes do I/O and model calls; they do not own the canvas.

### Studio store

`lib/store.ts` is the session. It holds the course code, extracted files, analysis topics, quiz answers, generated cards, page list, and every canvas block.

Mutations that change the sheet (`addBlock`, `updateBlock`, `removeBlock`, page add/delete) push a snapshot of `{ blocks, pageCount }` onto a 10-step undo stack. Rapid edits to the same field (typing in a text block) coalesce so undo is per gesture, not per keystroke. Switching course code wipes course-scoped state so the previous sheet cannot leak through.

There is no backend database. Close the tab and the session is gone.

### Canvas as print space

The page is sized in CSS pixels equal to A4 PostScript points (`595 × 842`). That is deliberate: `font-size: 12px` on screen is 12 pt on the exported PDF. `html2canvas` snapshots `#cheat-sheet-page-N` at scale 2 for resolution only, then `jsPDF` maps the image 1:1 onto A4.

Blocks are absolutely positioned records (`x`, `y`, `width`, `height`, `rotation`, `type`, `content`). Types include text, table, image, divider, geometric marks, and `ink`. Content blocks snap into the current row/column grid; freeform marks and ink keep the path the student drew.

Drag uses `@dnd-kit` with three sources: sidebar (click or drop a new block), canvas (move an existing one), and the suggestion bar (drop a generated card as a text block). After a move, edges and centres snap to other blocks on the same page and in the same grid cell (Figma-style guides), then clamp to the page.

Text is a sanitised HTML subset (`b` / `i` / `u` / `span` / `br`), not a full rich-text document. Incoming strings are escaped so a typed `<script>` or a model reply containing `<div>` cannot become markup. Highlight and colour wrap the live selection in spans; `document.execCommand` is only the fallback.

Ink is not a bitmap overlay. Pointer moves become a point list, then one SVG path block per stroke (serialised `d` + viewBox). Undo removes that block. The live draw layer is pointer-capture only while the pen is on, so text editing and drag work again the moment you leave annotation mode.

Selection chrome (resize, rotate, delete, colour) is portalled to `document.body` from the block’s on-screen rect. That keeps a selected block’s toolbar from painting over its neighbours — a stacking-context bug the first version hit.

### Ingestion and analysis pipeline

```
PDFs ──POST /api/extract-pdf──► plain text per file
                                      │
Course code ──POST /api/lookup-ecp──► learning outcomes (scraped course profile)
                                      │
                         POST /api/analyse
                                      │
                         topics + question types + counts
                                      │
              POST /api/generate-questionnaire  (optional quiz)
                                      │
              POST /api/generate-content        (theory / example / errors)
```

**Extract.** `pdf-parse` (pdf.js) runs on the server. `pdf-parse` and `pdfjs-dist` are marked `serverExternalPackages` so Next does not bundle the worker and break it.

**ECP lookup.** The course code is resolved against UQ’s public electronic course profile. Outcomes are parsed from HTML (`cheerio`) and shown on Setup so analysis is aligned with what the course claims to teach, not only what the PDFs happen to contain.

**Analyse.** Each file is truncated (12k characters) and sent in one prompt — no chunk/aggregate pipeline. The model is asked to *count real exam/tutorial questions* and classify them into topic → question type. `frequencyScore` is **not** asked of the model; the route computes `questionCount / totalQuestions` so ranking stays numerically consistent.

**Generate.** Every content call prepends `MD/content-guide.md`: one named concept per card, exam-density wording, no citation tags inline. The model returns JSON only. The client still runs two cleanups: fence-stripping / invalid-escape repair (`extractJson`), and a LaTeX-to-Unicode pass (`stripLatex`) because models emit `\frac` even when told not to, and the canvas has no math renderer.

**Fallback.** If no model client is configured, analyse/generate return mock topics and placeholder cards so the studio remains usable.

The dashboard route still exists, but the live analysis surface is the Suggestion Bar inside the editor (topic → question type → cards). “Add more files” merges PDFs and re-runs analysis on the **full** corpus, then replaces the topic list.

### QuickFill and handwritten → text (current work)

**QuickFill** sits on top of the existing generate loop. Analysis already produces a ranked `Topic[]` with question types and `frequencyScore`. “Skip all” walks that list and calls `/api/generate-content` with no quiz. QuickFill will take those `GeneratedContent` fragments (theory / example / errors), run them through the same `plainTextToBlockHtml` + `estimateTextBlockSize` path used when a card is dragged, then `addBlockAt` into free cells of the current grid so the first page is a usable sheet, not an empty canvas. The hard part is packing: A4 point-space, label-before-colon cards of uneven height, and not covering the student’s later ink.

**Handwritten → text** is a vision pass, not classical OCR. `/api/ocr` accepts a multipart image, base64-encodes it, and sends it to the same Chat Completions client with an `image_url` part and a “transcribe verbatim, Unicode math, `[illegible]` if unsure” prompt. The sidebar inserts the result as a sanitised text block. Extending this to canvas ink means rasterising the selected `ink` path (or a page snapshot) and reusing that route, so the student can sketch a formula and get a typed card without leaving the studio.

---

## Stack

| Area | Choice |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript |
| State | Zustand (client session + undo snapshots) |
| Drag | `@dnd-kit/core` (sidebar, canvas, suggestion cards) |
| PDF in | `pdf-parse` / pdf.js (external server packages) |
| Course profile | HTML scrape + `cheerio` |
| Model | Gemini via the OpenAI SDK’s Chat Completions client |
| PDF out | `html2canvas` + `jsPDF` |
| UI | Tailwind CSS 4, Lucide, custom toolbar SVGs |

```
app/                  landing, setup, dashboard, editor routes
app/api/              extract, ECP lookup, analyse, questionnaire, generate, ocr
components/editor/    page frame, blocks, toolbar, sidebar, suggestions, ink layer
lib/store.ts          session + history
lib/types.ts          Topic, CanvasBlock, GeneratedContent
lib/rich-text.ts      sanitise, wrap selection, label-before-colon
lib/ink.ts            pointer → path → ink block
lib/ai-client.ts      JSON extract, LaTeX flatten, model call
lib/uq-course-profile.ts
MD/content-guide.md   generation contract the model must follow
```

---

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a course code, and start from Setup.

---

## AI usage declaration

- **Claude Code / Cursor agents:** generated and iterated the MVP codebase, including the editor, analysis flow, and pen annotation tool.
