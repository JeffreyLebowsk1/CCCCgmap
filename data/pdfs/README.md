# Campus PDF Maps

All 12 campus/center map PDFs are stored in this directory and are wired up
in `data/campuses.json` via the `campusPdf` field.

## File naming convention

| Campus / Center | Filename | Status |
|---|---|---|
| Lee County Campus | `lee-campus-map.pdf` | ✅ linked |
| Chatham Campus | `chatham-campus-map.pdf` | ✅ linked |
| Harnett Campus | `harnett-campus-map.pdf` | ✅ linked |
| Siler City Center | `siler-city-campus-map.pdf` | ✅ linked |
| Chatham Health Sciences Center | `chatham-health-sciences-campus-map.pdf` | ✅ linked |
| Harnett Health Sciences Center | `harnett-health-sciences-campus-map.pdf` | ✅ linked |
| West Harnett Center | `west-harnett-campus-map.pdf` | ✅ linked |
| Center for Workforce Innovation | `center-for-workforce-innovation-campus-map.pdf` | ✅ linked |
| Dennis A. Wicker Civic & Conference Center | `dennis-a-wicker-civic-conference-campus-map.pdf` | ✅ linked |
| Emergency Services Training Center | `emergency-services-training-campus-map.pdf` | ✅ linked |
| Dunn Center | `dunn-campus-map.pdf` | ✅ linked |
| Moore Center | `moore-campus-map.pdf` | ✅ linked |

## How it works

Each campus entry in `data/campuses.json` has a `campusPdf` field that points to a
file path relative to the repository root, for example:

```json
"campusPdf": "data/pdfs/lee-campus-map.pdf"
```

When `campusPdf` is set to a non-empty string, a **"📄 Campus Map (PDF)"** link
automatically appears in the campus info panel at the bottom of the sidebar.
Leave the field as `""` (empty string) to hide the link until the PDF is ready.

## Steps to add or replace a PDF

1. Obtain the official campus map PDF (e.g. from the CCCC website or facilities team).
2. Rename the file following the convention above.
3. Drop the file into this directory (`data/pdfs/`).
4. In `data/campuses.json`, set the matching campus's `campusPdf` field to the path,
   e.g. `"data/pdfs/lee-campus-map.pdf"`.
5. Commit and push (or redeploy to GitHub Pages).

The link will appear immediately on the live map — no code changes required.
