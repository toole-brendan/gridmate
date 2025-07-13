import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChatInterfaceWrapper } from './components/chat/ChatInterfaceWrapper'
import './styles/index.css'

// Office.js initialization
declare const Office: any

console.log('🚀 app.tsx loaded')
console.log('🔍 Office object:', typeof Office !== 'undefined' ? 'Available' : 'NOT AVAILABLE')
console.log('🔍 Document ready state:', document.readyState)

// Add debugging info to the page immediately
const debugDiv = document.createElement('div')
debugDiv.style.cssText = 'position: fixed; top: 0; left: 0; background: yellow; color: black; padding: 10px; z-index: 9999; font-size: 12px;'
debugDiv.innerHTML = '⏳ Waiting for Office.js...'
document.body.appendChild(debugDiv)

// Simple test component for debugging
const TestComponent = () => {
  console.log('🎨 TestComponent rendering')
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', color: '#333' }}>
      <h1>🚀 Gridmate Excel Add-in Debug Mode</h1>
      <p>✅ React is working!</p>
      <p>📅 Time: {new Date().toLocaleTimeString()}</p>
      <div style={{ marginTop: '20px', padding: '10px', background: '#e0e0e0' }}>
        <h3>Loading ChatInterface...</h3>
        <ChatInterfaceWrapper />
      </div>
    </div>
  )
}

if (typeof Office !== 'undefined') {
  console.log('📌 Office is defined, calling Office.onReady')
  
  Office.onReady((info: any) => {
    console.log('✅ Office.onReady fired!', info)
    console.log('📋 Office info:', JSON.stringify(info, null, 2))
    
    debugDiv.innerHTML = '✅ Office.js ready! Mounting React...'
    
    try {
      const rootElement = document.getElementById('root')
      console.log('🎯 Root element:', rootElement)
      
      if (!rootElement) {
        console.error('❌ Root element not found!')
        debugDiv.innerHTML = '❌ Root element not found!'
        return
      }
      
      const root = ReactDOM.createRoot(rootElement)
      console.log('🌳 React root created')
      
      root.render(
        <React.StrictMode>
          <TestComponent />
        </React.StrictMode>
      )
      
      console.log('✅ React render called')
      debugDiv.innerHTML = '✅ React mounted!'
      
      // Remove debug div after 3 seconds
      setTimeout(() => {
        debugDiv.remove()
      }, 3000)
      
    } catch (error) {
      console.error('❌ Error in Office.onReady:', error)
      debugDiv.innerHTML = `❌ Error: ${error}`
    }
  })
} else {
  console.error('❌ Office is not defined! This might be running outside of Office context.')
  debugDiv.innerHTML = '❌ Office.js not available!'
  
  // For testing outside Office
  setTimeout(() => {
    console.log('🔄 Attempting to render without Office.js (test mode)')
    const rootElement = document.getElementById('root')
    if (rootElement) {
      const root = ReactDOM.createRoot(rootElement)
      root.render(
        <React.StrictMode>
          <div style={{ padding: '20px', background: '#ffcccc' }}>
            <h1>⚠️ Running outside Office context</h1>
            <p>Office.js is not available. This is for testing only.</p>
            <TestComponent />
          </div>
        </React.StrictMode>
      )
    }
  }, 1000)
}