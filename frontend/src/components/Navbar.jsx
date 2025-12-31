import { Link, useLocation } from 'react-router-dom'
import { signOut, fetchUserAttributes } from 'aws-amplify/auth'
import { useState, useEffect } from 'react'

function Navbar({ user, onSignOut }) {
  const [userEmail, setUserEmail] = useState('')
  const location = useLocation()

  useEffect(() => {
    if (user) {
      getUserEmail()
    }
  }, [user])

  const getUserEmail = async () => {
    try {
      const attributes = await fetchUserAttributes()
      setUserEmail(attributes.email || user.username)
    } catch (error) {
      console.error('Error fetching user attributes:', error)
      setUserEmail(user.username)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      onSignOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          SportShop
        </Link>
        
        <ul className="navbar-nav">
          <li>
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              Catálogo
            </Link>
          </li>
          
          {user ? (
            <>
              <li>
                <Link 
                  to="/cart" 
                  className={`nav-link ${isActive('/cart') ? 'active' : ''}`}
                >
                  Carrito
                </Link>
              </li>
              <li>
                <span className="nav-link" style={{ color: 'var(--neutral-600)' }}>
                  {userEmail.split('@')[0]}
                </span>
              </li>
              <li>
                <button onClick={handleSignOut} className="btn btn-outline">
                  Salir
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link to="/login" className="btn btn-primary">
                Iniciar Sesión
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  )
}

export default Navbar