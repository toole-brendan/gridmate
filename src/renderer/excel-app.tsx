import React from 'react'
import ReactDOM from 'react-dom/client'
import { ExcelAddinApp } from './components/ExcelAddinApp'
import './assets/index.css'

// Initialize React app for Excel add-in
const root = ReactDOM.createRoot(document.getElementById('excel-app-root') as HTMLElement)

root.render(
  <React.StrictMode>
    <ExcelAddinApp />
  </React.StrictMode>
)