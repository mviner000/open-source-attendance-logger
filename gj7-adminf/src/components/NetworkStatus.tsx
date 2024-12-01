import React, { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { logger } from "../lib/logger";

interface NetworkStatus {
  is_online: boolean;
  last_checked: string;
}

const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("");

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
    const interval = setInterval(checkNetworkStatus, 100000);
    return () => clearInterval(interval);
  }, []);

  return (
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
  );
};

export default NetworkStatus;
