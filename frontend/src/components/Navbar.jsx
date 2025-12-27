import { Link } from 'react-router-dom'
import { signOut, fetchUserAttributes } from 'aws-amplify/auth'
import { useState, useEffect } from 'react'

function Navbar({ user, onSignOut }) {
  const [userEmail, setUserEmail] = useState('')

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

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        SportShop
      </Link>
      
      <div className="navbar-nav">
        <Link to="/" className="nav-link">Catálogo</Link>
        
        {user ? (
          <>
            <Link to="/cart" className="nav-link">Carrito</Link>
            <span className="user-email">Hola, {userEmail}</span>
            <button onClick={handleSignOut} className="btn btn-outline">
              Cerrar Sesión
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Iniciar Sesión
          </Link>
        )}
      </div>
    </nav>
  )
}

export default Navbar