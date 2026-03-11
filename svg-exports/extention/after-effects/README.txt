Extension AE Layered Export
===========================

Generated at: 2026-03-11T20:32:00+08:00
Source: extension/popup.html

Files:
- extension-layered-ae.svg
- extension-layered-ae.layers.json
- logo.svg

Notes:
- Layer coordinates are measured from the rendered popup layout.
- `extension-layered-ae.svg` is rewritten as AE-safe SVG primitives only (`rect`, `ellipse`, `path`, gradients).
- No `foreignObject`, HTML, CSS variables, or media queries are used in the AE export.
- Layer names are preserved as `<g id="layer-*">` and mirrored in the manifest JSON.
- `logo.svg` is text-free vector geometry for reliable After Effects import.
