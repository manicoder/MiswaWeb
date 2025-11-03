import React, { useState, useEffect } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { getUPIPaymentInfo, UPIPaymentInfo } from '../utils/api';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/use-toast';

// UPI App Icons as SVG Components
const PhonePeIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="6" fill="#5F259F"/>
    <path d="M10 9C10 8.45 10.45 8 11 8H21C21.55 8 22 8.45 22 9V23C22 23.55 21.55 24 21 24H11C10.45 24 10 23.55 10 23V9Z" fill="white"/>
    <path d="M16 13C17.65 13 19 14.35 19 16C19 17.65 17.65 19 16 19C14.35 19 13 17.65 13 16C13 14.35 14.35 13 16 13Z" fill="#5F259F"/>
  </svg>
);

const PaytmIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="6" fill="#00BAF2"/>
    <path d="M9 8H23V24H9V8Z" fill="white"/>
    <path d="M13 11C13 10.45 13.45 10 14 10H18C18.55 10 19 10.45 19 11V21C19 21.55 18.55 22 18 22H14C13.45 22 13 21.55 13 21V11Z" fill="#00BAF2"/>
  </svg>
);

const BHIMIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="6" fill="#FF6600"/>
    <path d="M16 9L10 15H14V23H18V15H22L16 9Z" fill="white"/>
  </svg>
);

const GPayIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="6" fill="url(#gpay-gradient)"/>
    <defs>
      <linearGradient id="gpay-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4285F4"/>
        <stop offset="50%" stopColor="#34A853"/>
        <stop offset="100%" stopColor="#FBBC04"/>
      </linearGradient>
    </defs>
    <circle cx="16" cy="14" r="4" fill="white"/>
    <path d="M16 20C12.13 20 9 17.87 9 14H23C23 17.87 19.87 20 16 20Z" fill="white" opacity="0.8"/>
  </svg>
);

const UPIIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="16" fill="#00A86B"/>
    <path d="M16 8L20 12H17V20H15V12H12L16 8Z" fill="white"/>
    <path d="M12 24L16 20L20 24H12Z" fill="white"/>
  </svg>
);

const UPIPay: React.FC = () => {
  const [upiInfo, setUpiInfo] = useState<UPIPaymentInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUPIInfo();
  }, []);

  const fetchUPIInfo = async () => {
    try {
      const response = await getUPIPaymentInfo();
      setUpiInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch UPI payment info:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "UPI ID copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{ 
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #1a1a2e 100%)'
        }}
      >
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white text-xl">Loading payment information...</p>
        </div>
      </div>
    );
  }

  if (!upiInfo) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{ 
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #1a1a2e 100%)'
        }}
      >
        <div className="text-center px-4">
          <p className="text-white text-xl">Payment information not available. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 overflow-y-auto"
      data-testid="upi-pay-page"
      style={{ 
        minHeight: '100dvh', 
        width: '100vw',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #1a1a2e 100%)'
      }}
    >
      {/* Main Content */}
      <div 
        className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12"
      >
        <div className="w-full max-w-md space-y-8">
          
          {/* Logo Section */}
          {upiInfo.logo_url && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center"
            >
              <img
                src={upiInfo.logo_url}
                alt="Logo"
                className="max-h-20 max-w-48 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </motion.div>
          )}

          {/* Brand Name Section */}
          {upiInfo.brand_name && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                {upiInfo.brand_name}
              </h1>
            </motion.div>
          )}

          {/* Scan From UPI Apps Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center space-y-4"
          >
            <p className="text-white text-base sm:text-lg md:text-xl opacity-90">
              Scan From any UPI app
            </p>
            <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <PhonePeIcon />
                <span className="text-white text-sm sm:text-base">PhonePe</span>
              </div>
              <div className="flex items-center gap-2">
                <PaytmIcon />
                <span className="text-white text-sm sm:text-base">Paytm</span>
              </div>
              <div className="flex items-center gap-2">
                <BHIMIcon />
                <span className="text-white text-sm sm:text-base">BHIM</span>
              </div>
              <div className="flex items-center gap-2">
                <GPayIcon />
                <span className="text-white text-sm sm:text-base">G Pay</span>
              </div>
            </div>
          </motion.div>

          {/* QR Code Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center"
          >
            {upiInfo.qr_code_url ? (
              <div 
                className="relative bg-white rounded-3xl shadow-2xl p-3 sm:p-4 md:p-5"
                style={{ 
                  width: 'min(70vw, 300px)',
                  height: 'min(70vw, 300px)',
                }}
              >
                <img
                  src={upiInfo.qr_code_url}
                  alt="UPI QR Code"
                  className="w-full h-full object-contain rounded-2xl"
                  style={{ aspectRatio: '1' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div 
                className="bg-gray-800 border-4 border-dashed border-gray-600 rounded-3xl flex items-center justify-center"
                style={{ 
                  width: 'min(70vw, 300px)',
                  height: 'min(70vw, 300px)'
                }}
              >
                <div className="text-center text-gray-400 px-4">
                  <p className="text-base sm:text-lg md:text-xl">QR Code not available</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* UPI ID Section */}
          {upiInfo.upi_id && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center space-y-2"
            >
              <p className="text-white text-sm sm:text-base md:text-lg font-medium opacity-90">
                UPI Id: <span className="font-bold font-mono">{upiInfo.upi_id}</span>
              </p>
              <button
                onClick={() => copyToClipboard(upiInfo.upi_id)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-white text-sm transition-colors active:scale-95"
                aria-label="Copy UPI ID"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
            </motion.div>
          )}

          {/* Powered By Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center space-y-2 pt-4"
          >
            <p className="text-gray-400 text-xs sm:text-sm">Powered BY</p>
            <div className="flex items-center justify-center gap-3">
              <UPIIcon />
              <span className="text-white text-lg sm:text-xl md:text-2xl font-bold">UPI</span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">Unified Payments Interface</p>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default UPIPay;
