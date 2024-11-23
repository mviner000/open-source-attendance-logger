import "./App.css";
import Notes from "./components/Notes";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";  // Import from core
import { logger } from "./lib/logger";

interface NetworkStatus {
  is_online: boolean;
  last_checked: string;
}

function App() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("");

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
    const interval = setInterval(checkNetworkStatus, 10000);

    return () => clearInterval(interval);  // Cleanup on unmount
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
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
