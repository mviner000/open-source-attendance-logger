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
            <h1
                style={{
                    WebkitTextStroke: "1px #198835",
                }}
            className="font-black -ml-1 text-2xl text-white">GJCLibrary
            </h1>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;