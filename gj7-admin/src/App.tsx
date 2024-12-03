import "./App.css";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Attendance from './components/Attendance';
import SchoolAccounts from "./components/SchoolAccounts";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import AttendanceRecords from "./components/AttendanceRecords";
import AttendanceRecordsRealtime from "./components/realtime/AttendanceRecordsRealtime";
import AccountsStatsWithImportCSV from "./components/AccountsStatsWithImportCSV";

function App() {
  return (
    <Router>
      <div className="app min-h-screen bg-gradient-to-b from-[#ffe8c2] to-[#2F4A34] flex flex-col">
        <Navbar />
        <div className="flex flex-1 pt-20">
        <div className="2xl:block xl:block lg:block md:hidden sm:hidden hidden">
          <Sidebar />
        </div>
          <div className="flex-1 lg:pl-60 md:pl-0 sm:pl-0 sm:mx-6 lg:mx-10 mt-4">
            <div className="bg-[#123e1e] rounded-r-2xl sm:rounded-2xl h-[calc(100vh-124px)] overflow-hidden lg:px-6">
              <div className="sm:ml-0 h-full">
                <div className="h-full overflow-y-auto">
                  <AccountsStatsWithImportCSV />
                  <Routes>
                    <Route path="/" element={<SchoolAccounts />} />
                    <Route path="/records" element={<AttendanceRecords />} />
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/attendance/realtime" element={<AttendanceRecordsRealtime />} />
                  </Routes>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;