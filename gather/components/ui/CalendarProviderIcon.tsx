import Svg, { Path } from "react-native-svg";
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
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 0 1-.588.234h-8.478v-6.26l1.37 1.016a.31.31 0 0 0 .388 0l7.348-5.326a.163.163 0 0 1 .096-.032c.048 0 .074.032.074.096l.028.218z"
        fill="#0072C6"
      />
      <Path
        d="M15.87 8.09a.435.435 0 0 0 .122-.196h-1.296v3.652l-1.37-1.016V4.957a.78.78 0 0 1 .234-.575.808.808 0 0 1 .588-.234h8.478v1.902L15.87 8.09z"
        fill="#0072C6"
      />
      <Path
        d="M8.152 9.62a3.652 3.652 0 0 0-1.478-1.478 3.96 3.96 0 0 0-2.022-.534 3.96 3.96 0 0 0-2.022.534A3.804 3.804 0 0 0 1.152 9.62C.718 10.282.5 11.044.5 11.904s.218 1.622.652 2.284a3.804 3.804 0 0 0 1.478 1.478c.608.342 1.284.512 2.022.512.738 0 1.414-.17 2.022-.512a3.652 3.652 0 0 0 1.478-1.478c.434-.662.652-1.424.652-2.284s-.218-1.622-.652-2.284zm-1.87 3.87a1.944 1.944 0 0 1-.74.782c-.314.19-.66.282-1.042.282-.382 0-.728-.094-1.042-.282a1.944 1.944 0 0 1-.74-.782 2.452 2.452 0 0 1-.272-1.178c0-.44.09-.838.272-1.178.182-.348.432-.62.74-.782.314-.19.66-.282 1.042-.282.382 0 .728.094 1.042.282.308.162.558.434.74.782.182.34.272.738.272 1.178 0 .44-.09.838-.272 1.178z"
        fill="#0072C6"
      />
      <Path d="M13.326 6.348v12.174l-9.13-2.87V3.478l9.13 2.87z" fill="#0072C6" />
    </Svg>
  );
}
