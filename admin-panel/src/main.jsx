import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import App from './App.jsx'
import './index.css'

// Configuración de Amplify para Admin Panel - v3 Infrastructure
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_rxD1eRJLp',
      userPoolClientId: '898d3gn5iesen0psks0hbm5hd',
      region: 'us-east-1'
    }
  },
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'https://4pvxg2nvf4.execute-api.us-east-1.amazonaws.com/prod',
        region: 'us-east-1'
      }
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)