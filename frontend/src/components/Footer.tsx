import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  Globe,
  MessageCircle,
  Share2,
  LucideIcon,
} from 'lucide-react';
import { getSocialMediaInfo, type SocialMediaLink } from '../utils/api';

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, LucideIcon> = {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  Globe,
  Mail,
  MessageCircle,
  Phone,
  Share2,
};

const Footer: React.FC = () => {
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>([]);

  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const response = await getSocialMediaInfo();
        setSocialLinks(response.data.links || []);
      } catch (error) {
        console.error('Failed to fetch social media links:', error);
        // Fallback to empty array on error
        setSocialLinks([]);
      }
    };

    fetchSocialLinks();
  }, []);

  const getIcon = (iconName: string): LucideIcon | null => {
    return iconMap[iconName] || null;
  };

  return (
    <footer data-testid="main-footer" className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4" data-testid="footer-company-section">
            <img
              src="https://customer-assets.emergentagent.com/job_miswa-brands/artifacts/q24tqy4z_1.png"
              alt="Miswa International"
              className="h-16 w-auto"
              data-testid="footer-logo"
            />
            <p className="text-sm text-gray-300">
              Leading manufacturer and exporter of premium kids' products, specializing in educational toys and children's wear.
            </p>
            <div className="flex space-x-4" data-testid="footer-social-links">
              {socialLinks.length > 0 ? (
                socialLinks.map((link, index) => {
                  const IconComponent = getIcon(link.icon);
                  if (!IconComponent) return null;
                  return (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-coral-400 transition-colors"
                      data-testid={`social-${link.icon.toLowerCase()}`}
                      title={link.title}
                    >
                      <IconComponent className="w-5 h-5" />
                    </a>
                  );
                })
              ) : (
                // Fallback if no links are configured
                <>
                  <a href="#" className="hover:text-coral-400 transition-colors" data-testid="social-facebook">
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a href="#" className="hover:text-coral-400 transition-colors" data-testid="social-twitter">
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a href="#" className="hover:text-coral-400 transition-colors" data-testid="social-instagram">
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a href="#" className="hover:text-coral-400 transition-colors" data-testid="social-linkedin">
                    <Linkedin className="w-5 h-5" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div data-testid="footer-quick-links">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-sm text-gray-300 hover:text-coral-400 transition-colors" data-testid="footer-link-about">About Us</Link></li>
              <li><Link to="/brands" className="text-sm text-gray-300 hover:text-coral-400 transition-colors" data-testid="footer-link-brands">Our Brands</Link></li>
              <li><Link to="/catalogs" className="text-sm text-gray-300 hover:text-coral-400 transition-colors" data-testid="footer-link-catalogs">Catalogs</Link></li>
              <li><Link to="/blog" className="text-sm text-gray-300 hover:text-coral-400 transition-colors" data-testid="footer-link-blog">Blog</Link></li>
              <li><Link to="/careers" className="text-sm text-gray-300 hover:text-coral-400 transition-colors" data-testid="footer-link-careers">Careers</Link></li>
            </ul>
          </div>

          {/* Our Brands */}
          <div data-testid="footer-brands-section">
            <h3 className="text-lg font-semibold mb-4">Our Brands</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://mylittletales.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-300 hover:text-coral-400 transition-colors" data-testid="footer-brand-mlt">
                  MyLittleTales
                </a>
              </li>
              <li>
                <a href="https://tyneetots.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-300 hover:text-coral-400 transition-colors" data-testid="footer-brand-tyneetots">
                  Tynee Tots
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div data-testid="footer-contact-section">
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-coral-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300" data-testid="footer-email">info@mylittletales.com</span>
              </li>
              <li className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-coral-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300" data-testid="footer-phone">+91 8199848535</span>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-coral-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300" data-testid="footer-address">102, New Vasavi Nagar, Hyderabad, Telangana 500015, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-400" data-testid="footer-copyright">
              © {new Date().getFullYear()} Miswa International. All rights reserved.
            </p>
            <div className="flex space-x-6" data-testid="footer-legal-links">
              <a href="#" className="text-sm text-gray-400 hover:text-coral-400 transition-colors">Privacy Policy</a>
              <a href="#" className="text-sm text-gray-400 hover:text-coral-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

