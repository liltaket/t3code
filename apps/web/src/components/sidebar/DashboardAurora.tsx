import auroraUrl from "../../assets/orbit-dashboard-aurora.webp";
import seamUrl from "../../assets/orbit-dashboard-aurora-seam.webp";

export function DashboardAurora() {
  return (
    <div className="orbit-dashboard-aurora" aria-hidden="true">
      <div className="orbit-dashboard-aurora-seam">
        <img src={seamUrl} width={1000} height={80} alt="" decoding="async" />
      </div>
      <img
        className="orbit-dashboard-aurora-sky"
        src={auroraUrl}
        width={1400}
        height={532}
        alt=""
        decoding="async"
      />
      <svg
        className="sidebar-aurora-art orbit-dashboard-aurora-stars"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="var(--aurora-stars)">
          <circle cx="2.5%" cy="92" r="0.62" fillOpacity="0.7" />
          <circle cx="7%" cy="196" r="0.5" fillOpacity="0.42" />
          <circle cx="15.5%" cy="62" r="0.6" fillOpacity="0.7" />
          <circle cx="24%" cy="262" r="0.5" fillOpacity="0.36" />
          <circle cx="31%" cy="28" r="0.55" fillOpacity="0.7" />
          <circle cx="37%" cy="212" r="0.45" fillOpacity="0.4" />
          <circle cx="43%" cy="72" r="0.55" fillOpacity="0.6" />
          <circle cx="52%" cy="38" r="0.5" fillOpacity="0.55" />
          <circle cx="68%" cy="24" r="0.6" fillOpacity="0.68" />
          <circle cx="76%" cy="44" r="0.45" fillOpacity="0.5" />
          <circle cx="84%" cy="300" r="0.55" fillOpacity="0.3" />
          <circle cx="89%" cy="34" r="0.6" fillOpacity="0.72" />
          <circle cx="95%" cy="158" r="0.55" fillOpacity="0.5" />
          <circle cx="98%" cy="268" r="0.45" fillOpacity="0.32" />
        </g>
        <g
          stroke="var(--aurora-stars)"
          strokeLinecap="round"
          strokeOpacity="0.62"
          strokeWidth="0.6"
        >
          <svg x="33%" y="176" overflow="visible">
            <path d="M-1.6 0H1.6M0-1.6V1.6" />
          </svg>
          <svg x="47%" y="18" overflow="visible">
            <path d="M-1.6 0H1.6M0-1.6V1.6" />
          </svg>
          <svg x="93%" y="70" overflow="visible">
            <path d="M-1.6 0H1.6M0-1.6V1.6" />
          </svg>
        </g>
      </svg>
    </div>
  );
}
