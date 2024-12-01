// src/SplashScreen.tsx

import React, { useEffect } from 'react';
import Lottie from 'lottie-react';
import cloudLoadingAnimation from './assets/loading_splashscreen_bg_spinner.json';
import { Window } from '@tauri-apps/api/window';
import { GJ7Logo } from './components/GJ7Logo';

const Splashscreen: React.FC = () => {
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Get the current window and close it
      const currentWindow = await Window.getCurrent();
      await currentWindow.close();
    }, 10000); // 5 seconds delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#198835] via-[#198835] to-[#0C5C20] flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <Lottie
          animationData={cloudLoadingAnimation}
          loop={true}
          className="w-full h-full object-cover p-10 opacity-30"
        />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="w-full ml-[5rem] mt-10 mb-6">
          <GJ7Logo />
        </div>
      </div>
  </div>
  );
};

export default Splashscreen;
