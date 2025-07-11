import { motion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Install the Add-in',
    description: 'One-click installation directly into Excel. No complex setup or IT involvement required.',
  },
  {
    number: '02',
    title: 'Connect Your Data',
    description: 'Link SEC filings, upload documents, or connect to your existing data sources.',
  },
  {
    number: '03',
    title: 'Start Modeling',
    description: 'Select cells, ask questions, and let AI assist with formulas, analysis, and optimization.',
  },
  {
    number: '04',
    title: 'Review & Apply',
    description: 'Preview all changes before applying. Complete audit trail for every modification.',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container-max">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            No complex integrations. No data migration. Just install and start building better models.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-600 to-transparent" />
              )}
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 border-2 border-primary-600 rounded-full mb-4">
                  <span className="text-2xl font-bold text-primary-400">{step.number}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}