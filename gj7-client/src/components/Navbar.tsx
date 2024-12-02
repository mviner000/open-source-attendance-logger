// src/components/Navbar.tsx

import React from "react";
import { Link } from 'react-router-dom';
import { X, Minus } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

const WindowControls: React.FC = () => {
  const minimizeWindow = async () => {
    try {
      await invoke('minimize_window');
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const closeWindow = async () => {
    try {
      await invoke('close_window');
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div className="fixed top-0 right-0 flex">
      <button
        onClick={minimizeWindow}
        className="px-4 py-5 hover:bg-customGreen2 transition-colors"
        aria-label="Minimize"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={closeWindow}
        className="px-4 py-5 hover:bg-red-500 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const Navbar: React.FC = () => {

  return (
    <nav className="bg-customGold border-b-4 border-b-customGreen2 text-white shadow-md">
      <WindowControls />
      <div className="mx-2 px-4 py-2 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <img
              src="/images/library-logo.png"
              alt="GJCLibrary Logo"
              className="h-10 w-10 mr-3 object-cover"
            />
            <div className="flex mt-1">
              <h1
                className="static font-black text-2xl text-black">GJCLibrary
              </h1>
              <h1
                className="relative right-[124px] bottom-[2px] font-black -ml-[5px] text-2xl text-white">GJCLibrary
              </h1>
            </div>
          </Link>
          <Link 
            to="/attendance/create" 
            className="border-transparent text-gray-300 hover:border-gray-100 hover:text-gray-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold"
          >
            Attendance Create
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;