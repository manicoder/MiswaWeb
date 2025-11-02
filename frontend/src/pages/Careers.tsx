import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getCareers, createInquiry } from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';

const Careers: React.FC = () => {
  const [careers, setCareers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchCareers();
  }, []);

  const fetchCareers = async () => {
    try {
      const response = await getCareers(true);
      setCareers(response.data);
    } catch (error) {
      console.error('Error fetching careers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (job: any) => {
    setSelectedJob(job);
    setFormData({ ...formData, message: `Applying for: ${job.title}` });
    setCvFile(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createInquiry({
        ...formData,
        inquiry_type: 'career',
        subject: `Career Application: ${selectedJob?.title || ''}`,
      } as any, cvFile || undefined);
      toast.success('Application submitted successfully! We\'ll be in touch soon.');
      setSelectedJob(null);
      setFormData({ name: '', email: '', phone: '', message: '' });
      setCvFile(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to submit application. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx'];
      
      if (!allowedExtensions.includes(fileExt || '')) {
        toast.error('Please upload a PDF or DOC/DOCX file.');
        e.target.value = '';
        return;
      }
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 10MB.');
        e.target.value = '';
        return;
      }
      
      setCvFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="careers-page">
      <Navbar />

      <section className="pt-32 pb-24" data-testid="careers-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6" data-testid="careers-heading">
              Join Our Team
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto" data-testid="careers-subheading">
              Be part of something special. Explore exciting opportunities at Miswa International.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center items-center py-20" data-testid="careers-loading">
              <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
            </div>
          ) : careers.length === 0 ? (
            <div className="text-center py-20" data-testid="no-careers">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500">No openings available at the moment. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-6" data-testid="careers-list">
              {careers.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  data-testid={`job-card-${index}`}
                  className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 mb-4 md:mb-0">
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{job.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-2">
                          <Briefcase className="w-4 h-4" />
                          <span>{job.department}</span>
                        </span>
                        <span className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </span>
                        <span className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>{job.type}</span>
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleApply(job)}
                      data-testid={`apply-btn-${index}`}
                      className="bg-coral-500 hover:bg-coral-600 text-white px-8 py-3 rounded-full font-medium"
                    >
                      Apply Now
                    </Button>
                  </div>
                  {job.description && (
                    <div 
                      className="mt-4 text-gray-600 leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_strong]:font-bold [&_em]:italic [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2"
                      dangerouslySetInnerHTML={{ __html: job.description }}
                    />
                  )}
                  {job.requirements && (
                    <div className="mt-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Requirements:</h4>
                      <div 
                        className="text-gray-600 leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_strong]:font-bold [&_em]:italic [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2"
                        dangerouslySetInnerHTML={{ __html: Array.isArray(job.requirements) ? job.requirements.map((r: string) => `<p>${r}</p>`).join('') : job.requirements }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Application Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent data-testid="application-dialog">
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                data-testid="applicant-name-input"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                data-testid="applicant-email-input"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                data-testid="applicant-phone-input"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="message">Cover Letter *</Label>
              <Textarea
                id="message"
                data-testid="applicant-message-input"
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cv">CV/Resume (Optional - PDF, DOC, DOCX)</Label>
              <Input
                id="cv"
                type="file"
                accept=".pdf,.doc,.docx"
                data-testid="cv-file-input"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {cvFile && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {cvFile.name} ({(cvFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="submit-application-btn"
              className="w-full bg-coral-500 hover:bg-coral-600"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Careers;