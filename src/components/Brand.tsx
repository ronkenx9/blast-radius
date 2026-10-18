/** A dependency origin and its connected radius; shared by the product and its front door. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true" className="brand-mark">
    <path d="M9 18H20M9 18L23.5 7.5M9 18L23.5 28.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M25 8.5C28.8 10.5 31 14.1 31 18S28.8 25.5 25 27.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="9" cy="18" r="4.5" fill="#c64f2c"/>
    <circle cx="23.5" cy="7.5" r="2.7" fill="currentColor"/>
    <circle cx="23.5" cy="28.5" r="2.7" fill="currentColor"/>
    <circle cx="21.5" cy="18" r="2.7" fill="currentColor"/>
  </svg>;
}
export default function Brand() { return <><BrandMark/><span>Blast Radius</span></>; }
