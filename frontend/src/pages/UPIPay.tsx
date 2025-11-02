import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  QrCode, 
  Smartphone, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  IndianRupee,
  Shield,
  Clock
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface UPIPaymentData {
  amount: string;
  upiId: string;
  payerName: string;
  transactionId?: string;
}

const UPIPay: React.FC = () => {
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState<UPIPaymentData>({
    amount: '',
    upiId: '',
    payerName: '',
  });
  const [selectedMethod, setSelectedMethod] = useState<'qr' | 'app'>('qr');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = useState<string>('');

  const popularUPIApps = [
    { name: 'Google Pay', icon: '💳', color: 'from-green-500 to-green-600' },
    { name: 'PhonePe', icon: '📱', color: 'from-purple-500 to-purple-600' },
    { name: 'Paytm', icon: '💙', color: 'from-blue-500 to-blue-600' },
    { name: 'BHIM UPI', icon: '🏦', color: 'from-indigo-500 to-indigo-600' },
  ];

  const generateTransactionId = () => {
    return 'TXN' + Date.now().toString().slice(-10) + Math.random().toString(36).substr(2, 5).toUpperCase();
  };

  const handleAmountChange = (value: string) => {
    // Allow only numbers and one decimal point
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(value) || value === '') {
      setPaymentData({ ...paymentData, amount: value });
    }
  };

  const validateUPI = (upi: string): boolean => {
    // Basic UPI validation: should be in format name@paytm or name@okaxis etc.
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    return upiRegex.test(upi);
  };

  const handlePayment = async () => {
    // Validation
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!paymentData.upiId || !validateUPI(paymentData.upiId)) {
      toast.error('Please enter a valid UPI ID (e.g., name@paytm)');
      return;
    }

    if (!paymentData.payerName || paymentData.payerName.trim().length < 2) {
      toast.error('Please enter your name');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    const txnId = generateTransactionId();
    setTransactionId(txnId);

    // Simulate payment processing (replace with actual API call)
    setTimeout(() => {
      // Simulate success (in real app, this would be based on actual payment gateway response)
      const shouldSucceed = Math.random() > 0.3; // 70% success rate for demo
      
      if (shouldSucceed) {
        setPaymentStatus('success');
        toast.success('Payment successful!');
      } else {
        setPaymentStatus('failed');
        toast.error('Payment failed. Please try again.');
      }
      setIsProcessing(false);
    }, 3000);
  };

  const handleReset = () => {
    setPaymentData({
      amount: '',
      upiId: '',
      payerName: '',
    });
    setPaymentStatus('idle');
    setTransactionId('');
    setIsProcessing(false);
  };

  const formatAmount = (amount: string) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white" data-testid="upi-pay-page">
      <Navbar />

      <section className="pt-32 pb-24" data-testid="upi-pay-section">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-coral-500 transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              UPI Payment
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Fast, secure, and convenient payment using UPI
            </p>
          </div>

          <AnimatePresence mode="wait">
            {paymentStatus === 'idle' && (
              <motion.div
                key="payment-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Payment Form */}
                  <div className="lg:col-span-2">
                    <Card className="border-0 shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-3xl">Payment Details</CardTitle>
                        <CardDescription>
                          Enter your payment information to proceed
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Amount Input */}
                        <div>
                          <Label htmlFor="amount" className="text-base font-semibold text-gray-700 mb-2 block">
                            Amount *
                          </Label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                              <IndianRupee className="w-5 h-5 text-gray-400" />
                            </div>
                            <Input
                              id="amount"
                              type="text"
                              placeholder="0.00"
                              className="h-14 pl-12 text-lg font-semibold"
                              value={paymentData.amount}
                              onChange={(e) => handleAmountChange(e.target.value)}
                            />
                          </div>
                          {paymentData.amount && (
                            <p className="mt-2 text-sm text-gray-500">
                              {formatAmount(paymentData.amount)}
                            </p>
                          )}
                        </div>

                        {/* Payer Name */}
                        <div>
                          <Label htmlFor="payerName" className="text-base font-semibold text-gray-700 mb-2 block">
                            Your Name *
                          </Label>
                          <Input
                            id="payerName"
                            type="text"
                            placeholder="John Doe"
                            className="h-12 text-base"
                            value={paymentData.payerName}
                            onChange={(e) => setPaymentData({ ...paymentData, payerName: e.target.value })}
                          />
                        </div>

                        {/* UPI ID */}
                        <div>
                          <Label htmlFor="upiId" className="text-base font-semibold text-gray-700 mb-2 block">
                            UPI ID (VPA) *
                          </Label>
                          <Input
                            id="upiId"
                            type="text"
                            placeholder="name@paytm"
                            className="h-12 text-base"
                            value={paymentData.upiId}
                            onChange={(e) => setPaymentData({ ...paymentData, upiId: e.target.value.toLowerCase() })}
                          />
                          <p className="mt-2 text-xs text-gray-500">
                            Format: name@paytm, name@okaxis, name@ybl, etc.
                          </p>
                        </div>

                        {/* Payment Method Selection */}
                        <div>
                          <Label className="text-base font-semibold text-gray-700 mb-3 block">
                            Payment Method
                          </Label>
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setSelectedMethod('qr')}
                              className={`p-4 rounded-xl border-2 transition-all ${
                                selectedMethod === 'qr'
                                  ? 'border-coral-500 bg-coral-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <QrCode className="w-6 h-6 mx-auto mb-2 text-coral-500" />
                              <span className="text-sm font-medium">QR Code</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedMethod('app')}
                              className={`p-4 rounded-xl border-2 transition-all ${
                                selectedMethod === 'app'
                                  ? 'border-coral-500 bg-coral-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Smartphone className="w-6 h-6 mx-auto mb-2 text-coral-500" />
                              <span className="text-sm font-medium">UPI App</span>
                            </button>
                          </div>
                        </div>

                        {/* Pay Button */}
                        <Button
                          onClick={handlePayment}
                          disabled={isProcessing}
                          className="w-full h-14 text-lg font-semibold bg-coral-500 hover:bg-coral-600 text-white"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-5 h-5" />
                              Pay {paymentData.amount ? formatAmount(paymentData.amount) : 'Amount'}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* QR Code Display */}
                    {selectedMethod === 'qr' && paymentData.amount && paymentData.upiId && (
                      <Card className="border-0 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <QrCode className="w-5 h-5" />
                            <span>Scan QR Code</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-white p-6 rounded-xl border-2 border-gray-200 flex items-center justify-center">
                            <div className="w-full max-w-[200px] aspect-square bg-white p-4 rounded-lg">
                              {/* Placeholder QR Code - In production, use a QR code library */}
                              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
                                <QrCode className="w-24 h-24 text-gray-400" />
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 p-4 bg-coral-50 rounded-lg">
                            <p className="text-sm font-semibold text-gray-900 mb-1">Amount:</p>
                            <p className="text-2xl font-bold text-coral-600">
                              {formatAmount(paymentData.amount)}
                            </p>
                            <p className="text-xs text-gray-600 mt-2">
                              UPI ID: {paymentData.upiId}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Popular UPI Apps */}
                    {selectedMethod === 'app' && (
                      <Card className="border-0 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg">Popular UPI Apps</CardTitle>
                          <CardDescription>
                            Choose your preferred UPI app
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {popularUPIApps.map((app) => (
                            <button
                              key={app.name}
                              className={`w-full p-4 rounded-xl bg-gradient-to-r ${app.color} text-white hover:shadow-lg transition-all transform hover:scale-105`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="text-2xl">{app.icon}</span>
                                  <span className="font-semibold">{app.name}</span>
                                </div>
                                <Smartphone className="w-5 h-5" />
                              </div>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Security Features */}
                    <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <Shield className="w-5 h-5 text-green-600" />
                          <span>Secure Payment</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-start space-x-2">
                          <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>256-bit SSL encryption</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>PCI DSS compliant</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>No card details stored</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            )}

            {paymentStatus === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-md mx-auto"
              >
                <Card className="border-0 shadow-2xl text-center">
                  <CardContent className="pt-12 pb-12">
                    <Loader2 className="w-16 h-16 animate-spin text-coral-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Processing Payment
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Please wait while we process your payment...
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>This may take a few seconds</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {paymentStatus === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-md mx-auto"
              >
                <Card className="border-0 shadow-2xl text-center">
                  <CardContent className="pt-12 pb-12">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
                    </motion.div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">
                      Payment Successful!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Your payment has been processed successfully
                    </p>
                    <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-bold text-lg">{formatAmount(paymentData.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction ID:</span>
                        <span className="font-mono text-sm">{transactionId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">UPI ID:</span>
                        <span className="font-semibold">{paymentData.upiId}</span>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1"
                      >
                        New Payment
                      </Button>
                      <Button
                        onClick={() => navigate('/')}
                        className="flex-1 bg-coral-500 hover:bg-coral-600"
                      >
                        Go Home
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {paymentStatus === 'failed' && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-md mx-auto"
              >
                <Card className="border-0 shadow-2xl text-center">
                  <CardContent className="pt-12 pb-12">
                    <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">
                      Payment Failed
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Unfortunately, your payment could not be processed. Please try again.
                    </p>
                    <div className="flex space-x-4">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1"
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={() => navigate('/')}
                        className="flex-1 bg-coral-500 hover:bg-coral-600"
                      >
                        Go Home
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default UPIPay;

