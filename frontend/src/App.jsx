import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { getCurrentUser } from 'aws-amplify/auth'
import { Authenticator, translations } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'

import Navbar from './components/Navbar'
import ProductCatalog from './pages/ProductCatalog'
import Cart from './pages/Cart'
import ProductDetail from './pages/ProductDetail'
import './App.css'

// Traducciones en español
const spanishTranslations = {
  'Forgot your password?': '¿Olvidaste tu contraseña?',
  'Reset password': 'Recuperar contraseña',
  'Send code': 'Enviar código',
  'Code': 'Código',
  'New Password': 'Nueva contraseña',
  'Confirm Password': 'Confirmar contraseña',
  'Change Password': 'Cambiar contraseña',
  'Back to Sign In': 'Volver al inicio de sesión',
  'We Emailed You': 'Te enviamos un email',
  'Your code is on the way. To log in, enter the code we emailed to': 'Tu código está en camino. Para iniciar sesión, ingresa el código que enviamos a',
  'It may take a minute to arrive.': 'Puede tardar un minuto en llegar.',
  'Lost your code?': '¿Perdiste tu código?',
  'Resend Code': 'Reenviar código'
}

// Configurar las traducciones
translations.es = spanishTranslations

// Custom Authenticator components
const formFields = {
  signIn: {
    username: {
      placeholder: 'Ingresa tu email',
      label: 'Email'
    }
  },
  signUp: {
    username: {
      placeholder: 'Ingresa tu email',
      label: 'Email'
    },
    password: {
      placeholder: 'Crea una contraseña segura',
      label: 'Contraseña'
    },
    confirm_password: {
      placeholder: 'Confirma tu contraseña',
      label: 'Confirmar Contraseña'
    }
  },
  forgetPassword: {
    username: {
      placeholder: 'Ingresa tu email',
      label: 'Email'
    }
  },
  confirmResetPassword: {
    username: {
      placeholder: 'Ingresa tu email',
      label: 'Email'
    },
    confirmation_code: {
      placeholder: 'Código de verificación',
      label: 'Código'
    },
    password: {
      placeholder: 'Nueva contraseña segura',
      label: 'Nueva Contraseña'
    }
  },
  confirmSignUp: {
    username: {
      placeholder: 'Ingresa tu email',
      label: 'Email'
    },
    confirmation_code: {
      placeholder: 'Código de verificación',
      label: 'Código'
    }
  }
}

const components = {
  Header() {
    return (
      <div className="auth-header">
        <h1>SportShop</h1>
        <p>Accede a tu cuenta</p>
      </div>
    )
  },
  SignIn: {
    Header() {
      return (
        <div className="auth-header">
          <h1>SportShop</h1>
          <p>Inicia sesión</p>
        </div>
      )
    }
  },
  SignUp: {
    Header() {
      return (
        <div className="auth-header">
          <h1>SportShop</h1>
          <p>Crea tu cuenta</p>
        </div>
      )
    },
    Footer() {
      return (
        <div className="password-requirements">
          <h4>Requisitos de contraseña:</h4>
          <ul>
            <li>• Mínimo 8 caracteres</li>
            <li>• Al menos una letra mayúscula (A-Z)</li>
            <li>• Al menos una letra minúscula (a-z)</li>
            <li>• Al menos un número (0-9)</li>
            <li>• Al menos un carácter especial (!@#$%^&*)</li>
          </ul>
        </div>
      )
    }
  },
  ResetPassword: {
    Header() {
      return (
        <div className="auth-header">
          <h1>SportShop</h1>
          <p>Recuperar contraseña</p>
        </div>
      )
    },
    Footer() {
      return (
        <div className="verification-info">
          <p>Te enviaremos un código de verificación a tu email</p>
        </div>
      )
    }
  },
  ConfirmResetPassword: {
    Header() {
      return (
        <div className="auth-header">
          <h1>SportShop</h1>
          <p>Nueva contraseña</p>
        </div>
      )
    },
    Footer() {
      return (
        <div className="password-requirements">
          <h4>Requisitos de contraseña:</h4>
          <ul>
            <li>• Mínimo 8 caracteres</li>
            <li>• Al menos una letra mayúscula (A-Z)</li>
            <li>• Al menos una letra minúscula (a-z)</li>
            <li>• Al menos un número (0-9)</li>
            <li>• Al menos un carácter especial (!@#$%^&*)</li>
          </ul>
        </div>
      )
    }
  },
  ConfirmSignUp: {
    Header() {
      return (
        <div className="auth-header">
          <h1>SportShop</h1>
          <p>Verificar cuenta</p>
        </div>
      )
    },
    Footer() {
      return (
        <div className="verification-info">
          <p>Revisa tu email y ingresa el código de verificación de 6 dígitos</p>
        </div>
      )
    }
  }
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <h1>SportShop</h1>
          <div className="loading-spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="App">
        <Navbar user={user} onSignOut={() => setUser(null)} />
        
        <Routes>
          <Route path="/" element={<ProductCatalog />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route 
            path="/cart" 
            element={
              user ? <Cart user={user} /> : 
              <div className="auth-page">
                <Authenticator
                  formFields={formFields}
                  components={components}
                  hideSignUp={false}
                  locale="es"
                >
                  {({ user: authUser }) => {
                    setUser(authUser)
                    return <Cart user={authUser} />
                  }}
                </Authenticator>
              </div>
            } 
          />
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/" /> :
              <div className="auth-page">
                <Authenticator
                  formFields={formFields}
                  components={components}
                  hideSignUp={false}
                  locale="es"
                >
                  {({ user: authUser }) => {
                    setUser(authUser)
                    return <Navigate to="/" />
                  }}
                </Authenticator>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App