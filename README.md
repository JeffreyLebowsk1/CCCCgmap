# CCCCgmap – Central Carolina Community College Campus Map

An interactive Google Maps integration for all CCCC campuses and centers, providing
building search, turn-by-turn navigation, and an OGC-compliant KML export for
submission to Google Maps as an official overlay.

---

## Features

| Feature | Details |
|---|---|
| All 12 campuses & centers | Lee County · Chatham · Harnett · Siler City · Chatham Health Sciences · Harnett Health Sciences · West Harnett · Center for Workforce Innovation · Dennis A. Wicker · Emergency Services Training · Dunn Center · Moore Center |
| Building markers | `AdvancedMarkerElement` + `PinElement` (non-deprecated API) |
| Building info | Name, code, type, departments, hours, accessibility |
| Search | Live local search + Google Places Autocomplete |
| Navigation | In-map `DirectionsService` + "Get Directions" Maps URLs |
| Street View | One-click Street View launch from any building |
| Parking lots | Subtle separate markers for all lots |
| Campus PDF maps | 📄 One-click PDF map button for every campus/center |
| KML export | `campuses.kml` – OGC KML 2.2, importable into Google My Maps |
| Responsive | Works on desktop and mobile |
| Accessible | ARIA landmarks, roles, live regions, keyboard navigation |

---

## Campus & Center PDFs

All 12 campus map PDFs are stored in `data/pdfs/` and linked via the `campusPdf`
field in `data/campuses.json`. A **📄 Campus Map (PDF)** button appears automatically
in the sidebar for each location.

| Campus / Center | PDF File |
|---|---|
| Lee County Campus | `lee-campus-map.pdf` |
| Chatham Campus | `chatham-campus-map.pdf` |
| Harnett Campus | `harnett-campus-map.pdf` |
| Siler City Center | `siler-city-campus-map.pdf` |
| Chatham Health Sciences Center | `chatham-health-sciences-campus-map.pdf` |
| Harnett Health Sciences Center | `harnett-health-sciences-campus-map.pdf` |
| West Harnett Center | `west-harnett-campus-map.pdf` |
| Center for Workforce Innovation | `center-for-workforce-innovation-campus-map.pdf` |
| Dennis A. Wicker Civic & Conference Center | `dennis-a-wicker-civic-conference-campus-map.pdf` |
| Emergency Services Training Center | `emergency-services-training-campus-map.pdf` |
| Dunn Center | `dunn-campus-map.pdf` |
| Moore Center | `moore-campus-map.pdf` |

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

> **Submitting all 12 campus PDFs**: After importing the KML, you can attach
> each campus map PDF as a link in the placemark description by editing the
> individual placemarks in Google My Maps and adding the hosted PDF URL.

### Option B – Google Maps Connect (official institution listing)

Google Maps Connect lets verified institutions submit indoor/campus maps for
display directly inside Google Maps (requires Google verification of the
organisation).

1. Sign in at [Google Maps Connect](https://maps.google.com/maps/user-msft-connect).
2. Claim or create a listing for **each CCCC campus/center** (all 12 locations).
3. Under **Indoor Maps / Campus Maps**, upload `campuses.kml`.
4. Complete Google's verification process (usually 5–10 business days).

> **Per-location submissions**: Google Maps Connect supports multiple locations
> under a single verified organisation. Submit each of the 12 campus/center
> addresses separately to ensure they all appear in Google Maps search results.

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

### Option D – Google Business Profile (recommended for discoverability)

For maximum visibility in Google Search and Maps, claim or create a
**Google Business Profile** for each campus location:

1. Go to [Google Business Profile](https://business.google.com/).
2. Search for each CCCC campus/center by name and address.
3. **Claim** existing listings or **Add your business** for new ones.
4. Complete the verification process for each location (postcard or phone).
5. Add the campus map PDF as a linked document in the business description
   or as a post on the profile.

> Verified Google Business Profiles appear on Google Maps with hours, photos,
> reviews, and direct links — no API key required for end users.

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
    ├── campuses.json   Campus and building data (single source of truth, 12 locations)
    └── pdfs/           Campus map PDFs (one per campus/center – see data/pdfs/README.md)
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
| All 12 campus/center PDFs linked | ✅ |

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
2. **Rename** it following the convention in `data/pdfs/README.md` and place it in `data/pdfs/`.
3. **Set the path** in `data/campuses.json` for the matching campus:

   ```json
   "campusPdf": "data/pdfs/lee-campus-map.pdf"
   ```

4. **Commit and push** (or redeploy to GitHub Pages).

A **📄 Campus Map (PDF)** button will automatically appear in the campus info
panel at the bottom of the sidebar. Leaving `campusPdf` as `""` hides the
button until the file is ready.

See `data/pdfs/README.md` for the complete naming convention for all 12 locations.

---

## License

This project is provided for use by Central Carolina Community College.  
Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).  
Mapping services provided by [Google Maps Platform](https://mapsplatform.google.com/)
subject to [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms).
