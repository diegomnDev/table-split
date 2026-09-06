/**
 * The mark: a ticket torn in two. The tear is complementary — what one half
 * loses the other gains — so the two pieces read as one ticket that was split,
 * not as two separate tickets.
 *
 * Same geometry as `assets/icon.svg`, which generates the app icons, so the
 * mark and the icon cannot drift apart. Drawn as an outline rather than a
 * solid: the icon gets its contrast from a dark background, and without one a
 * filled mark collapses into a black block at small sizes.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="82 118 348 276" role="img" aria-label="table-split" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="20" strokeLinejoin="miter">
        <path d="M92 128 L236 128 L236 128 L236 160 L222 160 L222 192 L236 192 L236 224 L222 224 L222 256 L236 256 L236 288 L222 288 L222 320 L236 320 L236 352 L222 352 L222 384 L236 384 L92 384 Z" />
        <path d="M420 128 L276 128 L276 128 L276 160 L262 160 L262 192 L276 192 L276 224 L262 224 L262 256 L276 256 L276 288 L262 288 L262 320 L276 320 L276 352 L262 352 L262 384 L276 384 L420 384 Z" />
      </g>
      <g fill="currentColor">
        <rect x="116" y="180" width="92" height="18" />
        <rect x="116" y="232" width="64" height="18" />
        <rect x="116" y="316" width="92" height="18" />
        <rect x="304" y="180" width="92" height="18" />
        <rect x="332" y="232" width="64" height="18" />
        <rect x="304" y="316" width="92" height="18" />
      </g>
    </svg>
  )
}
