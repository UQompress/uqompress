# UQompress — Editor UI Rebuild

Refactor the editor page. Reference screenshot is the target layout. Work through the tasks
in order. Do not change the Setup page, the upload pipeline, or the AI generation contract.

## 0. BEFORE YOU START

Read the contents of `public/Icons` and list the actual filenames. Use those exact files for
every toolbar icon below. Do not install an icon library, do not create new SVGs, do not
guess filenames. If an icon for a feature is missing from that directory, tell me which one
rather than substituting.

## 1. TOP NAVBAR

Left: "CheatSheet Studio" wordmark, then course code (INFS1200).
Right: Samples | Setup | Editor | [Export to PDF button, purple, download icon]

"Samples" replaces the old "View sample" button that lived in the left sidebar — remove it
from the sidebar. Samples opens the existing sample view.
"Editor" is the active state (purple text).

## 2. FORMATTING TOOLBAR (new, sits below the navbar, full width)

Left to right, with vertical divider lines between the groups shown:

Group A — Search
  - Magnifier icon. Renders and is clickable but does nothing yet. Add an onClick stub with
    a TODO comment.

Group B — History
  - Undo, Redo
  - History stack holds a MAXIMUM OF 10 states. Pushing an 11th drops the oldest.
  - Tracks: text edits, block add/delete/move/resize, formatting changes, page add/delete.
  - Disable (greyed, not hidden) when the respective stack is empty.
  - Wire Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z.

Group C — Font size
  - [ − ]  [ numeric input ]  [ + ]
  - Steppers move through this scale: 5, 5.5, 6, 6.5, 7, 8, 9, 10, 11, 12, 14, 16, 18, 24
  - The input is directly editable and accepts any value 4–72.
  - Shows the size of the current selection. Mixed selection shows blank.
  - DEFAULT IS 6, not 12. See section 6.

Group D — Character formatting
  - Bold, Italic, Underline
  - Font colour: letter "A" icon with a COLOUR BAR underneath. The bar renders in the
    currently selected font colour. Clicking opens a swatch picker; picking a colour updates
    both the bar and the selection. Clicking the icon itself reapplies the bar's current colour.
  - Highlight: marker icon with the same colour-bar behaviour, showing the currently selected
    highlight colour.
  - Active states: Bold/Italic/Underline show a filled/pressed background when the caret sits
    inside text with that formatting.

## 3. LEFT SIDEBAR — EDIT / COMPARE TABS

Two tabs across the top of the sidebar: "Edit" (active, purple background) and "Compare".

### Edit tab
Contains, in order:

  PAGES  (new section, put it first)
    - Thumbnail list of pages, current page highlighted
    - [+ Add page]  [Delete page]
    - Delete is disabled when only one page exists, and confirms before deleting a page that
      has blocks on it

  LAYOUT GRID
    - Rows / Columns numeric inputs (keep existing behaviour)

  BLOCKS
    - Text  ← becomes a dropdown, see section 4
    - Table
    - Image
    - Divider

  DESIGN ELEMENTS
    - Straight line, Arrow, Tick, Circle

Both BLOCKS and DESIGN ELEMENTS get a chevron and are collapsible.

### Compare tab
Renders an empty page area. No layout grid, no blocks, no design elements, no formatting
toolbar interaction. Just a blank canvas placeholder. Switching back to Edit restores the
full editor with state intact.

## 4. TEXT BLOCK DROPDOWN

The "Text" sidebar item becomes an expandable dropdown listing four block types, each shown
as a live style preview (as in the screenshot):

  TOPIC      — rendered in the dropdown with its purple background
  SUBTOPIC
  BODY
  SUB BODY

Clicking any of them inserts a block of that type onto the canvas. A block's type can be
changed after insertion via a control on the selected block.

