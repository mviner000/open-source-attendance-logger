import "./App.css";
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { invoke } from "@tauri-apps/api/core";
import { homeDir, join } from '@tauri-apps/api/path';
import NetworkStatus from "./components/NetworkStatus";
import CredentialsInfo from "./components/CredentialsInfo";
import DatabasePaths from "./components/DatabasePaths";
import Notes from "./components/Notes";
import SchoolAccounts from "./components/SchoolAccounts";
import Navbar from "./components/Navbar";

interface Credentials {
  username: string;
  password: string;
}

interface DatabaseInfo {
  name: string;
  path: string;
}

function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [expectedPaths, setExpectedPaths] = useState<{
    dbPath: string;
    configPath: string;
    dbNamePath: string;
  } | null>(null);

  // Function to get expected paths
  const getExpectedPaths = async () => {
    try {
      const home = await homeDir();
      const expectedDbPath = await join(home, '.local', 'share', 'nameOftheApp');
      const expectedConfigPath = await join(home, '.config', 'nameOftheApp');
      const expectedDbNamePath = await join(expectedConfigPath, 'database_name.txt');
      
      setExpectedPaths({
        dbPath: expectedDbPath,
        configPath: expectedConfigPath,
        dbNamePath: expectedDbNamePath
      });
    } catch (error) {
      console.error('Failed to determine expected paths:', error);
    }
  };

  useEffect(() => {
    getExpectedPaths();
  }, []);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const creds = await invoke<Credentials>('get_credentials')
          .catch(error => {
            console.error('Failed to fetch credentials:', error);
            return null;
          });

        const db = await invoke<DatabaseInfo>('get_database_info')
          .catch(error => {
            console.error('Failed to fetch database info:', error);
            return null;
          });

        if (creds) setCredentials(creds);
        if (db) setDbInfo(db);

      } catch (error) {
        console.error('Unexpected error during data fetching:', error);
      }
    };

    fetchInfo();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <NetworkStatus />
        <Routes>
          <Route path="/school-accounts" element={<SchoolAccounts />} />
          <Route path="/notes" element={<Notes />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

