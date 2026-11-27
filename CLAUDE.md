# CLAUDE.md

## Tech Stack

- Plain HTML, CSS, and JavaScript only.
- No frameworks and no build step. Files open directly in a browser.

## Project Structure

- `index.html`: the homepage, at the top level
- `tools/`: one page per tool (`tool-1.html` is a placeholder)
- `css/base.css`: shared styles and the light/dark theme colors
- `js/theme.js`: the theme toggle, shared by every page
- `assets/`: images and other static files (create when first needed)

Update this section when the structure changes.

## Key Requirements

1. Every page must be responsive and work on desktop, tablet, and phone.
2. Users can toggle between a light and a dark theme. The default is the light theme.
3. Text must stay easy to read, with good contrast, in both the light and the dark theme.

## Rules for Claude

- Explain technical terms in plain language.
- Ask before making big changes.
- Ask rather than guess when something is unclear.

## Feature Plan

A web portal where students try out small aircraft-systems tools in the browser. Everything runs client-side, with no backend.

### Portal structure

- **Homepage** (`index.html`): a short intro and one card per tool. The theme toggle sits in the header.
- **Opening a tool:** the visitor clicks a tool's card and lands on that tool's own page in `tools/`.
- **Getting back:** every tool page has a "Back to all tools" link at the top, plus the portal name in the header, which also links home.
- **Adding a new tool later:** create one new page in `tools/`, then add one card for it on the homepage. Shared styles and the theme toggle are reused, so nothing else changes.

### Phases

**Phase 1: the portal plus its first tool**
- [x] Portal shell: homepage, shared header, light/dark theme toggle, and a placeholder card ("Tool 1 — coming soon") that opens its page and links back. Styling is simple and neutral; the visual design is chosen later.
- [ ] First tool: a Pitot-static simulator. The student sets altitude, airspeed, and climb or descent rate, then picks a blockage (none, pitot blocked, pitot and drain blocked, or static blocked). The tool shows what the airspeed indicator, altimeter, and vertical speed indicator would read, with a short plain-language explanation.

**Phase 2: more tools**
- Add further aircraft-systems tools one at a time, using the steps above. Tools are chosen when phase 1 is done.
