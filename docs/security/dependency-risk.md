# Dependency advisory baseline

Recorded: 2026-07-28

`npm audit --omit=dev` currently resolves six distinct advisory IDs through
Next.js and Firebase Admin dependency trees. Safe compatible upgrades were
applied in commit `0a6456f`; `npm audit fix --force` proposes breaking
downgrades and is prohibited.

Temporary exposure ruling:

- PostCSS advisories are not reachable because the application accepts no
  user-controlled CSS, source maps, or build input.
- The Sharp/libvips advisory is not reachable while the application imports no
  `next/image`, exposes no image-optimization endpoint in its UI, and processes
  no user-supplied images.
- Firebase Admin Storage/UUID advisories are not reachable while server code
  imports only `firebase-admin/app`, `firebase-admin/auth`, and
  `firebase-admin/firestore`; Storage APIs and user-provided UUID buffers are
  forbidden.
- Brace-expansion/minimatch/glob/rimraf findings are transitive tooling paths;
  application request data must never be passed to those packages.

This is not blanket acceptance of high-severity findings. Run
`npm run audit:regression` after every dependency change and before Preview and
Production deployment. Any new advisory, any critical advisory, use of
`next/image`, user-controlled CSS/source maps/images, Firebase Admin Storage, or
changed request flow into the listed packages blocks deployment until this
document and baseline are reviewed again.
