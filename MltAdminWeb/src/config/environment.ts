import packageJson from '../../package.json';

export const getEnvironmentConfig = () => {
  console.log('Environment detection - hostname:', window.location.hostname);
  const isDevelopment =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isProduction = window.location.hostname === 'mltadmin.mylittletales.com';
  const isMiswainternational = window.location.hostname === 'miswainternational.com' || 
                                window.location.hostname.includes('miswainternational.com');
  const isRailway = window.location.hostname.includes('railway.app');

  console.log('Environment flags:', { isDevelopment, isProduction, isMiswainternational, isRailway });

  // Get API URL based on environment
  const getApiUrl = () => {
    // 1. Check environment variable first (for Railway deployment)
    if (import.meta.env.VITE_API_URL) {
      let apiUrl = import.meta.env.VITE_API_URL.trim();
      if (!apiUrl.startsWith('http')) {
        apiUrl = `https://${apiUrl}`;
      }
      console.log('Using VITE_API_URL:', apiUrl);
      return apiUrl;
    }

    // 2. Auto-detect based on hostname
    if (isProduction) {
      console.log('Using production API URL');
      return 'https://mltadminapi.mylittletales.com/api';
    }

    // 3. Miswainternational.com domain - use Railway API
    if (isMiswainternational) {
      // Default to Railway API URL for miswainternational.com
      const railwayApiUrl = 'https://mltadminapi.railway.app/api';
      console.log('Using Miswainternational API URL:', railwayApiUrl);
      return railwayApiUrl;
    }

    // 4. Railway deployment detection
    if (isRailway) {
      // Try to construct Railway API URL based on current domain
      const currentDomain = window.location.hostname;
      const apiDomain = currentDomain.replace('mltadminweb', 'mltadminapi');
      const railwayApiUrl = `https://${apiDomain}/api`;
      console.log('Using Railway API URL:', railwayApiUrl);
      return railwayApiUrl;
    }

    console.log('Using localhost API URL');
    return 'http://localhost:5001/api';
  };

  const config = {
    // Environment detection
    isDevelopment,
    isProduction,
    isMiswainternational,
    isRailway,
    environment: isDevelopment
      ? 'development'
      : isProduction
        ? 'production'
        : isMiswainternational
          ? 'miswainternational'
          : isRailway
            ? 'railway'
            : 'unknown',

    // Version information
    version: packageJson.version,

    // API Configuration
    apiUrl: getApiUrl(),

    // Frontend URLs
    frontendUrl: isDevelopment 
      ? 'http://localhost:5173' 
      : isMiswainternational
        ? 'https://miswainternational.com/mltadmin'
        : 'https://mltadmin.mylittletales.com',

    // Feature flags
    enableDebugLogs: isDevelopment || import.meta.env.VITE_ENABLE_DEBUG === 'true',
    enableDevTools: isDevelopment,

    // Timeout settings
    apiTimeout: isDevelopment ? 120000 : 600000, // 2min dev, 10min prod
  };

  console.log('Final config:', {
    environment: config.environment,
    apiUrl: config.apiUrl,
    enableDebugLogs: config.enableDebugLogs,
  });

  // Debug logging only in development
  if (config.enableDebugLogs && isDevelopment) {
    // Environment logging disabled for production
  }

  return config;
};

export const ENV = getEnvironmentConfig();
