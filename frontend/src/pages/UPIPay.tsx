import React, { useState, useEffect } from 'react';
import { QrCode, IndianRupee, Building2, CreditCard, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { getUPIPaymentInfo, UPIPaymentInfo } from '../utils/api';
import { motion } from 'framer-motion';

const UPIPay: React.FC = () => {
  const [upiInfo, setUpiInfo] = useState<UPIPaymentInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white">
        <Navbar />
        <section className="pt-32 pb-24 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-coral-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading payment information...</p>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (!upiInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white">
        <Navbar />
        <section className="pt-32 pb-24">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <Card className="border-0 shadow-xl">
              <CardContent className="pt-12 pb-12">
                <p className="text-gray-600">Payment information not available. Please check back later.</p>
              </CardContent>
            </Card>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white" data-testid="upi-pay-page">
      <Navbar />

      <section className="pt-32 pb-24" data-testid="upi-pay-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
                UPI Payment
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Scan the QR code below to make a payment using any UPI app
              </p>
            </motion.div>
          </div>

          {/* Main Payment Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-0 shadow-2xl overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <div className="text-center space-y-8">
                  {/* Company and Brand Name */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-coral-500 mb-2">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                      {upiInfo.company_name}
                    </h2>
                    {upiInfo.brand_name && upiInfo.brand_name !== upiInfo.company_name && (
                      <p className="text-xl text-gray-600">
                        {upiInfo.brand_name}
                      </p>
                    )}
                  </div>

                  {/* QR Code */}
                  <div className="flex justify-center py-6">
                    {upiInfo.qr_code_url ? (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                        className="p-6 bg-white border-4 border-coral-100 rounded-2xl shadow-lg"
                      >
                        <img
                          src={upiInfo.qr_code_url}
                          alt="UPI QR Code"
                          className="w-64 h-64 md:w-80 md:h-80 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (!target.nextElementSibling) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'w-64 h-64 md:w-80 md:h-80 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400';
                              errorDiv.textContent = 'Failed to load QR code';
                              target.parentElement?.appendChild(errorDiv);
                            }
                          }}
                        />
                      </motion.div>
                    ) : (
                      <div className="w-64 h-64 md:w-80 md:h-80 bg-gray-100 border-4 border-dashed border-gray-300 rounded-2xl flex items-center justify-center">
                        <div className="text-center">
                          <QrCode className="w-20 h-20 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">QR Code not available</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* UPI ID */}
                  {upiInfo.upi_id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="bg-gradient-to-r from-coral-50 to-orange-50 rounded-xl p-6 border border-coral-100"
                    >
                      <div className="flex items-center justify-center space-x-3 mb-2">
                        <CreditCard className="w-5 h-5 text-coral-500" />
                        <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                          UPI ID
                        </p>
                      </div>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900 font-mono">
                        {upiInfo.upi_id}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        You can also enter this UPI ID manually in your payment app
                      </p>
                    </motion.div>
                  )}

                  {/* GST Number */}
                  {upiInfo.gst_number && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <IndianRupee className="w-4 h-4 text-gray-500" />
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          GST Number
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 font-mono">
                        {upiInfo.gst_number}
                      </p>
                    </motion.div>
                  )}

                  {/* Instructions */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="pt-6 border-t border-gray-200"
                  >
                    <p className="text-sm text-gray-600 mb-4">
                      <strong>How to pay:</strong>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-coral-100 text-coral-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          1
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Open UPI App</p>
                          <p className="text-sm text-gray-600">Open any UPI app on your phone</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-coral-100 text-coral-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          2
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Scan QR Code</p>
                          <p className="text-sm text-gray-600">Scan the QR code above</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-coral-100 text-coral-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          3
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Complete Payment</p>
                          <p className="text-sm text-gray-600">Enter amount and confirm</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Popular UPI Apps */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="pt-6"
                  >
                    <p className="text-sm text-gray-600 mb-4">
                      Supported UPI Apps:
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'Amazon Pay', 'WhatsApp Pay'].map((app) => (
                        <span
                          key={app}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-coral-300 hover:text-coral-600 transition-colors"
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default UPIPay;
