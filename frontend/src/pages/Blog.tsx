import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getBlogs } from '../utils/api';
import { format } from 'date-fns';

const Blog: React.FC = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const response = await getBlogs(true);
      setBlogs(response.data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="blog-page">
      <Navbar />

      <section className="pt-32 pb-24" data-testid="blog-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6" data-testid="blog-heading">
              Our Blog
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto" data-testid="blog-subheading">
              Insights, updates, and stories from Miswa International
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center items-center py-20" data-testid="blog-loading">
              <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-20" data-testid="no-blogs">
              <p className="text-lg text-gray-500">No blog posts available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="blog-grid">
              {blogs.map((blog, index) => (
                <motion.div
                  key={blog.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  data-testid={`blog-card-${index}`}
                >
                  <Link to={`/blog/${blog.slug}`} className="group block">
                    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden h-full">
                      <div className="aspect-video bg-gradient-to-br from-coral-50 to-orange-50 overflow-hidden">
                        {blog.image_url ? (
                          <img
                            src={blog.image_url}
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-16 h-16 text-coral-300" />
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(blog.created_at), 'MMM dd, yyyy')}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>5 min read</span>
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-coral-600 transition-colors">
                          {blog.title}
                        </h3>
                        <p className="text-gray-600 mb-4 line-clamp-3">{blog.excerpt}</p>
                        <div className="flex items-center space-x-2 text-coral-500 font-medium group-hover:text-coral-600 transition-colors">
                          <span>Read More</span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
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

export default Blog;