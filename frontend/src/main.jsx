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
    }
  },
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'https://sbn5tf3km3.execute-api.us-east-1.amazonaws.com/prod',
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