import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import App from './App.jsx'
import './index.css'

// Configuración de Amplify para Cognito - v3 Infrastructure
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_rxD1eRJLp',
      userPoolClientId: '898d3gn5iesen0psks0hbm5hd',
      region: 'us-east-1',
      loginWith: {
        email: true
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true
        }
      },
      allowGuestAccess: false,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true
      }
      // Removemos identityPoolId por ahora - no lo necesitamos para carrito/admin
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
  // Removemos Storage por ahora hasta que esté configurado correctamente
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)