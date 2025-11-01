import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { createInquiry } from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    inquiry_type: 'general',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createInquiry(formData as any);
      toast.success('Thank you for your inquiry! We\'ll get back to you soon.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
        inquiry_type: 'general',
      });
    } catch (error) {
      toast.error('Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white" data-testid="contact-page">
      <Navbar />

      <section className="pt-32 pb-24" data-testid="contact-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6" data-testid="contact-heading">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto" data-testid="contact-subheading">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Contact Form - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border border-gray-100" data-testid="contact-form">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Send us a message</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-base font-semibold text-gray-700 mb-2 block">Full Name *</Label>
                      <Input
                        id="name"
                        data-testid="contact-name-input"
                        required
                        placeholder="John Doe"
                        className="h-12 text-base"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-base font-semibold text-gray-700 mb-2 block">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        data-testid="contact-email-input"
                        required
                        placeholder="john@example.com"
                        className="h-12 text-base"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="phone" className="text-base font-semibold text-gray-700 mb-2 block">Phone *</Label>
                      <Input
                        id="phone"
                        data-testid="contact-phone-input"
                        required
                        placeholder="+91 98765 43210"
                        className="h-12 text-base"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="company" className="text-base font-semibold text-gray-700 mb-2 block">Company</Label>
                      <Input
                        id="company"
                        data-testid="contact-company-input"
                        placeholder="Your company name"
                        className="h-12 text-base"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="inquiry_type" className="text-base font-semibold text-gray-700 mb-2 block">Inquiry Type</Label>
                    <select
                      id="inquiry_type"
                      data-testid="contact-inquiry-type-select"
                      className="w-full h-12 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral-500 bg-white"
                      value={formData.inquiry_type}
                      onChange={(e) => setFormData({ ...formData, inquiry_type: e.target.value })}
                    >
                      <option value="general">General Inquiry</option>
                      <option value="wholesale">Wholesale/B2B</option>
                      <option value="career">Career</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-base font-semibold text-gray-700 mb-2 block">Message *</Label>
                    <Textarea
                      id="message"
                      data-testid="contact-message-input"
                      required
                      rows={6}
                      placeholder="Tell us more about your inquiry..."
                      className="text-base resize-none"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    data-testid="contact-submit-btn"
                    className="w-full bg-coral-500 hover:bg-coral-600 text-white py-4 px-8 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                    {!submitting && <Send className="w-5 h-5" />}
                  </button>
                </form>
              </div>
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              {/* Contact Details Card */}
              <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4" data-testid="contact-email">
                    <div className="w-12 h-12 bg-coral-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-coral-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                      <a href="mailto:info@mylittletales.com" className="text-gray-600 hover:text-coral-500 transition-colors">
                        info@mylittletales.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4" data-testid="contact-phone">
                    <div className="w-12 h-12 bg-coral-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-coral-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Phone</h4>
                      <a href="tel:+918199848535" className="text-gray-600 hover:text-coral-500 transition-colors">
                        +91 8199848535
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4" data-testid="contact-address">
                    <div className="w-12 h-12 bg-coral-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-coral-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Address</h4>
                      <p className="text-gray-600">
                        102, New Vasavi Nagar<br />
                        Hyderabad, Telangana<br />
                        500015, India
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Hours Card */}
              <div className="bg-gradient-to-br from-coral-50 to-orange-50 p-8 rounded-3xl border border-coral-100" data-testid="business-hours">
                <div className="flex items-center space-x-3 mb-4">
                  <Clock className="w-6 h-6 text-coral-500" />
                  <h3 className="text-xl font-semibold text-gray-900">Business Hours</h3>
                </div>
                <div className="space-y-2 text-gray-700">
                  <p className="flex justify-between">
                    <span className="font-medium">Monday - Friday:</span>
                    <span>9:00 AM - 6:00 PM</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-medium">Saturday:</span>
                    <span>9:00 AM - 2:00 PM</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-medium">Sunday:</span>
                    <span>Closed</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-4">(IST - Indian Standard Time)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;