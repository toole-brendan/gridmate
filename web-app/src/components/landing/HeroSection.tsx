import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline'
import WaveAnimation from './WaveAnimation'

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-transparent" />
      
      <div className="container-max relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Text content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            {/* Main heading */}
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              From Excel
              <br />
              to AI-Powered
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
                in Seconds
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl text-gray-400 mb-8 max-w-lg">
              Meet the AI-powered financial modeling assistant that transforms 
              how analysts work with Excel. Build models 50% faster with fewer errors.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Get Started
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Link>
              
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-6 py-3 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Watch Demo
              </Link>
            </div>
          </motion.div>

          {/* Right column - Wave animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-[500px]"
          >
            <WaveAnimation />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

