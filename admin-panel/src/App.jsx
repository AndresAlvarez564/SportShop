import { useState, useEffect } from 'react'
import { getCurrentUser } from 'aws-amplify/auth'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'

import AdminPanel from './AdminPanel'
import './App.css'

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
    return <div className="loading">Cargando Admin Panel...</div>
  }

  return (
    <div className="App">
      <header className="admin-header-main">
        <h1>🏪 SportShop Admin Panel</h1>
        {user && (
          <div className="user-info">
            <span>👤 {user.username}</span>
            <button 
              onClick={() => {
                import('aws-amplify/auth').then(({ signOut }) => {
                  signOut().then(() => {
                    setUser(null)
                    window.location.reload()
                  })
                })
              }}
              className="btn btn-outline"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </header>
      
      {user ? (
        <AdminPanel user={user} />
      ) : (
        <div className="auth-container">
          <div className="auth-wrapper">
            <h2>Acceso Administrativo</h2>
            <p>Solo usuarios autorizados pueden acceder al panel de administración</p>
            <Authenticator>
              {({ user: authUser }) => {
                setUser(authUser)
                return <AdminPanel user={authUser} />
              }}
            </Authenticator>
          </div>
        </div>
      )}
    </div>
  )
}

export default App