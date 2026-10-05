# Graph Report - lavadero-ecommerce  (2026-10-01)

## Corpus Check
- Corpus is ~39,101 words - fits in a single context window. You may not need a graph.

## Summary
- 196 nodes · 409 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 90% EXTRACTED · 9% INFERRED · 1% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.85)
- Token cost: 173,072 input · 0 output

## Community Hubs (Navigation)
- Runtime Dependency Manifest
- Auth and App Providers
- Firestore Data Layer and Admin
- Cart and Product UI Components
- Project Docs and Branding
- Catalog Listing and Fetch Hooks
- Build Tooling and Linting
- Category Filtering and Nav
- Contact Form and DB Seeding
- NPM Scripts and Deploy
- Brand Logo Identity System
- Cart Icon Asset

## God Nodes (most connected - your core abstractions)
1. `react` - 18 edges
2. `react-router-dom` - 18 edges
3. `AdminDashboard()` - 12 edges
4. `useAuth()` - 11 edges
5. `firebase` - 8 edges
6. `scripts` - 7 edges
7. `Ecommerce React - Proyecto Final` - 7 edges
8. `lucide-react` - 6 edges
9. `services` - 6 edges
10. `Button()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Single Page App HTML Shell` --semantically_similar_to--> `React Spinners`  [INFERRED] [semantically similar]
  index.html → README.md
- `Ecommerce React - Proyecto Final` --conceptually_related_to--> `Document Title: Fuegos Artificiales`  [AMBIGUOUS]
  README.md → index.html
- `Instalacion y Configuracion Local` --conceptually_related_to--> `src/main.jsx Module Entry`  [AMBIGUOUS]
  README.md → index.html
- `Ecommerce React - Proyecto Final` --conceptually_related_to--> `root Mount Element`  [INFERRED]
  README.md → index.html
- `Domain Pivot: Lavadero to Fuegos Artificiales` --conceptually_related_to--> `Catalogo de Productos`  [INFERRED]
  index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **React and Firebase Technology Stack** — readme_ecommerce_react, readme_react, readme_context_api, readme_react_router_dom, readme_react_spinners, readme_firebase [EXTRACTED 1.00]
- **Purchase Funnel: Catalog to Order** — readme_catalogo_de_productos, readme_filtrado_por_categoria, readme_detalle_de_producto, readme_carrito_de_compras, readme_checkout [INFERRED 0.85]
- **Features Reading and Writing Firestore Collections** — readme_firestore, readme_catalogo_de_productos, readme_checkout, readme_formulario_de_contacto [INFERRED 0.85]
- **Brand Identity System Composed In One Mark** — src_components_navbar_logo_assets_lavadora_brandlogo, src_components_navbar_logo_assets_lavadora_p_monogram, src_components_navbar_logo_assets_lavadora_orbital_ring_motif, src_components_navbar_logo_assets_lavadora_fireworks_star_emblem [INFERRED 0.85]

## Communities (13 total, 1 thin omitted)

### Community 0 - "Runtime Dependency Manifest"
Cohesion: 0.08
Nodes (28): dependencies, axios, bootstrap, firebase, lucide-react, react, react-bootstrap, react-dom (+20 more)

### Community 1 - "Auth and App Providers"
Cohesion: 0.14
Nodes (20): bootstrap, react-dom, App(), AuthContext, AuthProvider(), CartContextProvider(), ThemeContext, ThemeProvider() (+12 more)

### Community 2 - "Firestore Data Layer and Admin"
Cohesion: 0.17
Nodes (20): firebase, products, AdminDashboard(), crearCompra(), obtenerTodasLasCompras(), crearContacto(), eliminarMensaje(), marcarMensajeComoLeido() (+12 more)

### Community 3 - "Cart and Product UI Components"
Cohesion: 0.19
Nodes (14): lucide-react, react, react-router-dom, CarritoCard(), Button(), Counter(), Modal(), ItemDetails() (+6 more)

### Community 4 - "Project Docs and Branding"
Cohesion: 0.17
Nodes (21): Domain Pivot: Lavadero to Fuegos Artificiales, Favicon /lavadora.ico, Shell lang=en on Spanish Storefront, src/main.jsx Module Entry, root Mount Element, Single Page App HTML Shell, Document Title: Fuegos Artificiales, Carrito de Compras (+13 more)

### Community 5 - "Catalog Listing and Fetch Hooks"
Cohesion: 0.28
Nodes (7): react-spinners, Item(), ItemList(), ItemListContainer(), useProducts(), Home(), Products()

### Community 6 - "Build Tooling and Linting"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, gh-pages, globals, @types/react (+3 more)

### Community 7 - "Category Filtering and Nav"
Cohesion: 0.24
Nodes (8): CategoryFilter(), categoryValues, categoryValues, Menu(), NavBar(), CATEGORIES, useAuth(), Carrito()

### Community 8 - "Contact Form and DB Seeding"
Cohesion: 0.31
Nodes (4): FormularioContacto(), Contact(), firebase, services

### Community 9 - "NPM Scripts and Deploy"
Cohesion: 0.29
Nodes (7): scripts, build, deploy, dev, lint, predeploy, preview

### Community 10 - "Brand Logo Identity System"
Cohesion: 0.80
Nodes (5): NavBar Brand Logo Mark, Fireworks Star Emblem, Gold Orbital Ring Motif, Blue P Monogram, Pyrotechnics Rebrand

### Community 11 - "Cart Icon Asset"
Cohesion: 1.00
Nodes (3): Cart Menu Entry Point Affordance, Monochrome Flat Glyph Asset Convention, Shopping Cart Glyph Icon (carrito.png)

## Ambiguous Edges - Review These
- `Ecommerce React - Proyecto Final` → `Document Title: Fuegos Artificiales`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `Firebase` → `Instalacion y Configuracion Local`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `Instalacion y Configuracion Local` → `src/main.jsx Module Entry`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `Document Title: Fuegos Artificiales` → `Favicon /lavadora.ico`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to
- `Cart Menu Entry Point Affordance` → `Monochrome Flat Glyph Asset Convention`  [AMBIGUOUS]
  src/components/NavBar/CartMenu/assets/carrito.png · relation: conceptually_related_to

## Knowledge Gaps
- **41 isolated node(s):** `name`, `homepage`, `private`, `version`, `type` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 46 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Ecommerce React - Proyecto Final` and `Document Title: Fuegos Artificiales`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Firebase` and `Instalacion y Configuracion Local`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Instalacion y Configuracion Local` and `src/main.jsx Module Entry`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Document Title: Fuegos Artificiales` and `Favicon /lavadora.ico`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Cart Menu Entry Point Affordance` and `Monochrome Flat Glyph Asset Convention`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react-router-dom` connect `Cart and Product UI Components` to `Runtime Dependency Manifest`, `Auth and App Providers`, `Firestore Data Layer and Admin`, `Catalog Listing and Fetch Hooks`, `Category Filtering and Nav`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Why does `react` connect `Cart and Product UI Components` to `Runtime Dependency Manifest`, `Auth and App Providers`, `Firestore Data Layer and Admin`, `Catalog Listing and Fetch Hooks`, `Contact Form and DB Seeding`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._