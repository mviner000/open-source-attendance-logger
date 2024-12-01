// src/App.tsx

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import "./App.css";
import Splashscreen from "./SplashScreen";
import Navbar from "./components/Navbar";
import HomePage from './components/homepage/HomePage';

function App() {
  return (
    <Router>
      <div className="app min-h-screen flex flex-col">
        <Navbar /> {/* Replace your previous navbar with this new component */}
        <div className="relative flex h-full min-h-[calc(100vh-76px)] w-full flex-col flex-wrap justify-center gap-8 bg-[url(/images/GenSimeonBldg.jpg)] bg-cover bg-top text-white">
          <div className="absolute z-[0] h-full w-full bg-gradient-to-r from-customGreen via-customGreen/60 to-customGreen/0"></div>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/splashscreen" element={<Splashscreen />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;