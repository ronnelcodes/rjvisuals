# RJ Visuals Editorial Redesign

## What's new
- New `index.html`, `styles.css`, and `script.js` designed around a personal, photography-led editorial aesthetic.
- Design inspiration: welcoming photo-first portfolios and expressive editorial storytelling. All layout and code is original.
- Approved colors: Studio Black `#171519`, Deep Plum `#563A54`, Portrait Mauve `#A77C91`, Champagne Gold `#C7A66A`, Gallery Ivory `#F7F3EE`.
- Real curated uploaded photographs appear in the homepage and links to the curated family, portrait, and couples galleries.
- Mobile navigation, responsive layouts, accessible links and reduced motion support.

## Source files
- `index.html`: redesigned homepage
- `styles.css`: new homepage styles
- `script.js`: menu, scroll reveal, year
- `portraits.html`, `couples.html`, `families.html`: existing curated portfolios
- `investment.html`: previous investment and print price plan
- `legacy.css`: styles for existing secondary pages, preserved to avoid regressions
- `admin.html`, `gallery.html`, and associated scripts: pre-existing gallery management scaffolding
- `supabase/`, `netlify/`, `config.js`: existing backend integration scaffolding

## Current prices and labs (unchanged)
Session collections: Foundation $220, Generation $385, Legacy $605, Vibe $385, Iconic $770, Luxe $1,072.
Extra images: $25 each, 3 for $65, 5 for $95.
Print sizes: 4x6 $6.99; 5x7 $11.99; 8x10 $24.99; 11x14 $44.99; 16x20 $89.99; 20x30 $149.99. $20 minimum print subtotal before shipping and tax.
Primary lab: Bay Photo. Alternative: Nations Photo Lab. Final contender: Miller's Professional Imaging.

## Running locally
Open `index.html` in a browser. For reliable local navigation, run `python -m http.server 8000` within the folder and visit `http://localhost:8000`.

## Deployment
Deploy this folder (with `index.html` at root) to a **staging** Netlify site first. Verify each link, mobile layout, and the existing admin/gallery functionality before changing the live domain. Do not put Supabase service-role keys in front-end code. Set environment secrets in your deployment platform.

## Important production limitations
- The site is code-complete for its public-facing static pages, but has not been live-browser or backend integration tested.
- Existing protected client gallery, email recovery, watermarking, storage, and admin features require Supabase/Netlify configuration and security testing. They are not safe to consider production-ready by virtue of appearing in this zip.
- The $20 minimum is presented on the Investment page. It must additionally be configured at the actual external store's checkout; this bundle cannot enforce purchases on external checkout.
- The booking link points at the existing website's `/booking` route. Verify it after deployment.
- The public portfolio contains photographs of identifiable people including minors. Confirm publication/model releases for every image before going live.
- Only optimized portfolio WebP copies are included. Original uploaded image files are not included.

## Design note
This redesign is inspired by the overall sensibility of Jeremy Poland and Iconic by Gabriel, not a copy of their source code, artwork, or branded elements.

## v7 photography-first direction

Creative weighting: 75% Jeremy Poland (approachable introduction, dense image-led portfolio, easy inquiry), 20% Iconic by Gabriel (expressive artistic voice and editorial typography), 5% Jeramie Lu (direct service clarity). Original RJ Visuals design and photography are retained, not copied from reference sites.

All visible per-photo captions, photo indices and lightbox captions have been removed from the homepage and portfolio galleries. Image `alt` descriptions remain for assistive technology. Gallery names and section headings remain as navigation, not photo captions.

New file: `photography-first.css`. The new homepage references `styles.css`, `photography-first.css` and `script.js`. Other gallery and business pages, private gallery backend, print price information, and $20 minimum print policy are preserved. Preview on a staging domain before launch.


## v8 Investment page correction
Family Sessions: Foundation $220 (30 min, 5 edits); Generation $385 (60–90 min, 10 edits, highlighted Most Popular); Legacy $605 (up to 2 hr, full gallery). Pride & Editorial Sessions: Vibe $385 (60 min, 10 edits); Iconic $770 (up to 2.5 hr, 20 edits, highlighted Most Popular); Luxe $1,072 (up to 3.5 hr, full gallery). Styling, galleries and consultation inclusions displayed on the Investment page. This restores details recovered from earlier pricing work; confirm current contractual terms before publication. Pride & Editorial Most Popular is design placement and not independently verified from an earlier live page. Print products, $20 minimum, labs, photography and administration files were preserved.


## v9 navigation and licensing
All pages now use a top hamburger menu, regardless of screen size, including all public pages and studio admin. `navigation.css` and `navigation.js` are shared. `terms.html` provides strengthened copyright and use licensing information; Investment includes a summary. Confirm final licensing terms with a Nevada attorney and ensure the customer agreement matches before publishing.
