/**
 * JWT Token Debug Utility
 * Helps debug JWT token issues in Railway deployment
 * DISABLED in production for security
 */

export const jwtDebug = {
  /**
   * Decode JWT token without verification (for debugging only)
   */
  decodeToken: (token: string) => {
    // Disable in production
    if (import.meta.env.PROD) {
      return null;
    }

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired: (token: string) => {
    // Disable in production
    if (import.meta.env.PROD) {
      return false;
    }

    const decoded = jwtDebug.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  },

  /**
   * Get token expiration time
   */
  getTokenExpiration: (token: string) => {
    // Disable in production
    if (import.meta.env.PROD) {
      return null;
    }

    const decoded = jwtDebug.decodeToken(token);
    if (!decoded || !decoded.exp) return null;

    return new Date(decoded.exp * 1000);
  },

  /**
   * Log token information for debugging
   */
  logTokenInfo: (token: string) => {
    // Disable in production
    if (import.meta.env.PROD) {
      return;
    }

    const decoded = jwtDebug.decodeToken(token);
    if (!decoded) {
      console.error('❌ Invalid JWT token');
      return;
    }

    console.log('🔍 JWT Token Debug Info:', {
      issuer: decoded.iss,
      audience: decoded.aud,
      subject: decoded.sub,
      userId: decoded.UserId || decoded.user_id,
      email: decoded.email || decoded.Email,
      role: decoded.role,
      issuedAt: decoded.iat ? new Date(decoded.iat * 1000) : null,
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
      isExpired: jwtDebug.isTokenExpired(token),
      timeUntilExpiry: decoded.exp ? Math.floor((decoded.exp * 1000 - Date.now()) / 1000) : null,
    });
  },

  /**
   * Test JWT token with backend
   */
  testTokenWithBackend: async (token: string) => {
    // Disable in production
    if (import.meta.env.PROD) {
      return null;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('🔍 Backend JWT Test Result:', data);
      return data;
    } catch (error) {
      console.error('❌ Error testing JWT with backend:', error);
      return null;
    }
  },
};

// Only enable debug logging in development
if (import.meta.env.DEV) {
  const token = localStorage.getItem('mlt-admin-token');
  if (token) {
    console.log('🔍 Development JWT Token Debug:');
    jwtDebug.logTokenInfo(token);
  }
}
