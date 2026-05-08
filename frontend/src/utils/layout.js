import { Platform, useWindowDimensions } from 'react-native';

export function useAppLayout() {
  const { width, height } = useWindowDimensions();
  const isTiny = width < 350;
  const isCompact = width < 390;
  const isPhone = width < 430;
  const isTablet = width >= 768;
  const isDesktop = width >= 1100;
  const isWide = width >= 920;
  const isLargeDesktop = width >= 1440;

  // Use a constrained center column max width for web desktop to mimic mobile apps perfectly.
  const gutter = isTablet ? 0 : isTiny ? 12 : isCompact ? 14 : 18;
  const contentMaxWidth = isLargeDesktop ? 720 : isDesktop ? 680 : isTablet ? 600 : width;
  const heroTitleSize = isTablet ? 42 : isTiny ? 26 : isCompact ? 30 : 36;
  const sectionTitleSize = isTablet ? 20 : isTiny ? 16 : 18;
  const routeMapHeight = isDesktop ? 400 : isTablet ? 350 : isTiny ? 210 : isCompact ? 250 : 310;
  const tabInset = 0;

  return {
    width,
    height,
    isTiny,
    isCompact,
    isPhone,
    isTablet,
    isDesktop,
    isWide,
    gutter,
    contentMaxWidth,
    heroTitleSize,
    sectionTitleSize,
    routeMapHeight,
    tabInset,
    isWeb: Platform.OS === 'web',
  };
}
