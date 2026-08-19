# Frontend Modular Refactor

This version moves the large inline JavaScript and CSS from `frontend/lab-asset-tracker.html` into organized files under `frontend/js` and `frontend/css`.

## Main files

- `frontend/js/config.js` - API URL and public item URL helpers
- `frontend/js/api.js` - API wrappers
- `frontend/js/auth.js` - token, current user, roles, permissions, logout
- `frontend/js/router.js` - hash route entry point
- `frontend/js/pages/*.js` - page renderers
- `frontend/js/components/*.js` - component placeholders for next refactor phase
- `frontend/css/*.css` - shared, admin, mobile, and print CSS

## Refactor strategy

This is a safe Phase 1 modular refactor. It keeps classic browser scripts instead of ES modules, so existing global functions continue to work. The next phase can move repeated UI pieces from page files into `components/` one by one.
