// Font loading utility with fallback detection
export class FontLoader {
  private static readonly FONT_TIMEOUT = 3000; // 3 seconds timeout

  /**
   * Check if Inter font is loaded from Google Fonts
   */
  static async checkInterFont(): Promise<boolean> {
    if (!document.fonts) {
      console.warn('Font Loading API not supported');
      return false;
    }

    try {
      // Check if Inter font is available
      const interFont = new FontFace(
        'Inter',
        'url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2)',
      );

      // Load with timeout
      const fontPromise = interFont.load();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Font loading timeout')), this.FONT_TIMEOUT),
      );

      await Promise.race([fontPromise, timeoutPromise]);
      document.fonts.add(interFont);

      return true;
    } catch (error) {
      console.warn('Inter font failed to load from Google Fonts:', error);
      return false;
    }
  }

  /**
   * Initialize font loading with fallback
   */
  static async initializeFonts(): Promise<void> {
    try {
      const interLoaded = await this.checkInterFont();

      if (!interLoaded) {
        console.info('Using system font fallbacks');
        // Add a class to body to indicate fallback fonts are being used
        document.body.classList.add('font-fallback');
      } else {
        console.info('Inter font loaded successfully');
        document.body.classList.add('font-inter');
      }
    } catch (error) {
      console.error('Font initialization error:', error);
      document.body.classList.add('font-fallback');
    }
  }

  /**
   * Get the best available font for the current system
   */
  static getSystemFont(): string {
    const userAgent = navigator.userAgent;

    // macOS/iOS - SF Pro Display
    if (/Mac|iPhone|iPad/.test(userAgent)) {
      return '"SF Pro Display", -apple-system, BlinkMacSystemFont';
    }

    // Windows - Segoe UI
    if (/Windows/.test(userAgent)) {
      return '"Segoe UI", "Segoe UI Historic", "Segoe UI Emoji"';
    }

    // Android - Roboto
    if (/Android/.test(userAgent)) {
      return 'Roboto, "Noto Sans"';
    }

    // Linux - System fonts
    if (/Linux/.test(userAgent)) {
      return '"Liberation Sans", "DejaVu Sans", sans-serif';
    }

    // Fallback
    return 'Arial, "Helvetica Neue", Helvetica, sans-serif';
  }
}

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FontLoader.initializeFonts());
  } else {
    FontLoader.initializeFonts();
  }
}
