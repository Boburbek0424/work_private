# VELOX Virtual Store

A 3D sportswear store that runs in the browser. You walk around a showroom, step up to a wall, browse a rail of hanging products, and turn any product a full 360°. It has a working bag and checkout, plus sign-in and join pages where the card spins 360°.

Everything is plain HTML, CSS and JavaScript. There is no build step, no framework and no image files: every product is drawn in code as an SVG.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
cd virtual-store
python3 -m http.server 8000
# then open http://localhost:8000
```

## What's inside

| Feature | How it works |
| --- | --- |
| **3D room** | A CSS-3D box with four themed walls (clothing rail, shoe wall, bag cubbies, cap pegboard), a floor and a ceiling. A JS camera orbits, dollies and swings between walls with eased tweens. You can drag it (with inertia), and it slowly orbits on its own when you leave it alone. |
| **Section rails** | Products hang from a rail that runs on a spring. Each hanger is its own pendulum, so items swing when the rail speeds up or stops. Shoes sit on a shelf instead. Drag, scroll, use the arrow keys or click to browse. |
| **360° product viewer** | Each product is a real 3D object: a front face, a back face and silhouette slices between them for thickness. Drag to turn it, pick Front / Side / Back, or let it spin. Opening a product plays a full-turn reveal, and the product glides in from its spot on the rail. |
| **Colorways** | Every product has 2–3 colorways. They are recolored live, and switching spins the product into the new colors. |
| **Bag & checkout** | When you add an item, a copy of it flies into the bag icon. The bag drawer has quantities, a free-shipping progress bar, and checkout with confetti. The bag is saved in `localStorage`. |
| **Sign in / Join** | A two-sided card that spins **360°** when you switch between forms. The branded back faces you halfway through while the form swaps. The card flies in with a spin when you arrive, tilts toward your mouse, and has a 3D text ring orbiting behind it. Includes validation, a password-strength meter and a welcome spin. |
| **Transitions** | Intro curtain, a camera whirl when you leave for the account pages, blur and scale crossfades between views, and a sliding active pill in the dock. `prefers-reduced-motion` is respected. |

## Routes

`#/` store · `#/clothing` · `#/caps` · `#/bags` · `#/shoes` · `#/p/<id>` product · `#/login` · `#/register`

## Files

```
index.html        page shell (intro, room, views, top bar, dock)
css/styles.css    all styling and animation
js/art.js         procedural SVG product art (clothing, shoes, caps, bags)
js/data.js        catalogue: products, colorways, sizes
js/room.js        3D room and camera
js/rack.js        section carousel with pendulum physics
js/viewer.js      360° product viewer
js/cart.js        bag drawer and checkout
js/auth.js        sign-in / join pages with the 360° card
js/app.js         router and view transitions
```

## Notes

This is a front-end demo. No payments are taken. Accounts are stored only in your browser's `localStorage`, with salted SHA-256 hashes, so they are not real authentication. VELOX is a made-up brand.
