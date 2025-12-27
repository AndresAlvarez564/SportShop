import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import App from './App.jsx'
import './index.css'

// Configuración de Amplify para Cognito - v2 Infrastructure
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_qsxvDHiKb',
      userPoolClientId: '2u95ldb89sjub6t2mga2shed4u',
      region: 'us-east-1'
      // Removemos identityPoolId por ahora - no lo necesitamos para carrito/admin
    }
  },
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'https://lgdw46a47k.execute-api.us-east-1.amazonaws.com/prod',
        region: 'us-east-1'
      }
    }
  }
  // Removemos Storage por ahora hasta que esté configurado correctamente
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)