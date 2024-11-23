import "./App.css";
import Notes from "./components/Notes";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";  // Import from core
import { logger } from "./lib/logger";

interface NetworkStatus {
  is_online: boolean;
  last_checked: string;
}

interface Credentials {
  username: string;
  password: string;
}


function App() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("");
  const [credentials, setCredentials] = useState<Credentials | null>(null);

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
    // Fetch credentials when component mounts
    const fetchCredentials = async () => {
      try {
        const creds = await invoke<Credentials>('get_credentials');
        setCredentials(creds);
      } catch (error) {
        console.error('Failed to fetch credentials:', error);
      }
    };

    fetchCredentials();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {credentials && (
        <div className="p-4 bg-yellow-100 text-center">
          <p className="text-gray-700">
            Test Credentials - Username: <span className="font-mono">{credentials.username}</span>,
            Password: <span className="font-mono">{credentials.password}</span>
          </p>
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
