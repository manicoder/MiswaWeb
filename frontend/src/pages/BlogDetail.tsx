import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowLeft, User } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getBlogBySlug } from '../utils/api';
import { format } from 'date-fns';

const BlogDetail: React.FC = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBlog();
  }, [slug]);

  const fetchBlog = async () => {
    if (!slug) return;
    try {
      const response = await getBlogBySlug(slug);
      setBlog(response.data);
    } catch (error) {
      console.error('Error fetching blog:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white" data-testid="blog-detail-loading">
        <Navbar />
        <div className="flex justify-center items-center py-40">
          <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-white" data-testid="blog-not-found">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-40 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog post not found</h1>
          <Link to="/blog" className="text-coral-500 hover:text-coral-600">Back to Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="blog-detail-page">
      <Navbar />

      <article className="pt-32 pb-24" data-testid="blog-article">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/blog"
            data-testid="back-to-blog-link"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-coral-500 mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Blog</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {blog.image_url && (
              <div className="aspect-video rounded-3xl overflow-hidden mb-8 shadow-2xl" data-testid="blog-featured-image">
                <img
                  src={blog.image_url}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center space-x-6 text-sm text-gray-500 mb-6" data-testid="blog-meta">
              <span className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{blog.author}</span>
              </span>
              <span className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(blog.created_at), 'MMMM dd, yyyy')}</span>
              </span>
              <span className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>5 min read</span>
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6" data-testid="blog-title">
              {blog.title}
            </h1>

            <p className="text-xl text-gray-600 mb-8 leading-relaxed" data-testid="blog-excerpt">
              {blog.excerpt}
            </p>

            <div
              data-testid="blog-content"
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </motion.div>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default BlogDetail;