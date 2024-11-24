import "./App.css";
import Notes from "./components/Notes";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "./lib/logger";

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
    // Check network status when component mounts
    checkNetworkStatus();

    // Periodically check the network every 10 seconds
    const interval = setInterval(checkNetworkStatus, 100000);

    return () => clearInterval(interval);  // Cleanup on unmount
  }, []);

  useEffect(() => {
    // Fetch credentials and database info when component mounts
    const fetchInfo = async () => {
      try {
        // Fetch credentials
        const creds = await invoke<Credentials>('get_credentials')
          .catch(error => {
            console.error('Failed to fetch credentials:', {
              error,
              timestamp: new Date().toISOString(),
              details: 'Error occurred while fetching user credentials from the backend'
            });
            return null;
          });

        // Fetch database info
        const db = await invoke<DatabaseInfo>('get_database_info')
          .catch(error => {
            console.error('Failed to fetch database info:', {
              error,
              timestamp: new Date().toISOString(),
              details: 'Error occurred while fetching database information from the backend'
            });
            return null;
          });

        // Update states if data was fetched successfully
        if (creds) setCredentials(creds);
        if (db) setDbInfo(db);

        // Log success or partial success
        if (creds && db) {
          console.log('Successfully fetched all information', {
            timestamp: new Date().toISOString(),
            credentials: 'Fetched successfully',
            database: 'Fetched successfully'
          });
        } else {
          console.warn('Partially failed to fetch information', {
            timestamp: new Date().toISOString(),
            credentials: creds ? 'Success' : 'Failed',
            database: db ? 'Success' : 'Failed'
          });
        }

      } catch (error) {
        // Log any unexpected errors
        console.error('Unexpected error during data fetching:', {
          error,
          timestamp: new Date().toISOString(),
          type: error instanceof Error ? error.constructor.name : typeof error,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    fetchInfo();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
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