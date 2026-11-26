# Invite Studio — editor prototype

Plain HTML + CSS + JavaScript. No npm, no build step, no server needed.

## Run
Open `index.html` in Chrome, Edge or Firefox (double-click works). For a local server use VS Code "Live Server".

## What works
- 3 templates (Wedding, Birthday, Event) rendered from JSON in `js/data.js`
- Add text, photo, shapes, button and 7 decorations (click, or drag onto the invitation)
- Drag, resize, rotate with snapping guides (Moveable); double-click text to edit inline
- Property panel per element: font (12 families), weight, italic, size, spacing, colors, image fit/mask, link, opacity, order, lock, hide
- Layers panel with drag-to-reorder
- Uploads: file picker, drag & drop onto the invitation, or paste (Ctrl+V). Photos are resized to max 1800 px and stored in IndexedDB; SVG/GIF kept as-is
- Undo/redo, keyboard shortcuts, autosave (draft in localStorage, images in IndexedDB)
- Preview (phone/desktop) and Export: one standalone `.html` file with images and fonts embedded; works offline

## Files
- `js/data.js` fonts, decorations, templates (edit this to add templates)
- `js/store.js` state, undo/redo, saving, upload processing + asset library
- `js/render.js` the single renderer used by editor, thumbnails, preview and export
- `js/canvas.js` artboard, selection, Moveable, inline text editing
- `js/panels.js` side panels and property inspector
- `js/app.js` top bar, shortcuts, preview/export, boot
- `vendor/` Moveable, Sortable (MIT). `fonts/` local web fonts (OFL). `js/icons.js` Lucide icons (ISC)

## Data model (what a backend would store)
`{v, name, template, page:{bg, bgAsset, h, ink, accent, fonts, palette}, elements:[{id, type, x, y, w, h, r, o, lock, hide, ...type props}]}`
Images are referenced by `asset` id. The artboard is 390 px wide and scales to the viewport when published.

## Known limits
- Uploaded images live in this browser only (no cloud/accounts yet)
- Single selection only; no opening animation or RSVP yet
- Rebuilding `js/fontdata.js` / icons is only needed if you add fonts or icons
