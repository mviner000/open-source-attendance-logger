// src/App.tsx

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import "./App.css";
import Splashscreen from "./SplashScreen";
import Navbar from "./components/Navbar";
import HomePage from './components/homepage/HomePage';

// Create a wrapper component to conditionally render Navbar
const AppContent = () => {
  const location = useLocation();
  
  return (
    <div className="app min-h-screen flex flex-col">
      {location.pathname !== "/splashscreen" && <Navbar />}
      <div className="relative flex h-full min-h-[calc(100vh-60px)] w-full flex-col flex-wrap justify-center gap-8 bg-[url(/images/GenSimeonBldg.jpg)] bg-cover bg-top text-white">
        <div className="absolute z-[0] h-full w-full bg-gradient-to-r from-customGreen via-customGreen/60 to-customGreen/0"></div>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/splashscreen" element={<Splashscreen />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;