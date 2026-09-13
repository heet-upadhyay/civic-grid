# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## CivicGrid visual system

The frontend uses a warm civic dark theme centered on `#0F1229` with `#171B3A` surfaces and `#2A2F5C` borders. Saffron `#F5A524` is reserved for primary actions and citizen voice, coral `#FF6B5E` communicates severity and urgency, periwinkle `#6C7BFF` marks structured data, and text uses `#F2F1F8` with `#9C9FC2` for muted content.

The landing hero contains the product's wave-to-grid motif: organic citizen voice resolving into structured civic data. Reduced-motion preferences keep the composition static.

## Verification

```powershell
npm run lint
npm run build
npm run dev
```

Responsive checks should cover `/`, `/dashboard`, `/complaints`, `/submit`, and `/complaints/:id` at desktop and mobile widths. Confirm no horizontal overflow, visible keyboard focus, readable semantic badges, and stable loading/empty/error states.
