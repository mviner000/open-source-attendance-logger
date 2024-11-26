import React from 'react';
import { Link } from 'react-router-dom';
import NetworkStatus from './NetworkStatus';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-[#0D2F16] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-100 hover:text-gray-300 transition-colors">
                My App
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/school-accounts" className="border-transparent text-gray-300 hover:border-gray-100 hover:text-gray-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold">
                School Accounts
              </Link>
              <Link to="/notes" className="border-transparent text-gray-300 hover:border-gray-100 hover:text-gray-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold">
                Notes
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

