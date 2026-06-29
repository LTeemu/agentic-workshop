import { css } from 'lit';

/**
 * Shared Spectra Glass CSS patterns — compose these into component styles.
 *
 * Each export is an `unsafeCSS` compatible CSS template literal.
 * Use: `static override styles = css` ${focusRing} ${glassSurface} ... ``
 */

/* ─── Gradient focus ring (keyboard-only) ───
   Apply on `:host`:
     :host { position: relative; outline: none; }
     :host(:focus-visible)::after { ...focusRing... }
*/
export const focusRing = css`
  :host(:focus-visible)::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: inherit;
    padding: 2px;
      background: var(
        --sg-focus-ring,
        var(
          --sg-gradient-spectral,
          linear-gradient(
            135deg,
            rgba(212, 134, 159, 0.5),
            rgba(196, 160, 80, 0.5),
            rgba(127, 168, 141, 0.5),
            rgba(122, 128, 192, 0.5)
          )
        )
      );
    -webkit-mask: linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    pointer-events: none;
    z-index: 1;
  }
`;

/* ─── Glass surface defaults ─── */
export const glassSurface = css`
  background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
  backdrop-filter: var(--sg-glass-blur, blur(20px));
  -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
  border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
`;

/* ─── Transition defaults ─── */
export const smoothTransition = css`
  transition:
    background var(--sg-transition-base, 250ms ease),
    box-shadow var(--sg-transition-base, 250ms ease),
    border-color var(--sg-transition-base, 250ms ease),
    color var(--sg-transition-base, 250ms ease),
    opacity var(--sg-transition-base, 250ms ease),
    transform var(--sg-transition-base, 250ms ease);
`;

/* ─── Spectral hover glow ─── */
export const hoverGlow = css`
  box-shadow:
    0 0 20px rgba(218, 119, 242, 0.06),
    0 0 40px rgba(77, 171, 247, 0.04);
`;
