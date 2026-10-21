# LSD Hub cosmetic assets

The profile shop uses local WebP assets in `img/cosmetics/` for the avatar, banner, and frame options shown in the approved profile mockup. Assets are served from the same GitHub Pages origin; no external image host is required. Purchases and equipped items are persisted through `/shop/buy`, `/shop/equip`, and MongoDB fields `ownedCosmetics` / `equippedCosmetics`.

Prices are in LSD Dust and are defined server-side in `backend/utils/cosmetics.js`; frontend values are display-only.
