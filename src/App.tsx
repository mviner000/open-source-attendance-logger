import "./App.css";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Attendance from './components/Attendance';
import SchoolAccounts from "./components/SchoolAccounts";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";


function App() {

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/school-accounts" element={<SchoolAccounts />} />
          {/* <Route path="/notes" element={<Notes />} /> */}
          <Route path="/attendance" element={<Attendance />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

