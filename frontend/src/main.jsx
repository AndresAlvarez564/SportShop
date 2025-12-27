import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import App from './App.jsx'
import './index.css'

// Configuración de Amplify para Cognito
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_T3kO3fcNC',
      userPoolClientId: '430jtch2ca7ee5fqitctg5rqfv',
      region: 'us-east-1'
      // Removemos identityPoolId por ahora - no lo necesitamos para carrito/admin
    }
  },
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'https://n6k1hqcj6d.execute-api.us-east-1.amazonaws.com/prod',
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