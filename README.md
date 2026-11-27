# Tom's Barn Builder

A touch-first 3D planner for a pole barn addition. Arrange vehicles and equipment, add doors and windows, change wall height, roof pitch and colors, keep several named projects, and print a four-sheet blueprint.

## Files

- `app.html` is the source: page content without a document wrapper.
- `index.html` is the standalone page that GitHub Pages serves. It is generated, so do not edit it by hand.
- `build.py` wraps `app.html` into `index.html`.

## Changing it

```
python3 build.py
```

Run that after editing `app.html`, then commit both files.

## Notes

- Everything is saved in the browser on the device being used. Nothing is sent to a server.
- three.js and jsPDF load from public CDNs, so the page needs an internet connection to start.
- Dimensions come from a hand sketch. Check all measurements before building anything.

## Tests

`tests/link-roundtrip.js` sends barns through a share link and checks every field arrives unchanged. Run it after any change to what a barn stores:

```
LIBS=/path/to/three-and-jspdf node tests/link-roundtrip.js
```

`LIBS` is a folder holding `three.min.js` (r128), `OrbitControls.js` and `jspdf.umd.min.js` (2.5.1), since the test runs offline. Needs Playwright.

Short links leave out anything equal to `LINK2_BASE` in `app.html`. Never change `LINK2_BASE`; old links depend on it.
