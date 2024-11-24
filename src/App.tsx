import "./App.css";
import Notes from "./components/Notes";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "./lib/logger";
import { homeDir, join } from '@tauri-apps/api/path';

interface NetworkStatus {
  is_online: boolean;
  last_checked: string;
}

interface Credentials {
  username: string;
  password: string;
}

interface DatabaseInfo {
  name: string;
  path: string;
}

function App() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("");
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

  // Function to check the network status
  const checkNetworkStatus = async () => {
    try {
      logger.log("Checking network status...", "info");
      const response: NetworkStatus = await invoke("check_network");
      setIsOnline(response.is_online);
      setLastChecked(response.last_checked);
      logger.log(`Network status: ${response.is_online ? "Online" : "Offline"}`, "success");
    } catch (error) {
      logger.log(`Failed to check network status: ${error}`, "error");
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkNetworkStatus();
    getExpectedPaths();
    const interval = setInterval(checkNetworkStatus, 100000);
    return () => clearInterval(interval);
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
    <div className="min-h-screen bg-gray-50">
      {expectedPaths?.dbNamePath}
      {!dbInfo && expectedPaths && (
        <div className="p-4 bg-blue-100">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-2">
              <h3 className="font-semibold text-blue-800 mb-2">Expected Database Locations:</h3>
              <div className="text-sm text-blue-700 space-y-2">
                <p>
                  <span className="font-semibold">Database Directory:</span>
                  <br />
                  <span className="font-mono">{expectedPaths.dbPath}</span>
                  <br />
                  <span className="text-xs text-blue-600">(Your .db file should be here)</span>
                </p>
                <p>
                  <span className="font-semibold">Config Directory:</span>
                  <br />
                  <span className="font-mono">{expectedPaths.configPath}</span>
                  <br />
                  <span className="text-xs text-blue-600">(Configuration files are stored here)</span>
                </p>
                <p>
                  <span className="font-semibold">Database Name File:</span>
                  <br />
                  <span className="font-mono">{expectedPaths.dbNamePath}</span>
                  <br />
                  <span className="text-xs text-blue-600">(database_name.txt location)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {credentials && (
        <div className="p-4 bg-yellow-100">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-2">
              <p className="text-gray-700">
                Test Credentials - Username: <span className="font-mono">{credentials.username}</span>,
                Password: <span className="font-mono">{credentials.password}</span>
              </p>
            </div>
            {dbInfo && (
              <div className="text-center text-sm text-gray-600 border-t border-yellow-200 pt-2">
                <p>
                  Database Name: <span className="font-mono">{dbInfo.name}</span>
                </p>
                <p className="break-all">
                  Location: <span className="font-mono">{dbInfo.path}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="p-4 text-center">
        {isOnline === null ? (
          <p>Checking network status...</p>
        ) : isOnline ? (
          <p className="text-green-600">Online</p>
        ) : (
          <p className="text-red-600">Offline</p>
        )}
        <p>Last checked: {lastChecked ? new Date(lastChecked).toLocaleTimeString() : "N/A"}</p>
      </div>
      <Notes />
    </div>
  );
}

export default App;