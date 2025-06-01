import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Shield, 
  AlertTriangle, 
  Scale,
  CheckCircle,
  ExternalLink,
  Download
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function TermsOfService() {
  const [acceptedSections, setAcceptedSections] = useState(new Set());
  const [allAccepted, setAllAccepted] = useState(false);

  const sections = [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'disclaimers',
      title: 'Disclaimers & Limitations',
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      id: 'liability',
      title: 'Limitation of Liability',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      id: 'disputes',
      title: 'Dispute Resolution',
      icon: Scale,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ];

  useEffect(() => {
    setAllAccepted(acceptedSections.size === sections.length);
  }, [acceptedSections]);

  const toggleSection = (sectionId) => {
    const newAccepted = new Set(acceptedSections);
    if (newAccepted.has(sectionId)) {
      newAccepted.delete(sectionId);
    } else {
      newAccepted.add(sectionId);
    }
    setAcceptedSections(newAccepted);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to VoxKill
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <FileText className="h-12 w-12 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
            Complete legal terms governing the use of VoxKill services
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            <span className="font-medium">Last Updated:</span> January 6, 2025 • 
            <span className="font-medium"> Version:</span> 2025-01-06
          </div>
        </motion.div>

        {/* Legal Notice */}
        <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="p-6">
            <div className="flex">
              <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">
                  Important Legal Notice
                </h3>
                <p className="mt-2 text-yellow-700 dark:text-yellow-300">
                  These Terms of Service constitute a legally binding agreement. By using VoxKill, 
                  you agree to be bound by these terms. If you do not agree, please do not use our service.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Key Sections Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {sections.map((section) => {
            const Icon = section.icon;
            const isAccepted = acceptedSections.has(section.id);
            
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isAccepted ? 'ring-2 ring-primary-500' : ''
                  }`}
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${section.bgColor}`}>
                        <Icon className={`h-6 w-6 ${section.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {section.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Click to acknowledge understanding
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isAccepted 
                            ? 'bg-primary-600 border-primary-600' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isAccepted && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Full Terms Content */}
        <Card className="mb-8">
          <div className="p-8">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              {/* Section 1: Service Description */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">1. Service Description</h2>
                <p className="mb-4">
                  VoxKill is an AI-powered transcription service that converts audio messages to text. 
                  The Service uses third-party APIs including but not limited to OpenAI Whisper for 
                  transcription processing.
                </p>
              </section>

              {/* Section 2: Key Disclaimers */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">2. Key Disclaimers</h2>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-4">
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-3">
                    Service Provided "AS IS"
                  </h3>
                  <p className="text-red-700 dark:text-red-300">
                    THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
                    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, 
                    FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                  </p>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-4">
                  <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-3">
                    Transcription Accuracy
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF TRANSCRIPTIONS. 
                    Transcription quality may vary based on audio quality, language, accent, and other 
                    factors beyond our control.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-3">
                    Third-Party Services
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 mb-3">
                    The Service relies on third-party APIs and services including:
                  </p>
                  <ul className="list-disc pl-5 text-blue-700 dark:text-blue-300">
                    <li>OpenAI Whisper API for transcription</li>
                    <li>WhatsApp Business API for messaging</li>
                    <li>Stripe for payment processing</li>
                    <li>Various cloud hosting providers</li>
                  </ul>
                  <p className="text-blue-700 dark:text-blue-300 mt-3">
                    WE ARE NOT RESPONSIBLE FOR THE AVAILABILITY, PERFORMANCE, OR SECURITY OF THESE THIRD-PARTY SERVICES.
                  </p>
                </div>
              </section>

              {/* Section 3: Limitation of Liability */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">3. Limitation of Liability</h2>
                <div className="bg-gray-50 dark:bg-gray-800 border rounded-lg p-6">
                  <p className="font-medium mb-3">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      VoxKill shall not be liable for any direct, indirect, incidental, special, 
                      consequential, or punitive damages
                    </li>
                    <li>
                      Our total liability shall not exceed the amount you paid in the twelve (12) 
                      months preceding the claim
                    </li>
                    <li>
                      We disclaim liability for AI-generated content errors or inaccuracies
                    </li>
                    <li>
                      Users are responsible for verifying transcription accuracy
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 4: User Responsibilities */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">4. User Responsibilities</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-400">
                      ✓ Acceptable Use
                    </h3>
                    <ul className="text-sm space-y-1">
                      <li>• Use for lawful purposes only</li>
                      <li>• Verify transcription accuracy</li>
                      <li>• Respect intellectual property rights</li>
                      <li>• Comply with applicable laws</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-red-700 dark:text-red-400">
                      ✗ Prohibited Use
                    </h3>
                    <ul className="text-sm space-y-1">
                      <li>• Copyrighted content without permission</li>
                      <li>• Illegal or harmful content</li>
                      <li>• Sensitive personal information of others</li>
                      <li>• Attempts to circumvent security</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 5: Legal Links */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">5. Related Legal Documents</h2>
                <div className="space-y-3">
                  <Link 
                    to="/privacy" 
                    className="flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Privacy Policy - Data Protection and Processing
                  </Link>
                  <a 
                    href="https://openai.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    OpenAI Privacy Policy - Third-Party Processing
                  </a>
                  <a 
                    href="https://stripe.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Stripe Privacy Policy - Payment Processing
                  </a>
                </div>
              </section>
            </div>
          </div>
        </Card>

        {/* Acceptance Section */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Terms Acknowledgment
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                By clicking "I Accept" below, you acknowledge that you have read, understood, 
                and agree to be bound by these Terms of Service.
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button 
                  disabled={!allAccepted}
                  className={`${!allAccepted ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  I Accept These Terms
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                This acceptance will be legally binding and recorded with timestamp and IP address.
              </p>
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Legal Contact Information
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium mb-2">General Legal Inquiries</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Email: legal@voxkill.com<br />
                  Response time: 5-7 business days
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Terms Questions</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Email: terms@voxkill.com<br />
                  Response time: 3-5 business days
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}