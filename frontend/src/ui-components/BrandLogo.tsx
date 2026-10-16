export interface BrandLogoProps {
  collapsed?: boolean;
  className?: string;
}

export default function BrandLogo({ collapsed = false, className = "" }: BrandLogoProps) {
  return (
    <div
      className={`flex items-center gap-3 overflow-hidden ${
        collapsed ? "justify-center" : ""
      } ${className}`}
    >
      {/* Isotipo Katakana Ne (Yanesu) con acabado oscuro elegante */}
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-white shadow-md ring-1 ring-white/10 transition-all duration-300 ${
          collapsed ? "size-10" : "size-11"
        }`}
      >
        <svg
          viewBox="0 0 111.125 111.125"
          className={`transition-all duration-300 text-white ${collapsed ? "size-6" : "size-7"}`}
          fill="none"
          aria-hidden="true"
        >
          <g transform="translate(0, -185.875)">
            <path
              d="m 45.349618,198.09889 c 6.34998,3.91582 11.006632,7.30247 14.181622,11.32413 1.904994,2.64582 3.069157,4.55082 5.29165,4.55082 2.222493,0 3.598322,-1.79917 3.598322,-3.70416 0,-7.19664 -11.429964,-11.8533 -21.907431,-13.96996 z m -18.944107,21.80159 c 0.105833,2.32833 0.423332,5.29165 1.05833,6.56165 1.375829,2.85749 5.820815,6.77331 8.572473,6.77331 2.434159,0 2.857491,-2.01083 6.244147,-2.85749 5.714982,-1.48166 23.28326,-5.60915 27.304914,-6.13831 1.375829,-0.10584 1.481662,0.21166 0.740831,1.48166 -8.784139,15.23995 -35.877387,35.24239 -57.255653,45.71985 l 1.481662,2.54 c 15.451618,-5.82082 30.268238,-14.60496 42.650699,-24.76493 0.317499,1.05833 0.423332,2.32833 0.423332,4.12749 0,5.39748 -0.529165,17.46245 -0.846664,20.31994 -0.423332,4.12748 -0.846664,4.86832 -0.846664,6.87914 0,2.64583 1.164163,7.72581 4.021654,7.72581 2.963324,0 3.809988,-2.43416 3.809988,-4.76248 0,-2.32833 -0.423332,-6.34998 -0.423332,-9.73664 0,-17.46244 0.529165,-21.4841 0.529165,-24.12992 0,-1.48167 -0.952497,-2.75166 -2.434159,-4.02166 6.34998,-5.60915 11.853296,-11.53579 16.298282,-17.46244 1.164163,-1.5875 5.397483,-2.2225 5.397483,-4.23332 0,-2.11666 -6.34998,-6.77331 -9.101638,-6.77331 -1.481662,0 -2.010827,1.79916 -5.185817,2.53999 -5.079984,1.26999 -27.622413,5.50331 -33.654894,5.50331 -3.280823,0 -5.185817,-3.59832 -6.879145,-5.92664 z m 44.132361,27.09325 c 7.725809,3.70416 14.393288,9.84247 19.579105,17.25078 1.587495,2.43416 2.645825,3.28082 4.550819,3.28082 2.010827,0 3.386656,-1.48166 3.386656,-3.38665 0,-8.46664 -12.276628,-15.66329 -26.352417,-19.15578 z"
              fill="currentColor"
            />
          </g>
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col overflow-hidden whitespace-nowrap">
          <span className="text-[15px] font-bold tracking-tight text-slate-900 leading-snug">
            Yanesu Shisutemu
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Control de Inventario
          </span>
        </div>
      )}
    </div>
  );
}
