import { motion } from 'framer-motion'
import React from 'react'

export default function ExcelMockup() {
  return (
    <div className="relative">
      {/* Excel window illustration */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-1 backdrop-blur-sm">
        <div className="bg-gray-950 rounded-lg overflow-hidden">
          {/* Window header */}
          <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <span className="text-xs text-gray-500">Financial_Model_2025.xlsx</span>
          </div>
          
          {/* Excel grid */}
          <div className="p-6">
            <div className="grid grid-cols-4 gap-px bg-gray-800">
              {/* Header row */}
              <div className="bg-gray-900 p-2 text-center text-xs text-gray-500"></div>
              <div className="bg-gray-900 p-2 text-center text-xs text-gray-500 font-medium">A</div>
              <div className="bg-gray-900 p-2 text-center text-xs text-gray-500 font-medium">B</div>
              <div className="bg-gray-900 p-2 text-center text-xs text-gray-500 font-medium">C</div>
              
              {/* Data rows */}
              {[1, 2, 3, 4, 5].map((row) => (
                <React.Fragment key={row}>
                  <div className="bg-gray-900 p-2 text-center text-xs text-gray-500 font-medium">{row}</div>
                  <div className="bg-gray-950 p-2 text-xs text-gray-400">
                    {row === 1 && 'Revenue'}
                    {row === 2 && 'COGS'}
                    {row === 3 && 'Gross Profit'}
                    {row === 4 && 'OpEx'}
                    {row === 5 && 'EBITDA'}
                  </div>
                  <div className="bg-gray-950 p-2 text-xs text-gray-400">
                    {row === 1 && '$1,250,000'}
                    {row === 2 && '$750,000'}
                    {row === 3 && '$500,000'}
                    {row === 4 && '$200,000'}
                    {row === 5 && '$300,000'}
                  </div>
                  <div className="bg-gray-950 p-2 text-xs text-gray-400">
                    {row === 1 && '=B1*1.15'}
                    {row === 2 && '=B2*1.10'}
                    {row === 3 && '=C1-C2'}
                    {row === 4 && '=B4*1.05'}
                    {row === 5 && '=C3-C4'}
                  </div>
                </React.Fragment>
              ))}
            </div>
            
            {/* AI Assistant overlay */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="absolute bottom-6 right-6 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              <p className="text-sm font-medium">AI: "Found 3 formula optimizations"</p>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Floating elements */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute -top-4 -right-4 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium"
      >
        50% Faster
      </motion.div>
      
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
        className="absolute -bottom-4 -left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium"
      >
        90% Fewer Errors
      </motion.div>
    </div>
  )
}