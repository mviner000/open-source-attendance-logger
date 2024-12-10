import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const Sidebar: React.FC = () => {
  const location = useLocation()

  const sidebarLinks = [
    { path: '/attendance/realtime', label: 'Statistics Records' },
    { path: '/accounts/paginated', label: 'School Accounts' },
    { path: '/purpose/manager', label: 'Purpose Manager' },
    { path: '/settings', label: 'Settings' }
  ]

  const isActive = (path: string) => {
    return location.pathname === path
      ? 'bg-[#9c781c] text-white'
      : 'text-gray-300 hover:bg-[#9c781c] hover:text-white'
  }

  return (
    <div className="fixed left-10 rounded-l-2xl w-64 bg-[#0D2F16] shadow-lg top-[6rem] bottom-7">
      <nav className="h-full flex flex-col">
        <div className="flex-grow bg-[#795d18] mx-5 pt-10">
          <div className="flex flex-col gap-5">
            {sidebarLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block py-2 px-4 transition-colors duration-200 ${isActive(link.path)} relative`}
              >
                {link.label}
                {location.pathname === link.path && (
                  <div className="absolute -top-[.7rem] left-0 right-0 h-1.5 bg-[#6d0000]"></div>
                )}
              </Link>
            ))}
          </div>
        </div>
        
        {/* Bottom About Link */}
        <div className="mt-auto mx-5 bg-[#795d18]">
          <Link
            to="/about"
            className={`block py-2 px-4 transition-colors duration-200 ${isActive('/about')} relative`}
          >
            About
            {location.pathname === '/about' && (
              <div className="absolute -top-[.7rem] left-0 right-0 h-1.5 bg-[#6d0000]"></div>
            )}
          </Link>
        </div>
      </nav>
    </div>
  )
}

export default Sidebar