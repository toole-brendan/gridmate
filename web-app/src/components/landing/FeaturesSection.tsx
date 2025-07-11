import { motion } from 'framer-motion'
import { 
  SparklesIcon, 
  ShieldCheckIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  CpuChipIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: SparklesIcon,
    title: 'AI-Powered Intelligence',
    description: 'Claude-powered assistant that understands financial models and suggests optimizations in real-time.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Human-in-the-Loop Control',
    description: 'Three autonomy levels ensure you maintain complete control over every change to your models.',
  },
  {
    icon: ChartBarIcon,
    title: 'Financial Model Templates',
    description: 'Pre-built DCF, LBO, and M&A templates that adapt intelligently to your specific needs.',
  },
  {
    icon: DocumentTextIcon,
    title: 'EDGAR Integration',
    description: 'Automatically pull and analyze data from 10-Ks, 10-Qs, and other SEC filings.',
  },
  {
    icon: CpuChipIcon,
    title: 'Formula Intelligence',
    description: 'Detect errors, optimize calculations, and validate cross-references automatically.',
  },
  {
    icon: ClockIcon,
    title: 'Complete Audit Trail',
    description: 'Every AI suggestion and user action is logged for compliance and review.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gray-950/50">
      <div className="container-max">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything You Need for
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
              Modern Financial Modeling
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Built by financial analysts, for financial analysts. Every feature designed 
            to make your modeling faster, more accurate, and fully auditable.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-primary-800 transition-colors"
            >
              <feature.icon className="w-12 h-12 text-primary-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}