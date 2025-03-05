// Navbar.tsx

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import NetworkStatus from './NetworkStatus'
import { useNavbarSettings } from '@/hooks/useNavbarSettings'

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const { navbarColor, brandLabel } = useNavbarSettings()

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <nav 
      style={{
        backgroundColor: navbarColor
      }}
      className="shadow-sm fixed top-0 left-0 right-0 z-50"
    >
      <div className="w-full mx-auto sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side: Logo, text, and navigation links */}
          <div className="flex items-center space-x-8 lg:pl-6">
            <Link to="/" className="flex items-center">
              <img
                src="/images/library-logo.png"
                alt="Logo"
                className="h-10 w-auto object-contain -mt-1.5"
              />
              <span className="ml-2 text-lg font-bold text-gray-100 hidden sm:inline">
                {brandLabel}
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-4">
              <NavLink to="/attendance/realtime">
                Statistics Records
              </NavLink>
              <NavLink to="/accounts/paginated">
                School Accounts
              </NavLink>
              <NavLink to="/purpose/manager">
                Purpose Manager
              </NavLink>
              <NavLink to="/attendance/export">
                Attendance CSV
              </NavLink>
              <NavLink to="/classifications">
                Courses Manager
              </NavLink>
            </div>
          </div>

          {/* Right side: Network Status */}
          <div className="flex items-center lg:pr-6">
              <NavLink to="/settings">
                Settings
              </NavLink>
            <div className="hidden md:block">
              <NetworkStatus />
            </div>
            <div className="md:hidden">
              <button onClick={toggleMenu} className="text-gray-100">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <NavLink to="/attendance/realtime" mobile>
              Statistics Records
            </NavLink>
            <NavLink to="/accounts/paginated" mobile>
              School Accounts
            </NavLink>
            <NavLink to="/purpose/manager" mobile>
              Purpose Manager
            </NavLink>
            <NavLink to="/attendance/export" mobile>
              Attendance CSV
            </NavLink>
            <NavLink to="/classifications">
              Courses Manager
            </NavLink>
            <NavLink to="/settings">
              Settings
            </NavLink>
          </div>
          <div className="px-2 py-3">
            <NetworkStatus />
          </div>
        </div>
      )}
    </nav>
  )
}

interface NavLinkProps {
  to: string
  children: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
  mobile?: boolean
}

const NavLink: React.FC<NavLinkProps> = ({ to, children, onClick, mobile }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`${
      mobile
        ? 'block px-3 py-2 rounded-md text-base font-medium'
        : 'inline-flex items-center px-1 pt-1 text-sm font-medium'
    } text-gray-300 hover:bg-gray-700 hover:text-white no-underline transition-colors duration-200`}
  >
    {children}
  </Link>
)

export default Navbar