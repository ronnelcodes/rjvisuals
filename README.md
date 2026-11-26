# RJ Visuals · Editorial website + private client gallery manager

HTML, CSS and vanilla JavaScript frontend inspired by the energetic typography and animated presentation of Summer Break Studios. Original RJ Visuals branding uses Studio Black `#171519`, Deep Plum `#563A54`, Portrait Mauve `#A77C91`, Champagne Gold `#C7A66A`, and Gallery Ivory `#F7F3EE`.

## What's included

- `index.html`, `styles.css`, `script.js`: responsive public homepage with portfolio filtering, animations, services, FAQ, and gallery entry point.
- `admin.html`, `admin.js`: studio-only login, create/edit/delete galleries, password changes, expiry dates, upload and bulk delete photos, and client link sharing.
- `gallery.html`, `gallery.js`: private, password-protected galleries with expiring watermarked previews, optional original downloads and a printable personal-use release.
- `netlify/functions/admin-gallery.mjs`: authenticated server-side admin operations, signed upload credentials, private storage and generated watermarked previews.
- `netlify/functions/client-gallery.mjs`: server-side password and expiry verification, returns signed preview/download links valid for five minutes.
- `supabase/schema.sql`: database and private storage bucket setup.
- `netlify.toml`: functions routing and private-page headers.
- `config.js`: safe public configuration placeholders.

**IMPORTANT: This is a deployable implementation starter, not a live, configured or security-audited production system.** The demo cannot log in, upload or deliver private galleries until you perform the setup below. Do NOT use it to deliver confidential client photographs before testing it and adding production abuse controls.

## Set up Supabase

1. Create a Supabase project. Keep the project service-role key secret.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Supabase Authentication, create your admin user (email + strong password). Consider enabling MFA in Supabase and requiring MFA in an upgraded admin gateway before production.
4. Copy the admin user's UUID from Supabase Auth Users, then run:

   `insert into public.studio_admins(user_id) values ('YOUR-REAL-USER-UUID');`

5. Confirm both storage buckets, `client-originals` and `client-previews`, are **private**, and that tables have RLS enabled. Do not create public read policies.
6. Put the Supabase URL and **publishable / anon** key in `config.js`. This key can be public. **Never** put the service-role key here.

## Configure Netlify

1. Install dependencies with `npm install` and connect the repository or folder to Netlify using a Git-based deployment. `netlify.toml` has publish dir `.` and the functions directory.
2. In Netlify's environment variables (server-side), set:
   - `SUPABASE_URL`: your project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: your project's **secret** service role key
3. Deploy to a **preview subdomain first**, not `rjvisuals.online`.
4. Sign in at `/admin.html` and create a test gallery. Upload a few test images. Open `/gallery.html?g=your-gallery-slug` in a private window and verify password protection, previews, download toggles, expiry, and deletion.
5. Enable rate limiting/WAF for `/api/client-gallery` to prevent brute-force password attempts, and monitor access logs. Consider a CAPTCHA or invitation-based sign-in for higher-security delivery.
6. Schedule backups/retention and configure privacy, data-handling and deletion procedures before live customer delivery. Use strong, unique gallery passwords sent separately from the link.
7. Audit Netlify Function size/time limits and Supabase storage usage, especially with large uploads and many high-resolution images.

**Upload flow:** browser obtains a signed, single-use upload token from the authenticated admin endpoint, uploads original to private storage, then the server creates a compressed, watermarked preview. Browser clients never receive the original storage path or privileged credentials as an unrestricted read URL. When gallery downloads are enabled, signed download links expire in five minutes.

**Important constraints:** Upload interruption after the original has been stored can leave orphaned files. The included system does not yet offer automated cleanup, multi-admin audit logs, email delivery, payment automation, studio contracts, legal-compliant privacy notices, or a full booking CRM. Browser right-click discouragement does not prevent screenshots or copying. A signed image link can be shared during its five-minute lifetime. A 14-day gallery expiration prevents future link issuance but does not delete already downloaded images or automatically remove stored files.

**Print release:** The optional printable release is a basic personal-use template generated from the gallery metadata. Review/replace with your own final photographer-approved release language before enabling this for clients. It is not a digital signature or legal verification service.

## Photography files

Put your public marketing photos in `assets/` with these names:
- `hero.jpg`
- `portrait.jpg`
- `couples.jpg`
- `families.jpg`
- `branding.jpg`

No photos are included. Do not publish private client gallery files to public `assets/` and get marketing permissions before adding identifiable client images.

## Booking / migration

Public booking links point to `https://rjvisuals.online/booking` as on the current live site. Verify links and preserve the current booking form and its 25% non-refundable deposit process before switching your domain. If the existing booking form lives on the same domain, plan its migration or build an equivalent replacement first; deploying this static website over the existing hosting does **not** migrate the booking backend, payment provider or existing client galleries.

## Testing

- `node --check script.js`, `node --check admin.js`, `node --check gallery.js` and each `.mjs` function check JS syntax.
- `npm install` then `npx netlify dev` to run functions locally, with server environment variables supplied by your development environment.
- Test desktop and mobile, keyboard menus, image loading, client access expiry, signed URLs, password failures and admin authorization. Test a 100+ photo gallery for load performance.

## Next-phase opportunities

Add accessible package/pricing guide, policy pages, detailed photographer bio, location-permit FAQ, accessible contact and inquiry intake, commercial usage licensing, sales tax review, ADA-minded accessibility, SEO location landing pages, Google Business Profile, reviews, analytics/consent, and a proper studio contract/model release workflow.

## v3: Password recovery and printing

