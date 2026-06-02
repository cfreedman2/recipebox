import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Reset default browser styles
const globalStyle = document.createElement('style')
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: #f9f9f9;
    font-family: 'Manrope', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  button { cursor: pointer; }

  @media print {
    nav, .recipe-actions { display: none !important; }
    .recipe-page {
      width: 595px !important;
      height: 841px !important;
      page-break-after: always;
    }
    body { background: white; }
  }
`
document.head.appendChild(globalStyle)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
