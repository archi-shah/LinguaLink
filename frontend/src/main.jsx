import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// --- LOGIC BLOCK: REACT ENTRY POINT ---
// This is the very first file that runs in the React frontend.
// It finds the <div id="root"> in the HTML file and "injects" our entire App into it.
// BrowserRouter allows us to have different pages (like /chat, /auth) without reloading the browser.
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App />
  </BrowserRouter>
)