Style definitions — these are the print styles, apply them at 100% canvas zoom:

  TOPIC
    font-size: 7pt, bold, UPPERCASE (transform, don't force the user to type caps)
    color: white
    background: purple (use the existing brand purple already in the codebase)
    full width of its grid column, ~2px vertical padding, ~4px horizontal

  SUBTOPIC
    font-size: 7pt, bold, UPPERCASE, no background

  BODY
    font-size: 6pt, regular
    label-before-colon rule applies, see section 5

  SUB BODY
    font-size: 5.5pt, regular, small left indent
    for continuation lines and nested points under a body block

  All four: line-height 1.15, margin between blocks ~2px, ~4px above a TOPIC block.

## 5. THE LABEL-BEFORE-COLON RULE (currently broken — this is the priority fix)

In BODY and SUB BODY blocks, text follows the pattern:

    Candidate Key: Minimal superkey; no attribute can be removed.

Everything up to and including the FIRST colon renders BOLD. Everything after renders regular.
Right now nothing is bolding — fix it.

Requirements:
  - Applies live as the user types, not only on blur
  - Only the FIRST colon in the block triggers it. Later colons are plain text.
  - A block with no colon renders entirely regular
  - Do not bold a colon that appears inside an equation or after a digit
    (e.g. "Ratio: 3:1" bolds only "Ratio:")
  - If the user manually changes the bolding of that label range, set a per-block
    `manualLabelFormat: true` flag and stop auto-applying for that block. Manual formatting
    always wins.

## 6. FONT SIZES ARE TOO BIG — GLOBAL RESET

Current defaults are far too large for a printed cheat sheet. Apply the scale in section 4.
New text blocks default to 6pt. The toolbar size input defaults to 6. Update any hardcoded
default sizes elsewhere in the editor to match.

Sanity check: an A4 page at 100% zoom should fit roughly 90–110 lines of body text per
column. If it fits noticeably fewer, the sizes are still too big.

## 7. RICH TEXT SELECTION EDITING

Text blocks become rich-text editable — click and drag to select a range, then apply
bold / italic / underline / font colour / highlight / font size to just that range, the way
Google Docs works.

  - Use contentEditable on the block with a stored HTML string, not a plain string
  - Toolbar buttons act on the current Range
  - Toolbar active states and the size input reflect the current selection on every
    selectionchange
  - Selection must survive clicking a toolbar button (don't let the button steal focus —
    preventDefault on mousedown)
  - Sanitise pasted content: strip everything except b/i/u/span, and on span keep only
    color, background-color, font-size

DATA MODEL NOTE — important:
The AI generation pipeline emits PLAIN TEXT in card `body` fields and must keep doing so.
Do not change that contract. Convert plain text to the block's HTML representation at the
moment a card is inserted onto the canvas, applying the label-before-colon rule from
section 5 at that point. The AI never emits HTML.

## 8. EXPORT TO PDF MENU

Clicking Export to PDF opens a panel, not an immediate download:

  - Checkbox list of all pages with thumbnails, all checked by default
  - Select all / deselect all
  - Export button is disabled when zero pages are selected
  - Exports only the checked pages, in page order
  - Page size A4, and the exported text must match the on-screen point sizes exactly —
    verify a 6pt body block exports as 6pt, not scaled

## 9. RIGHT PANEL

No structural changes. Keep the generated content list (Key Theories / Example Question /
Common Errors) and its collapsible section headers as they are.

## ACCEPTANCE CHECKS

  1. Every toolbar icon comes from a real file in public/Icons
  2. Typing "Candidate Key: minimal superkey" in a body block bolds through the colon only
  3. Selecting three words and hitting bold bolds only those three words
  4. The font colour bar changes colour after picking a colour, and stays changed
  5. Undo pressed 11 times restores at most 10 steps
  6. Compare tab shows a blank page with no editing tools, and Edit tab returns unchanged
  7. Adding a page, drawing on it, then exporting with only page 1 checked produces a
     one-page PDF
  8. A default new text block is 6pt, not 12pt