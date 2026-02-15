import Svg, { Path, Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "tamagui";

type CalendarProvider = "apple" | "google" | "outlook";

interface CalendarProviderIconProps {
  provider: CalendarProvider;
  size?: number;
}

/**
 * Renders a small brand icon for the given calendar provider.
 * Uses `react-native-svg` for crisp, scalable inline icons.
 *
 * - Apple: monochrome, adapts to theme (black in light mode, white in dark mode)
 * - Google: uses official brand colors (multi-color)
 * - Outlook: uses official brand blue
 */
export function CalendarProviderIcon({
  provider,
  size = 16,
}: CalendarProviderIconProps) {
  switch (provider) {
    case "apple":
      return <AppleIcon size={size} />;
    case "google":
      return <GoogleIcon size={size} />;
    case "outlook":
      return <OutlookIcon size={size} />;
  }
}

function AppleIcon({ size }: { size: number }) {
  const theme = useTheme();
  const fill = theme.color.val;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill={fill}
      />
    </Svg>
  );
}

function GoogleIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.77 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function OutlookIcon({ size }: { size: number }) {
  // Simplified version of the official Microsoft Outlook (2018–2024) logo.
  // viewBox scaled from the original 1831×1703 SVG to fit a 24×24 grid.
  return (
    <Svg width={size} height={size} viewBox="0 0 1831 1703" fill="none">
      {/* Dark blue envelope background */}
      <Path
        d="M1831 894.25c0.1-14.32-7.3-27.64-19.5-35.13h-0.21l-0.77-0.43-634.49-375.58c-2.74-1.85-5.58-3.54-8.52-5.07-24.5-12.64-53.6-12.64-78.1 0-2.93 1.52-5.78 3.22-8.52 5.07L446.49 858.69l-0.77 0.43c-19.39 12.06-25.34 37.56-13.28 56.95 3.55 5.71 8.45 10.47 14.26 13.87l634.49 375.58c2.75 1.84 5.59 3.53 8.52 5.07 24.5 12.64 53.6 12.64 78.1 0 2.92-1.54 5.77-3.23 8.52-5.07l634.49-375.58c12.23-7.39 19.76-21.01 19.62-35.69z"
        fill="#0A2767"
      />
      {/* Calendar grid: top-left dark blue */}
      <Path d="M1745.92 255.5V80.91c1-43.65-33.55-79.86-77.2-80.91H588.2c-43.65-1-78.2 35.21-77.2 78.86V255.5l638.75 170.33L1745.92 255.5z" fill="#0364B8" />
      {/* Calendar grid cells */}
      <Path d="M511 255.5h425.83v383.25H511V255.5z" fill="#0078D4" />
      <Path d="M1362.67 255.5H936.83v383.25l425.83 383.25h383.25V638.75L1362.67 255.5z" fill="#28A8EA" />
      <Path d="M936.83 638.75h425.83V1022H936.83V638.75z" fill="#0078D4" />
      <Path d="M936.83 1022h425.83v383.25H936.83V1022z" fill="#0364B8" />
      <Path d="M1362.67 1022h383.25v383.25h-383.25V1022z" fill="#0078D4" />
      {/* Envelope lower section */}
      <Path
        d="M1811.58 927.59l-0.81 0.43-634.49 356.85c-2.77 1.7-5.58 3.32-8.52 4.77-24.64 12.04-53.46 12.04-78.1 0-2.92-1.44-5.76-3.04-8.52-4.77L446.66 928.06l-0.77-0.47c-12.25-6.64-19.93-19.41-20.06-33.34v722.38c0.31 48.19 39.62 87 87.8 86.7h1229.64c48.19 0.31 87.5-38.51 87.81-86.7V894.25c-0.02 13.82-7.47 26.56-19.5 33.34z"
        fill="#1490DF"
      />
      {/* Cyan top-right square */}
      <Path d="M1362.67 255.5h383.25v383.25h-383.25V255.5z" fill="#50D9FF" />
      {/* Blue rounded-rect with "O" */}
      <Defs>
        <LinearGradient id="outlookGrad" x1="0" y1="383.25" x2="936.83" y2="1320.08" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#1784D9" />
          <Stop offset="0.5" stopColor="#107AD5" />
          <Stop offset="1" stopColor="#0A63C9" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="383.25" width="936.83" height="936.83" rx="78" fill="url(#outlookGrad)" />
      {/* White "O" letter */}
      <Path
        d="M243.96 710.63c19.24-40.99 50.29-75.29 89.17-98.5 43.06-24.65 92.08-36.94 141.68-35.51 45.96-1 91.32 10.65 131.11 33.68 37.41 22.31 67.55 55 86.74 94.11 20.9 43.09 31.32 90.51 30.41 138.4 1.01 50.04-9.71 99.63-31.3 144.78-19.65 40.5-50.74 74.36-89.43 97.39-41.33 23.73-88.37 35.69-136.01 34.58-46.95 1.13-93.3-10.65-134.01-34.07-37.74-22.34-68.25-55.07-87.89-94.28-21.03-42.47-31.57-89.36-30.75-136.74-0.87-49.62 9.48-98.79 30.28-143.84zm95.05 231.23c10.26 25.91 27.65 48.39 50.16 64.81 22.93 16.03 50.39 24.29 78.35 23.59 29.78 1.18 59.14-7.37 83.63-24.36 22.23-16.38 39.16-38.91 48.72-64.81 10.68-28.93 15.95-59.57 15.54-90.4 0.33-31.13-4.62-62.08-14.65-91.55-8.86-26.61-25.25-50.07-47.18-67.54-23.88-17.79-53.16-26.81-82.91-25.55-28.57-0.74-56.64 7.59-80.18 23.8-22.89 16.5-40.62 39.17-51.1 65.37-23.26 60.05-23.38 126.6-0.34 186.73z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}
