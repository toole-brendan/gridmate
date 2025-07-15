import ReactDOM from 'react-dom/client'
import { EnhancedChatInterfaceWrapper } from './components/chat/EnhancedChatInterfaceWrapper'
import './styles/index.css'
import './styles/cursor-theme.css'
import './styles/cursor-theme-enhanced.css'

// Office.js initialization
declare const Office: any

console.log('🚀 app.tsx loaded')
console.log('🔍 Office object:', typeof Office !== 'undefined' ? 'Available' : 'NOT AVAILABLE')
console.log('🔍 Document ready state:', document.readyState)


// Main app component
const MainApp = () => {
  console.log('🎨 MainApp rendering')
  return <EnhancedChatInterfaceWrapper />
}

if (typeof Office !== 'undefined') {
  console.log('📌 Office is defined, calling Office.onReady')
  
  Office.onReady((info: any) => {
    console.log('✅ Office.onReady fired!', info)
    console.log('📋 Office info:', JSON.stringify(info, null, 2))
    
    
    try {
      const rootElement = document.getElementById('root')
      console.log('🎯 Root element:', rootElement)
      
      if (!rootElement) {
        console.error('❌ Root element not found!')
        return
      }
      
      const root = ReactDOM.createRoot(rootElement)
      console.log('🌳 React root created')
      
      root.render(<MainApp />)
      
      console.log('✅ React render called')
      
    } catch (error) {
      console.error('❌ Error in Office.onReady:', error)
    }
  })
} else {
  console.error('❌ Office is not defined! This might be running outside of Office context.')
  
  // For testing outside Office
  setTimeout(() => {
    console.log('🔄 Attempting to render without Office.js (test mode)')
    const rootElement = document.getElementById('root')
    if (rootElement) {
      const root = ReactDOM.createRoot(rootElement)
      root.render(
        <MainApp />
      )
    }
  }, 1000)
}