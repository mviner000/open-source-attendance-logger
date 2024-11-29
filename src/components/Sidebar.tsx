import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SchoolAccountsApi } from '../lib/school_accounts'

const Sidebar: React.FC = () => {
  const location = useLocation()

  const handleSchoolAccountsClick = async (_e: React.MouseEvent) => {
    
    try {
      const accounts = await SchoolAccountsApi.getAllSchoolAccounts()
      console.log('Accounts fetched successfully:', accounts)
    } catch (error) {
      console.error('Error fetching school accounts:', error)
    }
  }

  const sidebarLinks = [
    { path: '/', label: 'School Accounts', onClick: handleSchoolAccountsClick },
    { path: '/attendance', label: 'Attendance' },
    { path: '/records', label: 'Records' }
  ]

  const isActive = (path: string) => {
    return location.pathname === path
      ? 'bg-[#9c781c] text-white'
      : 'text-gray-300 hover:bg-[#9c781c] hover:text-white'
  }

  return (
    <div className="fixed left-10 rounded-l-2xl w-64 bg-[#0D2F16] shadow-lg top-[6rem] bottom-7">
      <nav className="h-full">
        <div className="h-full bg-[#795d18] mx-5 pt-10">
          <div className="flex flex-col gap-5">
            {sidebarLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={link.onClick}
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
      </nav>
    </div>
  )
}

export default Sidebar

