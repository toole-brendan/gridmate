import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800">
      <div className="container-max">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <img 
              src="/gridmate_icon.png" 
              alt="Gridmate logo" 
              className="w-10 h-10"
            />
            <span className="text-white text-xl tracking-[0.2em]" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 300 }}>GRIDMATE</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/docs" className="text-gray-300 hover:text-white transition-colors">
              Docs
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              href="/demo" 
              className="px-4 py-2 text-white border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Book a Demo
            </Link>
            <Link 
              href="/signin" 
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            {isOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-gray-900 border-b border-gray-800"
        >
          <div className="px-4 py-4 space-y-3">
            <Link href="#features" className="block text-gray-300 hover:text-white">
              Features
            </Link>
            <Link href="#how-it-works" className="block text-gray-300 hover:text-white">
              How It Works
            </Link>
            <Link href="#pricing" className="block text-gray-300 hover:text-white">
              Pricing
            </Link>
            <Link href="/docs" className="block text-gray-300 hover:text-white">
              Docs
            </Link>
            <div className="pt-4 space-y-3 border-t border-gray-800">
              <Link href="/demo" className="block text-center px-4 py-2 text-white border border-gray-600 rounded-lg">
                Book a Demo
              </Link>
              <Link href="/signin" className="block text-center px-4 py-2 text-gray-300">
                Sign In
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  )
}