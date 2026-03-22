# Campus PDF Maps

Place campus map PDF files in this directory.

## File naming convention

| Campus | Expected filename |
|---|---|
| Lee County Campus | `lee-campus-map.pdf` |
| Chatham Campus | `chatham-campus-map.pdf` |
| Harnett Campus | `harnett-campus-map.pdf` |
| Siler City Center | `siler-city-campus-map.pdf` |

## How it works

Each campus entry in `data/campuses.json` has a `campusPdf` field that points to a
file path relative to the repository root, for example:

```json
"campusPdf": "data/pdfs/lee-campus-map.pdf"
```

When `campusPdf` is set to a non-empty string, a **"📄 Campus Map (PDF)"** link
automatically appears in the campus info panel at the bottom of the sidebar.
Leave the field as `""` (empty string) to hide the link until the PDF is ready.

## Steps to add a PDF

1. Obtain the official campus map PDF (e.g. from the CCCC website or facilities team).
2. Rename the file following the convention above.
3. Drop the file into this directory (`data/pdfs/`).
4. In `data/campuses.json`, set the matching campus's `campusPdf` field to the path,
   e.g. `"data/pdfs/lee-campus-map.pdf"`.
5. Commit and push (or redeploy to GitHub Pages).

The link will appear immediately on the live map — no code changes required.
