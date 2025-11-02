import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Instagram, 
  Facebook, 
  MessageCircle, 
  Star,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getLinkPageBySlug, type LinkPage } from '../utils/api';

// Lazy load QR code component for better performance
const QRCodeSVG = lazy(() => import('qrcode.react').then(m => ({ default: m.QRCodeSVG })));

const LinksMyLittleTales: React.FC = () => {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const [linkPage, setLinkPage] = useState<LinkPage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchLinkPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandSlug]);

  const fetchLinkPage = async () => {
    try {
      const slug = brandSlug || 'mylittletales';
      const response = await getLinkPageBySlug(slug);
      setLinkPage(response.data);
    } catch (error) {
      console.error('Failed to fetch link page:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50/30 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!linkPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50/30 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Page Not Found</h1>
          <Link to="/" className="text-coral-500 hover:underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  // Memoize links array to prevent unnecessary recalculations
  const links = useMemo(() => [
    linkPage.website_url && {
      name: 'Website',
      url: linkPage.website_url,
      text: linkPage.website_text || 'Visit',
      icon: Globe,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
    },
    linkPage.instagram_url && {
      name: 'Instagram',
      url: linkPage.instagram_url,
      text: linkPage.instagram_text || 'Visit',
      icon: Instagram,
      color: 'from-purple-500 via-pink-500 to-orange-500',
      hoverColor: 'hover:from-purple-600 hover:via-pink-600 hover:to-orange-600',
    },
    linkPage.facebook_url && {
      name: 'Facebook',
      url: linkPage.facebook_url,
      text: linkPage.facebook_text || 'Visit',
      icon: Facebook,
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-700 hover:to-blue-800',
    },
    linkPage.whatsapp_url && {
      name: 'WhatsApp',
      url: linkPage.whatsapp_url,
      text: linkPage.whatsapp_text || 'Visit',
      icon: MessageCircle,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
    },
    linkPage.google_review_url && {
      name: 'Google Review',
      url: linkPage.google_review_url,
      text: linkPage.google_review_text || 'Visit',
      icon: Star,
      color: 'from-yellow-500 to-yellow-600',
      hoverColor: 'hover:from-yellow-600 hover:to-yellow-700',
    },
  ].filter(Boolean) as Array<{
    name: string;
    url: string;
    text: string;
    icon: any;
    color: string;
    hoverColor: string;
  }>, [linkPage]);

  // Memoize computed values
  const bgGradient = useMemo(() => 
    `bg-gradient-to-b ${linkPage.bg_gradient_from || 'from-orange-50'} ${linkPage.bg_gradient_via || 'via-white'} ${linkPage.bg_gradient_to || 'to-orange-50/30'}`,
    [linkPage.bg_gradient_from, linkPage.bg_gradient_via, linkPage.bg_gradient_to]
  );
  const qrCodes = linkPage.qr_codes || [];

  return (
    <div className={`min-h-screen ${bgGradient} font-lato`} data-testid="links-mylittletales-page">
      <div className="max-w-md mx-auto px-4 py-12">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-12"
        >
          {/* Profile Picture/Logo */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${linkPage.gradient_from || 'from-coral-400'} ${linkPage.gradient_to || 'to-orange-500'} p-1 shadow-xl`}>
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src={linkPage.logo_url}
                    alt={linkPage.brand_name}
                    className="w-full h-full object-contain p-3"
                    loading="lazy"
                    decoding="async"
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{linkPage.brand_name}</h1>
          <p className="text-gray-600 mb-6">{linkPage.tagline}</p>
          
          {/* Bio */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">
              {linkPage.description}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
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
                        <span>{link.text}</span>
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
        {links.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No links available for this brand.</p>
          </div>
        )}

        {/* QR Codes Section */}
        {qrCodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
          >
            <div className="flex items-center justify-center space-x-2 mb-6">
              <QrCode className="w-6 h-6 text-coral-500" />
              <h2 className="text-2xl font-bold text-gray-900">Quick Access QR Codes</h2>
            </div>

            <div className={`grid gap-6 ${qrCodes.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {qrCodes.map((qr, index) => (
                <div key={index} className="text-center">
                  <div className="bg-white p-4 rounded-2xl border-2 border-gray-200 mb-3 flex items-center justify-center min-h-[148px]">
                    <Suspense fallback={<div className="w-[120px] h-[120px] bg-gray-100 animate-pulse rounded" />}>
                      <QRCodeSVG
                        value={qr.url}
                        size={120}
                        level="M"
                        includeMargin={false}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    </Suspense>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {qr.title}
                  </h3>
                  <p className="text-xs text-gray-500">Scan to access</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer Note */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Thank you for connecting with us! 🙏</p>
        </div>
      </div>
    </div>
  );
};

export default LinksMyLittleTales;