- **Studio/admin password reset:** `admin.html` has a *Forgot your studio password?* link using Supabase Auth `resetPasswordForEmail()` and `updateUser()`. In Supabase Auth URL configuration, set Site URL to your published HTTPS address and allow `https://YOUR-DOMAIN/admin.html` as a redirect URL. Configure Supabase SMTP so recovery emails reliably arrive. Anyone with a valid studio email can request a recovery link, but only users in `studio_admins` may manage galleries.
- **Gallery password recovery:** Every gallery has a client recovery email, set when the gallery is created. A client who knows the gallery code and has access to that registered email can request an emailed, single-use link valid for 30 minutes. Recovery requests are limited to 3 per gallery per hour; generic confirmation avoids straightforward email enumeration. Provide `RESEND_API_KEY`, `RECOVERY_FROM_EMAIL` (verified sender at Resend), and `SITE_URL` (your production `https://` address) as **Netlify server-side environment variables**. Never put the Resend API key in `config.js`. Run the additions in `supabase/schema.sql` on your existing Supabase database before deploying. For abuse-resistant production rollout, also implement IP-based rate limiting/WAF and CAPTCHA on the recovery request endpoint, and load test token concurrency. Existing galleries require a recovery email to be added by the admin.
- **Right-click:** Photo previews suppress context-menu and dragging, with watermark overlays and short-lived URLs. This is an inconvenience barrier, **not** copy protection. Screen captures, Developer Tools and network requests cannot be blocked by JavaScript.
- **Print purchases:** In the gallery editor, set an HTTPS **Print store URL** for a gallery. Client gallery viewers then see a *Shop prints* link to a dedicated print storefront (e.g. Pic-Time or Pixieset). This is an external link, **not an automated per-image cart or built-in checkout**. You must create the corresponding gallery, configure your products/prices, choose a fulfillment lab, and check privacy/access controls in the print platform. Never paste a public print gallery link for confidential photos. A native per-photo print checkout would require a further integration and supplier API/fulfillment workflow.
- **Testing:** Verify studio recovery on an email you own; test client reset links, expiry, reuse rejection, throttling, mail delivery, false email, print store linking, and gallery access with unapproved accounts before publishing. Do not upload real client photos until all flows and privacy protections are verified.


## v4: Investment page, print pricing and lab contingency (November 2026)

- **New `investment.html` and `investment.js`**: lists retained session prices (Foundation $220, Generation $385, Legacy $605, Vibe $385, Iconic $770, Luxe $1,072), extra digital image collections (1/$25, 3/$65, 5/$95), and updated physical-print pricing. Verify exact package inclusions against the current booking platform before launch; this standalone static website does not migrate the full existing package descriptions or booking backend.
- **Physical Lustre prints**: 4×6 $6.99, 5×7 $11.99, 8×10 $24.99, 11×14 $44.99, 16×20 $89.99, 20×30 $149.99. Bundles of three: 4×6 $17.99; 5×7 $29.99; 8×10 $64.99. Prices are proposed retail prices, subject to final shipping/tax and lab quote checks.
- **Lab contingency plan in `admin.html`**: primary Bay Photo; alternative Nations Photo Lab; final contender Miller's Professional Imaging (account rates and samples pending). Verify customer approval of materially changed substitutions. Do not split an ordinary single order between labs by default.
- **Minimum print purchase is $20 pre-tax and pre-shipping**. The investment-page estimator displays remaining amount but is **not** a checkout system; it cannot enforce a rule in an external provider's checkout. In Pixieset, create a **Self Fulfillment** price sheet, list the products and set **Minimum Order Amount = $20**, then assign that price sheet to each selling gallery. Confirm the checkout actually blocks under-$20 print orders before launch. If digital goods are offered in the same price sheet, ensure the provider's minimum semantics match your prints-only requirement; consider separating the digital sale workflow if needed. Pixieset documentation: https://help.pixieset.com/hc/en-us/articles/115002706031-Creating-a-price-sheet and https://help.pixieset.com/hc/en-us/articles/115003792872-Order-fulfillment-options.
- **Manual fulfillment:** customer orders in Pixieset, RJ Visuals reviews crop and output, then orders from Bay Photo and manually updates the order. Gallery `printStoreUrl` remains an external link and **does not synchronize order status**, provide single sign-on or purchase individual images inside the custom gallery. Confirm that print store gallery permissions don't expose private photographs.
- **DO NOT deploy over the current domain until booking and other live pages are migrated**: existing `/booking` links reference the current domain and could become broken on cutover.


## Family photography portfolio (v5)
All 16 user-supplied family photographs are included in `assets/families/`, with 16 optimized larger images and 16 small thumbnails. `families.html` provides a responsive portfolio and keyboard-operable lightbox, accessible through the Family card and navigation on the homepage. `assets/families.jpg` is the featured family photo. The website package does not contain original uploaded full-resolution files. This is a **public portfolio**, NOT a protected client gallery. Before deploying, confirm consent/model releases for public display, especially for minors. No uploaded photos were added to the private Supabase-backed client gallery.


## Curated public portfolio update
- Portraits: 12 selected photographs at `portraits.html`.
- Couples: 10 selected photographs at `couples.html`.
- Families: 8 selected photographs at `families.html`.
- The homepage hero and portfolio tiles now use actual RJ Visuals photography.
- All deployed copies are resized WebP with metadata excluded. Original full-resolution uploaded photographs are NOT packaged.
- Confirm written permission/model releases for public display, including parental or guardian permission for minors.
- Existing client gallery security code and session/print pricing were not changed; configure backend services separately before launch.
