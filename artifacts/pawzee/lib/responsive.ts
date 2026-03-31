import { useWindowDimensions } from "react-native";

const BASE_WIDTH = 375;

export type ResponsiveUtils = ReturnType<typeof useResponsive>;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 768;
  const isLargePhone = !isTablet && width >= 414;
  const isSmallPhone = width < 375;

  const scale = width / BASE_WIDTH;

  const rs = (size: number): number =>
    Math.round(size * Math.min(scale, isTablet ? 1.3 : 1.15));

  const rf = (size: number): number =>
    Math.round(size * Math.min(scale, isTablet ? 1.25 : 1.1));

  const wp = (pct: number): number => (width * pct) / 100;

  const hp = (pct: number): number => (height * pct) / 100;

  const drawerWidth = isTablet
    ? Math.min(wp(38), 380)
    : Math.min(wp(85), 320);

  return {
    width,
    height,
    isTablet,
    isLargePhone,
    isSmallPhone,
    scale,
    rs,
    rf,
    wp,
    hp,
    drawerWidth,
  };
}
