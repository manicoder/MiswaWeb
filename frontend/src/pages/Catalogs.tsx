import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getCatalogs } from '../utils/api';

const Catalogs: React.FC = () => {
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      const response = await getCatalogs();
      setCatalogs(response.data);
    } catch (error) {
      console.error('Error fetching catalogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(catalogs.map(c => c.category))];
  const filteredCatalogs = selectedCategory === 'all' 
    ? catalogs 
    : catalogs.filter(c => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white" data-testid="catalogs-page">
      <Navbar />

      <section className="pt-32 pb-24" data-testid="catalogs-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6" data-testid="catalogs-heading">
              Product Catalogs
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto" data-testid="catalogs-subheading">
              Browse our comprehensive collection of premium products
            </p>
          </motion.div>

          {/* Category Filter */}
          <div className="flex justify-center mb-12" data-testid="category-filter">
            <div className="inline-flex bg-gray-100 rounded-full p-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`category-btn-${category}`}
                  className={`px-6 py-2 rounded-full font-medium capitalize transition-all ${
                    selectedCategory === category
                      ? 'bg-white text-coral-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20" data-testid="catalogs-loading">
              <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
            </div>
          ) : filteredCatalogs.length === 0 ? (
            <div className="text-center py-20" data-testid="no-catalogs">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500">No catalogs available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="catalogs-grid">
              {filteredCatalogs.map((catalog, index) => (
                <motion.div
                  key={catalog.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  data-testid={`catalog-card-${index}`}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-coral-50 to-orange-50 flex items-center justify-center">
                    {catalog.image_url ? (
                      <img
                        src={catalog.image_url}
                        alt={catalog.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-20 h-20 text-coral-300" />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="inline-block px-3 py-1 bg-coral-100 text-coral-600 text-xs font-medium rounded-full mb-3 capitalize">
                      {catalog.category}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{catalog.title}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{catalog.description}</p>
                    {catalog.pdf_url && (
                      <a
                        href={catalog.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`catalog-download-${index}`}
                        className="inline-flex items-center space-x-2 text-coral-500 font-medium hover:text-coral-600 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download PDF</span>
                      </a>
                    )}
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

export default Catalogs;