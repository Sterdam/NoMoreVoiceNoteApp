import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Shield, 
  Eye, 
  Lock, 
  Database,
  Users,
  Globe,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Download,
  FileText
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function PrivacyPolicy() {
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [gdprMode, setGdprMode] = useState(false);

  const sections = [
    {
      id: 'collection',
      title: 'Information We Collect',
      icon: Database,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Personal data, audio files, and usage information'
    },
    {
      id: 'usage',
      title: 'How We Use Your Data',
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Service provision, AI processing, and improvements'
    },
    {
      id: 'sharing',
      title: 'Third-Party Processing',
      icon: Users,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'OpenAI, Stripe, and other service providers'
    },
    {
      id: 'security',
      title: 'Data Security',
      icon: Lock,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Encryption, access controls, and protection measures'
    },
    {
      id: 'rights',
      title: 'Your Privacy Rights',
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'GDPR, CCPA, and other privacy rights'
    },
    {
      id: 'international',
      title: 'International Transfers',
      icon: Globe,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'Cross-border data processing safeguards'
    }
  ];

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const dataTypes = [
    {
      category: 'Personal Information',
      items: ['Email address', 'Name (optional)', 'Phone number', 'Payment information'],
      purpose: 'Account management and communication',
      retention: 'Duration of account + 90 days'
    },
    {
      category: 'Audio Data',
      items: ['Voice messages', 'Audio files', 'Transcribed text', 'Metadata'],
      purpose: 'AI transcription processing',
      retention: 'Audio: 30 days, Text: Account duration'
    },
    {
      category: 'Usage Data',
      items: ['Service analytics', 'Error logs', 'Device information', 'IP addresses'],
      purpose: 'Service improvement and security',
      retention: '12 months for analytics, 90 days for logs'
    }
  ];

  const thirdPartyServices = [
    {
      name: 'OpenAI Whisper',
      purpose: 'Audio transcription processing',
      dataShared: 'Audio files for AI processing',
      privacy: 'https://openai.com/privacy',
      safeguards: 'Data processing agreement, encryption in transit'
    },
    {
      name: 'Stripe',
      purpose: 'Payment processing',
      dataShared: 'Payment and billing information',
      privacy: 'https://stripe.com/privacy',
      safeguards: 'PCI DSS compliance, tokenization'
    },
    {
      name: 'MongoDB Atlas',
      purpose: 'Database hosting',
      dataShared: 'Encrypted application data',
      privacy: 'https://www.mongodb.com/legal/privacy-policy',
      safeguards: 'Encryption at rest, access controls'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
              <Button 
                variant={gdprMode ? "default" : "outline"} 
                size="sm"
                onClick={() => setGdprMode(!gdprMode)}
              >
                <Shield className="h-4 w-4 mr-2" />
                {gdprMode ? 'GDPR Mode' : 'Standard Mode'}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
            Complete privacy practices and data protection information
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            <span className="font-medium">Last Updated:</span> January 6, 2025 • 
            <span className="font-medium"> Version:</span> 2025-01-06
          </div>
        </motion.div>

        {gdprMode && (
          <Card className="mb-8 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="p-6">
              <div className="flex">
                <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
                    GDPR Enhanced View
                  </h3>
                  <p className="mt-2 text-blue-700 dark:text-blue-300">
                    This view highlights specific GDPR rights and protections. Contact our DPO at 
                    <span className="font-medium"> dpo@voxkill.com</span> for data subject requests.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Privacy Sections Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isExpanded ? 'ring-2 ring-primary-500' : ''
                  }`}
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="p-6">
                    <div className="flex items-center space-x-4 mb-3">
                      <div className={`p-3 rounded-lg ${section.bgColor}`}>
                        <Icon className={`h-6 w-6 ${section.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {section.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {section.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Data Collection Summary */}
        <Card className="mb-8">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Data Collection Summary
            </h2>
            <div className="space-y-6">
              {dataTypes.map((type, index) => (
                <div key={index} className="border rounded-lg p-6 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {type.category}
                    </h3>
                    {gdprMode && (
                      <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                        GDPR Protected
                      </span>
                    )}
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Data Items</h4>
                      <ul className="space-y-1">
                        {type.items.map((item, i) => (
                          <li key={i} className="text-gray-600 dark:text-gray-400">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Purpose</h4>
                      <p className="text-gray-600 dark:text-gray-400">{type.purpose}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Retention</h4>
                      <p className="text-gray-600 dark:text-gray-400">{type.retention}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Third-Party Processing */}
        <Card className="mb-8">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Third-Party Data Processing
            </h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6">
              <div className="flex">
                <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">
                    Important Disclosure
                  </h3>
                  <p className="mt-2 text-yellow-700 dark:text-yellow-300">
                    Your audio data is processed by third-party AI services for transcription. 
                    These services have their own privacy policies and data processing terms.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {thirdPartyServices.map((service, index) => (
                <div key={index} className="border rounded-lg p-6 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {service.name}
                    </h3>
                    <a 
                      href={service.privacy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Purpose</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{service.purpose}</p>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Data Shared</h4>
                      <p className="text-gray-600 dark:text-gray-400">{service.dataShared}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Safeguards</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{service.safeguards}</p>
                      <a 
                        href={service.privacy}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-sm"
                      >
                        View Privacy Policy →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Privacy Rights */}
        <Card className="mb-8">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Your Privacy Rights
            </h2>
            
            {gdprMode && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-3">
                  GDPR Rights (Articles 15-22)
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Right to Access (Article 15)</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Right to Rectification (Article 16)</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Right to Erasure (Article 17)</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Right to Restrict Processing (Article 18)</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Right to Data Portability (Article 20)</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Right to Object (Article 21)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Data Access & Control
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Download your data anytime</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Delete transcriptions individually</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Request complete account deletion</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Correct inaccurate information</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Communication Preferences
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Opt-out of marketing emails</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Control notification preferences</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Manage cookie preferences</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Withdraw consent anytime</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Exercise Your Rights
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                To exercise any of these rights, contact us using the methods below. 
                We will respond within 30 days as required by law.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Data Request Form
                </Button>
                <Button size="sm" variant="outline">
                  Email: privacy@voxkill.com
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Data Security */}
        <Card className="mb-8">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Data Security & Protection
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Encryption</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  TLS 1.3 in transit, AES-256 at rest
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Access Control</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Multi-factor authentication, principle of least privilege
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Infrastructure</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  SOC 2 compliant data centers, regular security audits
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Privacy Contact Information
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-medium mb-2">Privacy Officer</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Email: privacy@voxkill.com<br />
                  Response: 7 days maximum
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Data Protection Officer (GDPR)</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Email: dpo@voxkill.com<br />
                  Response: 30 days maximum
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Data Subject Requests</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Email: datarequests@voxkill.com<br />
                  Portal: Available in account settings
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}