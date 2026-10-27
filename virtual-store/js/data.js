/* VELOX Virtual Store — catalogue.
 * `variants` are colorways; the first one is the default look. */
(function () {
  const VX = (window.VX = window.VX || {});

  const SIZES = {
    clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    shoes: ['US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12', 'US 13'],
    caps: ['S/M', 'L/XL'],
    bags: ['One Size'],
  };

  const raw = [
    // ---------------- clothing ----------------
    { cat: 'clothing', style: 'zip', name: 'Velox Heritage Full-Zip Hoodie', price: 84.99, desc: 'Brushed-back fleece with a clean full zip. The everyday layer that goes with everything.',
      variants: [{ name: 'Summit White', color: '#efeeea' }, { name: 'Ash Grey', color: '#b9bbbe' }, { name: 'Midnight', color: '#25293a' }] },
    { cat: 'clothing', style: 'windbreaker', name: 'Velox Pace Running Jacket', price: 109.0, desc: 'Featherweight ripstop that packs into its own pocket. Built for windy tempo runs.',
      variants: [{ name: 'Slate/Navy', color: '#7d93b8', color2: '#2d3d63', accent: '#ffffff' }, { name: 'Sand/Olive', color: '#d8c7a4', color2: '#5b6338', accent: '#ffffff' }] },
    { cat: 'clothing', style: 'tech', name: 'Velox Tech Fleece Full-Zip Jacket', price: 98.97, desc: 'Our smooth, lightweight tech fleece in a tailored silhouette with a bonded zip pocket on the sleeve.',
      variants: [{ name: 'Tough Red/Black', color: '#d72630', color2: '#1b1b1e' }, { name: 'Glacier/Grey', color: '#bfe1ef', color2: '#5b6066' }, { name: 'Volt/Black', color: '#d6f230', color2: '#1b1b1e' }] },
    { cat: 'clothing', style: 'longsleeve', name: 'Velox Stride Dri-Flow Long-Sleeve Top', price: 54.99, desc: 'Sweat-wicking knit with laser-cut ventilation for long, hot miles.',
      variants: [{ name: 'Volt Green', color: '#55e03a' }, { name: 'Hyper Pink', color: '#ff5fa2' }, { name: 'Black', color: '#1d1d20' }] },
    { cat: 'clothing', style: 'crew', name: 'Velox Solo Fleece Crew-Neck Sweatshirt', price: 64.99, desc: 'Heavyweight fleece crew with ribbed trims and a centered speed mark.',
      variants: [{ name: 'Game Royal', color: '#2b4fae' }, { name: 'Oatmeal', color: '#e6dccb' }, { name: 'Forest', color: '#2f6b45' }] },
    { cat: 'clothing', style: 'puffer', name: 'Velox Summit Ultralight Down Jacket', price: 189.99, desc: '800-fill responsibly sourced down in a quilted shell that weighs next to nothing.',
      variants: [{ name: 'Safety Orange', color: '#ff5a1c' }, { name: 'Black', color: '#202024' }, { name: 'Ice Blue', color: '#a9d6f2' }] },
    { cat: 'clothing', style: 'hoodie', name: 'Velox Club Pullover Fleece Hoodie', price: 59.99, desc: 'The classic. Soft brushed fleece, kangaroo pocket and a roomy hood.',
      variants: [{ name: 'Light Armory Blue', color: '#a8cdee' }, { name: 'Heather Grey', color: '#a7a9ad' }, { name: 'Lilac', color: '#c9b6ea' }] },
    { cat: 'clothing', style: 'coach', name: 'Velox Club Corduroy Coaches Jacket', price: 119.0, desc: 'Fine-wale corduroy, snap front and a drawcord hem. Throwback sideline style.',
      variants: [{ name: 'Light British Tan', color: '#9a5a2e' }, { name: 'Olive', color: '#5f6a3c' }, { name: 'Navy', color: '#24304f' }] },
    { cat: 'clothing', style: 'windbreaker', name: 'Velox Stormrunner Lined Jacket', price: 129.0, desc: 'Our iconic chevron jacket with a soft mesh lining and a stowable hood.',
      variants: [{ name: 'Black/Volt', color: '#2a2a2e', color2: '#d6f52a', accent: '#ffffff' }, { name: 'Royal/White', color: '#2850b4', color2: '#f2f2f2', accent: '#e43c3c' }] },
    { cat: 'clothing', style: 'quarterzip', name: "Velox Sportswear Club 1/2-Zip Fleece", price: 74.99, desc: 'Stand collar, half zip and a relaxed fit. Throw it on after practice.',
      variants: [{ name: 'Gorge Green', color: '#2f6b45' }, { name: 'Burgundy', color: '#6f2238' }, { name: 'Cream', color: '#efe7d6' }] },

    // ---------------- shoes ----------------
    { cat: 'shoes', style: 'runner', name: 'Velox AirStride 9', price: 139.99, desc: 'Springy foam with a breathable engineered mesh upper. Daily trainer, race-day attitude.',
      variants: [{ name: 'White/Volt', color: '#f4f4f2', color2: '#c9f22b', sole: '#ffffff' }, { name: 'Black/Pink', color: '#222226', color2: '#ff4f9a', sole: '#f4f3ef' }] },
    { cat: 'shoes', style: 'runner', name: 'Velox Tempo Flyknit', price: 159.99, desc: 'A one-piece knit upper that hugs your foot like a sock.',
      variants: [{ name: 'Racer Blue', color: '#2f5fe0', color2: '#ffffff', sole: '#f4f3ef' }, { name: 'Total Orange', color: '#ff6a2a', color2: '#1b1b1e', sole: '#f4f3ef' }] },
    { cat: 'shoes', style: 'court', name: 'Velox Court Legacy Low', price: 89.99, desc: 'Leather court shoe with a cupsole that has been on repeat since day one.',
      variants: [{ name: 'White/Gorge Green', color: '#f6f5f1', color2: '#2f7a4b', sole: '#f2ede2', out: '#c9b58f' }, { name: 'White/Navy', color: '#f6f5f1', color2: '#24304f', sole: '#f2ede2', out: '#c9b58f' }] },
    { cat: 'shoes', style: 'high', name: 'Velox Skyline High', price: 129.99, desc: 'A padded high-top with a hoops pedigree and serious ankle presence.',
      variants: [{ name: 'University Red/Black', color: '#d22a2f', color2: '#1b1b1e', sole: '#f6f5f1' }, { name: 'Wolf Grey/White', color: '#a7aab0', color2: '#ffffff', sole: '#f6f5f1' }] },
    { cat: 'shoes', style: 'runner', name: 'Velox Trail Ridge GTX', price: 169.99, desc: 'Waterproof trail runner with lugged rubber for mud, rock and everything between.',
      variants: [{ name: 'Olive/Orange', color: '#5b6640', color2: '#ff6a1f', sole: '#e9e3d4', out: '#3a3a3a' }, { name: 'Stone/Black', color: '#cdbfa3', color2: '#1f1f22', sole: '#f2efe7', out: '#3a3a3a' }] },
    { cat: 'shoes', style: 'runner', name: 'Velox Vapor Sprint', price: 179.99, desc: 'Carbon-plated speed. Light, loud and made for PRs.',
      variants: [{ name: 'Volt/Black', color: '#d4f52a', color2: '#1b1b1e', sole: '#1b1b1e', out: '#d4f52a' }, { name: 'Hyper Pink', color: '#ff5fa2', color2: '#ffffff', sole: '#ffffff' }] },
    { cat: 'shoes', style: 'court', name: 'Velox Court Royale', price: 79.99, desc: 'Clean tennis-inspired lines with soft suede overlays.',
      variants: [{ name: 'Midnight Navy', color: '#24304f', color2: '#ffffff', sole: '#f2ede2', out: '#c9b58f' }, { name: 'Sail/Tan', color: '#efe7d6', color2: '#9a5a2e', sole: '#f2ede2', out: '#9a5a2e' }] },
    { cat: 'shoes', style: 'high', name: 'Velox Dunkline High', price: 119.99, desc: 'Color-blocked leather high-top straight from the archive.',
      variants: [{ name: 'Panda', color: '#f6f5f1', color2: '#1b1b1e', sole: '#ffffff' }, { name: 'Varsity Green', color: '#2f7a4b', color2: '#f6f5f1', sole: '#ffffff' }] },
    { cat: 'shoes', style: 'runner', name: 'Velox Pulse Racer', price: 119.99, desc: 'Retro runner silhouette with modern cushioning underneath.',
      variants: [{ name: 'Grape/Hyper Pink', color: '#6b3fc4', color2: '#ff5fa2', sole: '#f4f3ef' }, { name: 'Sail/Royal', color: '#efe7d6', color2: '#2b4fae', sole: '#f4f3ef' }] },

    // ---------------- caps ----------------
    { cat: 'caps', style: 'cap', name: 'Velox Club Unstructured Cap', price: 29.99, desc: 'Washed cotton twill, curved bill and an adjustable strap back.',
      variants: [{ name: 'College Navy', color: '#2b3f8f' }, { name: 'Sky', color: '#7fb2e6' }] },
    { cat: 'caps', style: 'cap', name: 'Velox Club Futura Cap', price: 29.99, desc: 'A six-panel essential with an embroidered speed mark.',
      variants: [{ name: 'University Red', color: '#d8402f' }, { name: 'Black', color: '#1d1d20' }] },
    { cat: 'caps', style: 'cap', name: 'Velox Dri-Flow Club Cap', price: 32.0, desc: 'Sweat-wicking fabric that keeps you cool on long runs.',
      variants: [{ name: 'Smokey Mauve', color: '#8f7a86' }, { name: 'Volt', color: '#d4f52a' }] },
    { cat: 'caps', style: 'cap', name: 'Velox Heritage Cap', price: 27.99, desc: 'Low-profile, soft crown and a vintage wash.',
      variants: [{ name: 'Summit White', color: '#f2f1ec' }, { name: 'Stone', color: '#cdbfa3' }] },
    { cat: 'caps', style: 'bucket', name: 'Velox Apex Bucket Hat', price: 35.0, desc: 'A breathable bucket with a short brim for sunny days.',
      variants: [{ name: 'Sail', color: '#efede6' }, { name: 'Black', color: '#1d1d20' }] },
    { cat: 'caps', style: 'cap', name: 'Velox Club Trucker Cap', price: 29.99, desc: 'Foam-front trucker with breathable mesh panels.',
      variants: [{ name: 'Medium Olive', color: '#6a6f45' }, { name: 'Burgundy', color: '#6f2238' }] },
    { cat: 'caps', style: 'bucket', name: 'Velox Apex Reversible Bucket', price: 39.0, desc: 'Two colorways in one. Flip it whenever the mood changes.',
      variants: [{ name: 'Orange/Purple', color: '#ff7a1a', color2: '#6b3fc4' }, { name: 'Volt/Black', color: '#d4f52a', color2: '#1d1d20' }] },
    { cat: 'caps', style: 'bucket', name: 'Velox Peak Outdoor Bucket', price: 37.0, desc: 'Water-repellent bucket built for the trail.',
      variants: [{ name: 'Dark Chocolate', color: '#3d2f28' }, { name: 'Forest', color: '#2f6b45' }] },

    // ---------------- bags ----------------
    { cat: 'bags', style: 'crossbody', name: 'Velox Club Crossbody', price: 34.99, desc: 'Compact crossbody for keys, card and phone.',
      variants: [{ name: 'Smoke Brown', color: '#8a6a58' }, { name: 'Black', color: '#1d1d20' }] },
    { cat: 'bags', style: 'crossbody', name: 'Velox Mini Crossbody', price: 29.99, desc: 'A tiny bag with big main-character energy.',
      variants: [{ name: 'Playful Pink', color: '#ff79c3' }, { name: 'Volt', color: '#d4f52a' }] },
    { cat: 'bags', style: 'crossbody', name: 'Velox Futura Crossbody', price: 32.0, desc: 'Lightweight and water-resistant with an adjustable strap.',
      variants: [{ name: 'Mint Foam', color: '#bfe8de' }, { name: 'Lilac', color: '#c9b6ea' }] },
    { cat: 'bags', style: 'crossbody', name: 'Velox Utility Crossbody', price: 36.0, desc: 'Tough ripstop shell with a secure zip pocket.',
      variants: [{ name: 'Iron Grey', color: '#5b5f66' }, { name: 'Stone', color: '#cdbfa3' }] },
    { cat: 'bags', style: 'backpack', name: 'Velox Academy Backpack', price: 45.0, desc: 'A school-to-gym backpack with a padded laptop sleeve and a big front pocket.',
      variants: [{ name: 'Racer Blue', color: '#2357d6' }, { name: 'Black', color: '#202024' }] },
    { cat: 'bags', style: 'backpack', name: 'Velox Elemental Backpack', price: 40.0, desc: 'Simple, roomy and ready for anything.',
      variants: [{ name: 'Safety Orange', color: '#ff5a2c' }, { name: 'Lilac', color: '#c9b6ea' }] },
    { cat: 'bags', style: 'backpack', name: 'Velox Utility Speed Backpack', price: 65.0, desc: 'Weatherized backpack with a quick-access shoe compartment.',
      variants: [{ name: 'Volt', color: '#d4f52a' }, { name: 'Iron Grey', color: '#5b5f66' }] },
    { cat: 'bags', style: 'duffel', name: 'Velox Gym Club Duffel', price: 55.0, desc: 'Your gym essentials, organised. Wet/dry pocket and a padded strap.',
      variants: [{ name: 'University Red', color: '#e02a2a' }, { name: 'Black', color: '#202024' }] },
    { cat: 'bags', style: 'duffel', name: 'Velox Brasilia Duffel', price: 50.0, desc: 'Durable, water-resistant and endlessly packable.',
      variants: [{ name: 'Summit White', color: '#f1f0ec' }, { name: 'Midnight', color: '#25293a' }] },
    { cat: 'bags', style: 'waist', name: 'Velox Heritage Waist Pack', price: 25.0, desc: 'Hands-free storage that sits right on your hip.',
      variants: [{ name: 'Light Blue', color: '#7fc0ec' }, { name: 'Black', color: '#1d1d20' }] },
  ];

  // a variant's colors without its display name (which would clobber the product name)
  function look(v) {
    const { name, ...colors } = v;
    return colors;
  }

  const counters = {};
  const PRODUCTS = raw.map((p) => {
    counters[p.cat] = (counters[p.cat] || 0) + 1;
    const id = { clothing: 'cl', shoes: 'sh', caps: 'cp', bags: 'bg' }[p.cat] + counters[p.cat];
    return { ...p, id, ...look(p.variants[0]), variant: 0, sizes: SIZES[p.cat] };
  });

  // product with a given colorway applied (used for art + cart lines)
  function withVariant(p, i) {
    return { ...p, color2: undefined, accent: undefined, sole: undefined, out: undefined, ...look(p.variants[i]), variant: i };
  }

  VX.SECTIONS = [
    { key: 'clothing', label: 'Clothing', title: 'Clothing', mode: 'hang' },
    { key: 'caps', label: 'Caps', title: 'Caps', mode: 'peg' },
    { key: 'bags', label: 'Bags', title: 'Bags', mode: 'hook' },
    { key: 'shoes', label: 'Shoes', title: 'Shoes', mode: 'shelf' },
  ];
  VX.PRODUCTS = PRODUCTS;
  VX.byId = (id) => PRODUCTS.find((p) => p.id === id);
  VX.byCat = (cat) => PRODUCTS.filter((p) => p.cat === cat);
  VX.withVariant = withVariant;
  VX.money = (n) => '$' + n.toFixed(2);
})();
