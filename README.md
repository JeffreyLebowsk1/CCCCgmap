# CCCCgmap – Central Carolina Community College Campus Map

An interactive Google Maps integration for all four CCCC campuses, providing
building search, turn-by-turn navigation, and an OGC-compliant KML export for
submission to Google Maps as an official overlay.

---

## Features

| Feature | Details |
|---|---|
| All four campuses | Lee County · Chatham · Harnett · Siler City Center |
| Building markers | `AdvancedMarkerElement` + `PinElement` (non-deprecated API) |
| Building info | Name, code, type, departments, hours, accessibility |
| Search | Live local search + Google Places Autocomplete |
| Navigation | In-map `DirectionsService` + "Get Directions" Maps URLs |
| Street View | One-click Street View launch from any building |
| Parking lots | Subtle separate markers for all lots |
| KML export | `campuses.kml` – OGC KML 2.2, importable into Google My Maps |
| Responsive | Works on desktop and mobile |
| Accessible | ARIA landmarks, roles, live regions, keyboard navigation |

---

## Quick Start

### 1 – Get a Google Maps API Key

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project (e.g., `cccc-campus-map`).
3. Go to **APIs & Services → Library** and enable:
   - **Maps JavaScript API**
   - **Places API**
   - **Directions API**
4. Go to **APIs & Services → Credentials → Create Credentials → API Key**.
5. Click **Restrict Key**:
   - **Application restrictions**: HTTP referrers → add your domain
     (e.g., `jeffreylebowsk1.github.io/CCCCgmap/*`)
   - **API restrictions**: Restrict to the three APIs above.
6. Copy the key.

### 2 – Create a Map ID (required for `AdvancedMarkerElement`)

1. In Cloud Console go to
   **Google Maps Platform → Map Management → Create Map ID**.
2. Set **Map type**: JavaScript, choose a colour scheme (Light recommended).
3. Save and copy the **Map ID**.

> **Why is this required?**  
> `google.maps.Marker` was deprecated in February 2024. The replacement,
> `AdvancedMarkerElement`, requires a Map ID to enable the vector-rendering
> pipeline. See [Google's deprecation notice](https://developers.google.com/maps/deprecations).

### 3 – Configure the App

Open `js/app.js` and replace the two placeholder values at the top of the file:

```js
const CONFIG = {
  apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',   // ← paste your API key here
  mapId:  'YOUR_MAP_ID',                // ← paste your Map ID here
  ...
};
```

### 4 – Serve the App

Because the Maps API and `fetch('./data/campuses.json')` require HTTP(S), open
the app via a local server rather than `file://`:

```bash
# Python 3
python3 -m http.server 8080
# then open http://localhost:8080

# Node (npx)
npx serve .
```

Or deploy directly to **GitHub Pages**:
1. Push to `main` (or your default branch).
2. In the repository Settings → Pages → Source: select the branch/root.
3. The map will be live at `https://<user>.github.io/CCCCgmap/`.

---

## Google Maps Official Submission

### Option A – Google My Maps (quickest)

1. Go to [Google My Maps](https://www.google.com/maps/d/).
2. **Create a new map → Import**.
3. Upload `campuses.kml` from this repository.
4. Rename layers, adjust icons if desired.
5. **Share → Publish to web** to get an embeddable / shareable link.

### Option B – Google Maps Connect (official institution listing)

Google Maps Connect lets verified institutions submit indoor/campus maps for
display directly inside Google Maps (requires Google verification of the
organisation).

1. Sign in at [Google Maps Connect](https://maps.google.com/maps/user-msft-connect).
2. Claim or create a listing for each CCCC campus.
3. Under **Indoor Maps / Campus Maps**, upload `campuses.kml`.
4. Complete Google's verification process (usually 5–10 business days).

### Option C – KML Layer in an Existing Maps Embed

Host `campuses.kml` at a public HTTPS URL, then add a `KmlLayer` to any
Google Maps JavaScript API page:

```js
const kmlLayer = new google.maps.KmlLayer({
  url: 'https://yourdomain.com/campuses.kml',
  map: map,
  preserveViewport: false,
  suppressInfoWindows: false,
});
```

---

## File Structure

```
CCCCgmap/
├── index.html          Main app (HTML shell + Schema.org JSON-LD)
├── campuses.kml        OGC KML 2.2 export for Google My Maps / submission
├── css/
│   └── styles.css      Stylesheet
├── js/
│   └── app.js          Maps JS API v3 application
│                         • AdvancedMarkerElement + PinElement
│                         • DirectionsService / DirectionsRenderer
│                         • Places Autocomplete
│                         • Custom building search
└── data/
    ├── campuses.json   Campus and building data (single source of truth)
    └── pdfs/           Campus map PDFs (one per campus – see data/pdfs/README.md)
```

---

## Google Maps Platform Compliance Checklist

| Requirement | Status |
|---|---|
| `AdvancedMarkerElement` used (Marker deprecated Feb 2024) | ✅ |
| `mapId` registered in Cloud Console | ✅ (placeholder – must be replaced) |
| Official inline bootstrap loader (`importLibrary`) | ✅ |
| `loading=async` / non-blocking API load | ✅ |
| CSP-safe (no `eval`, nonce-forwarded) | ✅ |
| Places Autocomplete for address search | ✅ |
| DirectionsService for in-map routing | ✅ |
| Maps URLs API for "Get Directions" links | ✅ |
| `viewport` meta tag (required by ToS for mobile pages) | ✅ |
| Schema.org JSON-LD structured data | ✅ |
| ARIA landmarks + live regions (accessibility) | ✅ |
| OGC KML 2.2 with `<Schema>` / `<ExtendedData>` | ✅ |
| API key restrictions documented | ✅ |

---

## Updating Building Data

All building and campus data lives in **`data/campuses.json`**.  
Edit that file to add, remove, or update buildings — both the interactive map
and the KML export should then be regenerated (or regenerate `campuses.kml`
manually following the same structure).

To regenerate the KML from JSON automatically, a Node.js generator script can
be added; open an issue if that would be helpful.

---

## Adding Campus PDF Maps

Campus map PDFs are stored in the **`data/pdfs/`** directory and linked via
the `campusPdf` field in `data/campuses.json`.

### Steps

1. **Obtain** the campus map PDF (e.g. from the CCCC website or facilities team).
2. **Rename** it following the convention below and place it in `data/pdfs/`:

   | Campus | Filename |
   |---|---|
   | Lee County Campus | `lee-campus-map.pdf` |
   | Chatham Campus | `chatham-campus-map.pdf` |
   | Harnett Campus | `harnett-campus-map.pdf` |
   | Siler City Center | `siler-city-campus-map.pdf` |

3. **Set the path** in `data/campuses.json` for the matching campus:

   ```json
   "campusPdf": "data/pdfs/lee-campus-map.pdf"
   ```

4. **Commit and push** (or redeploy to GitHub Pages).

A **📄 Campus Map (PDF)** button will automatically appear in the campus info
panel at the bottom of the sidebar. Leaving `campusPdf` as `""` hides the
button until the file is ready.

See `data/pdfs/README.md` for more details.

---

## License

This project is provided for use by Central Carolina Community College.  
Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).  
Mapping services provided by [Google Maps Platform](https://mapsplatform.google.com/)
subject to [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms).
