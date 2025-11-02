import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getLinkPages, type LinkPage } from '../utils/api';

const Links: React.FC = () => {
  const [linkPages, setLinkPages] = useState<LinkPage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchLinkPages();
  }, []);

  const fetchLinkPages = async () => {
    try {
      const response = await getLinkPages();
      setLinkPages(response.data);
    } catch (error) {
      console.error('Failed to fetch link pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const brands = linkPages.map((page) => ({
    name: page.brand_name,
    slug: page.brand_slug,
    tagline: page.tagline,
    description: page.description,
    logo: page.logo_url,
    gradient: `${page.gradient_from || 'from-orange-400'} ${page.gradient_to || 'to-pink-500'}`,
    hoverGradient: `hover:${page.gradient_from || 'from-orange-500'} hover:${page.gradient_to || 'to-pink-600'}`,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-purple-50/30" data-testid="links-page">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-coral-400 to-orange-500 p-1 shadow-xl">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-coral-500" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose a Brand
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select a brand to view all social links and connect with us
          </p>
        </motion.div>

        {/* Brand Cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {brands.map((brand, index) => (
            <motion.div
              key={brand.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
            >
              <Link to={`/links/${brand.slug}`}>
                <div className={`group relative overflow-hidden bg-gradient-to-br ${brand.gradient} ${brand.hoverGradient} rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] min-h-[400px] flex flex-col`}>
                  {/* Logo */}
                  <div className="mb-6 flex justify-center">
                    <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm p-3 shadow-lg group-hover:scale-110 transition-transform">
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Brand Info */}
                  <div className="flex-1 flex flex-col justify-center text-center">
                    <h2 className="text-3xl font-bold text-white mb-3">{brand.name}</h2>
                    <p className="text-white/90 text-lg font-medium mb-4">{brand.tagline}</p>
                    <p className="text-white/80 text-sm leading-relaxed mb-6">{brand.description}</p>
                    
                    <div className="flex items-center justify-center space-x-2 text-white font-semibold group-hover:translate-x-2 transition-transform">
                      <span>View Links</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>
                </div>
              </Link>
            </motion.div>
            ))}
          </div>
        )}

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-12 text-sm text-gray-500"
        >
          <p>Connect with us on social media! 🎉</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Links;
