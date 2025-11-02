import React from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Instagram, 
  Facebook, 
  MessageCircle, 
  Star,
  ExternalLink,
  QrCode,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

const LinksTyneeTots: React.FC = () => {
  const links = [
    {
      name: 'Website',
      url: 'https://www.tyneetots.com',
      icon: Globe,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/mylittletalestoys',
      icon: Instagram,
      color: 'from-purple-500 via-pink-500 to-orange-500',
      hoverColor: 'hover:from-purple-600 hover:via-pink-600 hover:to-orange-600',
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/MyLittleTalesToys',
      icon: Facebook,
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-700 hover:to-blue-800',
    },
    {
      name: 'WhatsApp',
      url: 'https://wa.me/918199848535?text=Hi!',
      icon: MessageCircle,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
    },
    {
      name: 'Google Review',
      url: 'https://www.google.com/maps/search/?api=1&query=Tynee+Tots',
      icon: Star,
      color: 'from-yellow-500 to-yellow-600',
      hoverColor: 'hover:from-yellow-600 hover:to-yellow-700',
      note: 'To get direct review link: Search for your business on Google Maps, click "Write a review", and copy the URL',
    },
  ];

  // Google Review URL - Update this with your actual Google Place review URL
  // Format: https://g.page/r/YOUR_PLACE_ID/review
  // To get it: Search your business on Google Maps → Click "Write a review" → Copy the URL
  const googleReviewUrl = 'https://www.google.com/maps/search/?api=1&query=Tynee+Tots+Review';
  const instagramUrl = 'https://www.instagram.com/mylittletalestoys';

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-indigo-50/30" data-testid="links-tyneetots-page">
      <div className="max-w-md mx-auto px-4 py-12">
        {/* Back Button */}
        <Link to="/links" className="inline-flex items-center space-x-2 text-gray-600 hover:text-purple-500 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Brands</span>
        </Link>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Profile Picture/Logo */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 p-1 shadow-xl">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src="https://customer-assets.emergentagent.com/job_ece25fd4-86f7-4b5b-899a-e81995d5ad91/artifacts/8rg2l7k3_Untitled%20design%20%282%29.png"
                    alt="Tynee Tots"
                    className="w-full h-full object-contain p-3"
                  />
                </div>
              </div>
              {/* Verified Badge */}
              <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Name */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tynee Tots</h1>
          <p className="text-gray-600 mb-6">Premium Kids Clothing & Accessories</p>
          
          {/* Bio */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">
              Delightful collection of premium children's wear and accessories. We focus on comfort, style, and quality to ensure your little ones look adorable while feeling great.
            </p>
          </div>
        </motion.div>

        {/* Links Section */}
        <div className="space-y-4 mb-8">
          {links.map((link, index) => {
            const Icon = link.icon;
            return (
              <motion.a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={`block group relative overflow-hidden bg-gradient-to-r ${link.color} ${link.hoverColor} text-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{link.name}</div>
                      <div className="text-white/80 text-sm flex items-center space-x-1">
                        <span>Visit</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-white/80 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </motion.a>
            );
          })}
        </div>

        {/* QR Codes Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
        >
          <div className="flex items-center justify-center space-x-2 mb-6">
            <QrCode className="w-6 h-6 text-purple-500" />
            <h2 className="text-2xl font-bold text-gray-900">Quick Access QR Codes</h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Google Review QR Code */}
            <div className="text-center">
              <div className="bg-white p-4 rounded-2xl border-2 border-gray-200 mb-3 flex items-center justify-center">
                <QRCodeSVG
                  value={googleReviewUrl}
                  size={120}
                  level="H"
                  includeMargin={false}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center justify-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>Google Review</span>
              </h3>
              <p className="text-xs text-gray-500">Scan to review us</p>
            </div>

            {/* Instagram QR Code */}
            <div className="text-center">
              <div className="bg-white p-4 rounded-2xl border-2 border-gray-200 mb-3 flex items-center justify-center">
                <QRCodeSVG
                  value={instagramUrl}
                  size={120}
                  level="H"
                  includeMargin={false}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center justify-center space-x-1">
                <Instagram className="w-4 h-4 text-pink-500" />
                <span>Instagram</span>
              </h3>
              <p className="text-xs text-gray-500">Scan to follow us</p>
            </div>
          </div>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center mt-8 text-sm text-gray-500"
        >
          <p>Thank you for connecting with us! 🙏</p>
        </motion.div>
      </div>
    </div>
  );
};

export default LinksTyneeTots;

