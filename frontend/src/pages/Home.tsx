import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Globe, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getBrands, type Brand } from '../utils/api';

const Home: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Safe setter that always ensures brands is an array
  const setBrandsSafe = (data: any) => {
    if (Array.isArray(data)) {
      setBrands(data);
    } else {
      console.warn('Attempted to set non-array brands data:', data);
      setBrands([]);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching brands from API...');
      const response = await getBrands();
      console.log('✅ API Response received:', response);
      console.log('📦 Response data:', response.data);
      console.log('📦 Response data type:', typeof response.data);
      console.log('📦 Response data is array?', Array.isArray(response.data));
      
      // Handle different response structures
      let brandsData: Brand[] = [];
      const responseData: any = response?.data;
      
      if (responseData) {
        if (Array.isArray(responseData)) {
          // Direct array response (most common with FastAPI)
          brandsData = responseData;
          console.log('✅ Found direct array response with', brandsData.length, 'brands');
        } else if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
          // Nested response with data property
          brandsData = responseData.data;
          console.log('✅ Found nested array response with', brandsData.length, 'brands');
        } else if (responseData && typeof responseData === 'object') {
          // Single object, wrap in array
          brandsData = [responseData as Brand];
          console.log('✅ Found single object, wrapped in array');
        } else {
          console.warn('⚠️ Unexpected response data structure:', responseData);
        }
      } else if (Array.isArray(response)) {
        // Response itself is an array
        brandsData = response as Brand[];
        console.log('✅ Response itself is array with', brandsData.length, 'brands');
      } else {
        console.warn('⚠️ No valid data found in response:', response);
      }
      
      // Final safety check - ensure it's always an array
      if (!Array.isArray(brandsData)) {
        console.warn('⚠️ Brands data is not an array, defaulting to empty array:', brandsData);
        brandsData = [];
      }
      
      console.log('🎯 Final brands data:', brandsData);
      console.log('🎯 Number of brands:', brandsData.length);
      if (brandsData.length > 0) {
        console.log('🎯 First brand:', brandsData[0]);
      }
      setBrandsSafe(brandsData);
    } catch (error: any) {
      console.error('❌ Error fetching brands:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error response:', error?.response);
      if (error?.response) {
        console.error('❌ Error status:', error.response.status);
        console.error('❌ Error data:', error.response.data);
      }
      // Set empty array on error to prevent .map() errors
      setBrandsSafe([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white" data-testid="home-page">
      <Navbar />

      {/* Hero Section - Apple-inspired */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20" data-testid="hero-section">
        {/* Hero Banner Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1568828668638-b1b4014d91a2?w=1920&q=80"
            alt="Educational Toys"
            className="w-full h-full object-cover"
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-coral-100/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-sky-100/20 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Hero Badge */}
            <div
              data-testid="hero-badge"
              className="inline-flex items-center space-x-2 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full border border-coral-200 shadow-lg"
            >
              <Sparkles className="w-5 h-5 text-coral-500" />
              <span className="text-sm font-medium text-gray-700">Leading Manufacturer & Exporter</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight drop-shadow-2xl" data-testid="hero-heading">
              Crafting
              <span className="block bg-gradient-to-r from-coral-400 via-orange-300 to-yellow-300 bg-clip-text text-transparent">
                Joy & Wonder
              </span>
              <span className="block">for Every Child</span>
            </h1>

            {/* Subheading */}
            <p className="max-w-3xl mx-auto text-lg sm:text-xl text-white leading-relaxed drop-shadow-lg" data-testid="hero-subheading">
              Miswa International brings together premium educational toys and stylish children's wear
              under one roof, serving families and businesses worldwide with excellence and care.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4" data-testid="hero-cta-buttons">
              <Link to="/brands" data-testid="hero-cta-explore">
                <button className="group px-8 py-4 bg-coral-500 hover:bg-coral-600 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center space-x-2">
                  <span>Explore Our Brands</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/contact" data-testid="hero-cta-contact">
                <button className="px-8 py-4 bg-white text-gray-800 rounded-full font-semibold text-lg border-2 border-gray-300 hover:border-coral-400 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all">
                  Get in Touch
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10" data-testid="scroll-indicator">
            <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center p-2 animate-bounce">
              <div className="w-1 h-3 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4" data-testid="features-heading">
              Why Choose Us
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="features-subheading">
              We combine decades of manufacturing excellence with a deep commitment to quality and innovation
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: 'Global Reach',
                description: 'Serving B2B and B2C customers across continents with reliable shipping and support',
              },
              {
                icon: Heart,
                title: 'Quality First',
                description: 'Premium materials and rigorous testing ensure every product meets the highest standards',
              },
              {
                icon: Sparkles,
                title: 'Innovation',
                description: 'Constantly evolving our designs to inspire learning and creativity in children',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                data-testid={`feature-card-${index}`}
                className="group p-8 bg-gradient-to-br from-white to-gray-50 rounded-3xl border border-gray-100 hover:border-coral-200 hover:shadow-xl transition-all"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-coral-100 to-coral-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-coral-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brands Showcase */}
      <section className="py-24 bg-gradient-to-b from-white to-orange-50/50" data-testid="brands-showcase-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4" data-testid="brands-heading">
              Our Family of Brands
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="brands-subheading">
              Two distinct brands, one commitment to excellence
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-testid="brands-grid">
            {loading ? (
              <div className="col-span-2 text-center py-12">
                <p className="text-gray-500">Loading brands...</p>
              </div>
            ) : !Array.isArray(brands) || brands.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <p className="text-gray-500">No brands available at the moment.</p>
                <p className="text-sm text-gray-400 mt-2">
                  {loading ? 'Loading...' : `Debug: brands is ${typeof brands}, length: ${Array.isArray(brands) ? brands.length : 'N/A'}`}
                </p>
              </div>
            ) : (
              Array.isArray(brands) && brands.map((brand, index) => (
              <motion.div
                key={brand.id || brand._id || index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                data-testid={`brand-card-${index}`}
                className="group relative overflow-hidden rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                  <img
                    src={brand.logo_url || brand.logo || brand.website || 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(brand.name)}
                    alt={brand.name}
                    className="w-full h-full object-contain p-12 group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.src = `https://via.placeholder.com/400x300?text=${encodeURIComponent(brand.name)}`;
                    }}
                  />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{brand.name}</h3>
                  <p className="text-coral-500 font-medium mb-4">{brand.tagline || brand.name}</p>
                  <p className="text-gray-600 leading-relaxed mb-6">{brand.description}</p>
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`brand-link-${index}`}
                      className="inline-flex items-center space-x-2 text-coral-500 font-medium hover:text-coral-600 transition-colors"
                    >
                      <span>Visit Website</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                  )}
                </div>
              </motion.div>
              ))
            )}
          </div>

          <div className="text-center mt-12">
            <Link to="/brands" data-testid="view-all-brands-link">
              <button className="px-10 py-4 bg-coral-500 hover:bg-coral-600 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                View All Brands
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-coral-500 via-coral-600 to-orange-500" data-testid="cta-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white" data-testid="cta-heading">
              Ready to Partner With Us?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto" data-testid="cta-subheading">
              Whether you're a retailer looking for premium products or a parent seeking quality items,
              we're here to help.
            </p>
            <Link to="/contact" data-testid="cta-button">
              <button className="px-12 py-5 bg-white hover:bg-gray-50 text-coral-600 rounded-full font-bold text-xl shadow-2xl hover:shadow-3xl transition-all">
                Contact Us Today
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;

