import "./App.css";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Attendance from './components/Attendance';
import SchoolAccounts from "./components/SchoolAccounts";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Records from "./components/Records";

function App() {
  return (
    <Router>
      <div className="app min-h-screen bg-gradient-to-b from-[#ffe8c2] to-[#2F4A34] flex flex-col">
        <Navbar />
        <div className="flex flex-1 pt-20"> 
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          <div className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<SchoolAccounts />} />
              <Route path="records" element={<Records />} />
              <Route path="/attendance" element={<Attendance />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;

