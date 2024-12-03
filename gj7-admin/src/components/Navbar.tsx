// Navbar.tsx

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NetworkStatus from './NetworkStatus';
import { SchoolAccountsApi } from '../lib/school_accounts';

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const handleSchoolAccountsClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default navigation
    console.log('School Accounts link clicked');
    
    try {
      console.log('Attempting to fetch school accounts...');
      const accounts = await SchoolAccountsApi.getAllSchoolAccounts();
      console.log('Accounts fetched successfully:', accounts);
      console.log('Number of accounts:', accounts.length);
      
      // Proceed with navigation
      navigate('/');
    } catch (error) {
      console.error('Error fetching school accounts:', error);
    }
  };

  return (
    <nav className="bg-[#0D2F16] shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="#" className="text-xl font-bold text-gray-100 hover:text-gray-300 transition-colors">
                Team Esternon
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link 
                to="/" 
                onClick={handleSchoolAccountsClick}
                className="border-transparent text-gray-300 hover:border-gray-100 hover:text-gray-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold"
              >
                School Accounts
              </Link>
              {/* <Link 
                to="/notes" 
                className="border-transparent text-gray-300 hover:border-gray-100 hover:text-gray-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold"
              >
                Notes
              </Link> */}
              <Link 
                to="/attendance" 
                className="border-transparent text-gray-300 hover:border-gray-100 hover:text-gray-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold"
              >
                Purpose Manager
              </Link>
              <Link 
                to="/attendance/realtime" 
                className="border-transparent text-gray-300 hover:border-gray-100 hover:text-gray-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold"
              >
                Statistics Records
              </Link>
            </div>
          </div>
          <div className="flex items-center text-gray-100">
            <NetworkStatus />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;