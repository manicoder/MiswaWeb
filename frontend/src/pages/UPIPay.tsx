import React, { useState, useEffect } from 'react';
import { Share2, Download, Copy, Loader2 } from 'lucide-react';
import { getUPIPaymentInfo, UPIPaymentInfo } from '../utils/api';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/use-toast';

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

  const shareQR = async () => {
    if (upiInfo?.qr_code_url) {
      try {
        if (navigator.share) {
          const response = await fetch(upiInfo.qr_code_url);
          const blob = await response.blob();
          const file = new File([blob], 'upi-qr.png', { type: 'image/png' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'UPI Payment QR Code',
              text: `Pay via UPI: ${upiInfo.upi_id}`,
            });
          } else {
            await navigator.share({
              title: 'UPI Payment QR Code',
              text: `Pay via UPI: ${upiInfo.upi_id}`,
              url: upiInfo.qr_code_url,
            });
          }
        } else {
          copyToClipboard(upiInfo.qr_code_url);
        }
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const downloadQR = async () => {
    if (upiInfo?.qr_code_url) {
      try {
        const response = await fetch(upiInfo.qr_code_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'upi-qr-code.png';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: "Downloaded!",
          description: "QR code downloaded successfully",
        });
      } catch (error) {
        console.error('Error downloading:', error);
      }
    }
  };

  // Extract bank info from company name or use default
  const getBankInfo = () => {
    const companyName = upiInfo?.company_name || '';
    // Try to extract bank name from company name, or use default
    if (companyName.toLowerCase().includes('indusind')) {
      return { name: 'IndusInd Bank', account: '8535' };
    }
    // Default or extract from company name
    return { name: companyName || 'Bank Account', account: '' };
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

  const bankInfo = getBankInfo();

  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      data-testid="upi-pay-page"
      style={{ 
        height: '100dvh', 
        width: '100vw',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #1a1a2e 100%)'
      }}
    >
      {/* Main Content - Takes full viewport, no scrolling */}
      <div 
        className="h-full w-full flex flex-col items-center justify-between px-4 py-3 sm:py-4"
        style={{ 
          height: '100%',
          maxHeight: '100dvh',
          overflow: 'hidden'
        }}
      >
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md pt-2 sm:pt-4"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-1 sm:mb-2 leading-tight">
            Receive Money
          </h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-white text-base sm:text-lg md:text-xl opacity-90">
              From any UPI app
            </p>
            {/* UPI Apps Icons */}
            <div className="flex items-center gap-2 sm:gap-3 text-white text-xs sm:text-sm md:text-base flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">पे</span>
                </div>
                <span className="hidden sm:inline">PhonePe</span>
              </div>
              <span>BHIM</span>
              <span>G Pay</span>
              <span>Paytm</span>
            </div>
          </div>
        </motion.div>

        {/* Bank Info Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md flex items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg">
              {bankInfo.name.charAt(0)}
            </div>
            <div className="text-white">
              <p className="text-lg sm:text-xl md:text-2xl font-bold">
                {bankInfo.name} {bankInfo.account && `- ${bankInfo.account}`}
              </p>
            </div>
          </div>
          {/* Pagination dots (if multiple accounts) */}
          <div className="flex gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white"></div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-600"></div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-600"></div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-600"></div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-600"></div>
          </div>
        </motion.div>

        {/* QR Code Section - Takes most space */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1 flex items-center justify-center w-full max-w-md"
          style={{ 
            minHeight: 0,
            flexBasis: 0,
            width: '100%'
          }}
        >
          {upiInfo.qr_code_url ? (
            <div 
              className="relative bg-white rounded-3xl shadow-2xl p-2 sm:p-3 md:p-4"
              style={{ 
                width: 'min(65vw, 260px)',
                height: 'min(65vw, 260px)',
                maxWidth: 'min(65vw, 260px)',
                maxHeight: 'min(65vw, 260px)'
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
              {/* PhonePe logo overlay in center of QR */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-xl">
                  <span className="text-white text-lg sm:text-xl md:text-2xl font-bold">पे</span>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="bg-gray-800 border-4 border-dashed border-gray-600 rounded-3xl flex items-center justify-center"
              style={{ 
                width: 'min(65vw, 260px)',
                height: 'min(65vw, 260px)'
              }}
            >
              <div className="text-center text-gray-400 px-4">
                <p className="text-base sm:text-lg md:text-xl">QR Code not available</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-md flex gap-3 sm:gap-4 justify-center"
        >
          <button
            onClick={shareQR}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-transparent border-2 border-purple-400 rounded-full text-purple-400 hover:bg-purple-400 hover:text-white transition-all duration-300 text-sm sm:text-base md:text-lg font-semibold active:scale-95"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>SHARE QR</span>
          </button>
          <button
            onClick={downloadQR}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-transparent border-2 border-purple-400 rounded-full text-purple-400 hover:bg-purple-400 hover:text-white transition-all duration-300 text-sm sm:text-base md:text-lg font-semibold active:scale-95"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>DOWNLOAD QR</span>
          </button>
        </motion.div>

        {/* UPI ID Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="border-t border-gray-700 pt-3 sm:pt-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-white text-sm sm:text-base md:text-lg font-medium">UPI ID</span>
              <button className="text-purple-400 text-xs sm:text-sm md:text-base font-semibold hover:text-purple-300 transition-colors active:scale-95">
                MANAGE
              </button>
            </div>
            {upiInfo.upi_id && (
              <div className="flex items-center justify-between bg-gray-800/50 rounded-xl p-3 sm:p-4">
                <p className="text-white text-base sm:text-xl md:text-2xl font-bold font-mono break-all pr-2">
                  {upiInfo.upi_id}
                </p>
                <button
                  onClick={() => copyToClipboard(upiInfo.upi_id)}
                  className="flex-shrink-0 p-2 hover:bg-gray-700 rounded-lg transition-colors active:scale-95"
                  aria-label="Copy UPI ID"
                >
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Footer - UPI Powered By */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full max-w-md text-center pb-2 sm:pb-3"
        >
          <p className="text-gray-400 text-xs mb-1 sm:mb-2">POWERED BY</p>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-white text-xl sm:text-2xl md:text-3xl font-bold">UPI</span>
            <div className="flex items-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-l-full"></div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 rounded-r-full"></div>
            </div>
          </div>
          <p className="text-gray-400 text-xs">UNIFIED PAYMENTS INTERFACE</p>
        </motion.div>
      </div>
    </div>
  );
};

export default UPIPay;
