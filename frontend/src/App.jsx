import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { getCurrentUser } from 'aws-amplify/auth'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'

import Navbar from './components/Navbar'
import ProductCatalog from './pages/ProductCatalog'
import Cart from './pages/Cart'
import ProductDetail from './pages/ProductDetail'
import AdminPanel from './pages/AdminPanel'
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
    return <div className="loading">Cargando SportShop...</div>
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
              <Authenticator>
                {({ user: authUser }) => {
                  setUser(authUser)
                  return <Cart user={authUser} />
                }}
              </Authenticator>
            } 
          />
          <Route 
            path="/admin" 
            element={
              user ? <AdminPanel user={user} /> : 
              <Authenticator>
                {({ user: authUser }) => {
                  setUser(authUser)
                  return <AdminPanel user={authUser} />
                }}
              </Authenticator>
            } 
          />
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/" /> :
              <Authenticator>
                {({ user: authUser }) => {
                  setUser(authUser)
                  return <Navigate to="/" />
                }}
              </Authenticator>
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App