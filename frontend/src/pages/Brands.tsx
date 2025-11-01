import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getBrands } from '../utils/api';

const Brands: React.FC = () => {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await getBrands();
      setBrands(response.data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="brands-page">
      <Navbar />

      <section className="pt-32 pb-24" data-testid="brands-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6" data-testid="brands-heading">
              Our Brands
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto" data-testid="brands-subheading">
              Two distinct brands united by a commitment to quality, innovation, and excellence
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center items-center py-20" data-testid="brands-loading">
              <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-24" data-testid="brands-list">
              {brands.map((brand, index) => (
                <motion.div
                  key={brand.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  data-testid={`brand-detail-${index}`}
                  className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-center`}
                >
                  <div className="w-full md:w-1/2">
                    <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-12">
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 space-y-6">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900">{brand.name}</h2>
                    <p className="text-xl text-coral-500 font-medium">{brand.tagline}</p>
                    <p className="text-lg text-gray-600 leading-relaxed">{brand.description}</p>
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`brand-website-link-${index}`}
                    >
                      <button className="inline-flex items-center space-x-2 px-8 py-4 bg-coral-500 hover:bg-coral-600 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                        <span>Visit {brand.name}</span>
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Brands;