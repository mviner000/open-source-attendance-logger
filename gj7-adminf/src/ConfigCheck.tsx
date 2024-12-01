import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ConfigStatus {
  Ready: null;
  MissingConfig: { expected_path: string };
  InvalidCredentials: null;
}

export function ConfigCheck() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const status = await invoke<ConfigStatus>('get_config_status');
        setConfigStatus(status);
      } catch (error) {
        console.error('Failed to check config status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkConfig();
  }, []);

  if (isChecking) {
    return <div className="p-4 bg-blue-100 text-blue-800">Checking configuration...</div>;
  }

  if (!configStatus) {
    return null;
  }

  if ('MissingConfig' in configStatus) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-800">
        <h3 className="font-bold mb-2">Configuration Required</h3>
        <p>Please create a config.xml file at:</p>
        <code className="block mt-2 p-2 bg-yellow-50 rounded">
          {configStatus.MissingConfig.expected_path}
        </code>
      </div>
    );
  }

  if ('InvalidCredentials' in configStatus) {
    return (
      <div className="p-4 bg-red-100 text-red-800">
        <h3 className="font-bold mb-2">Invalid Configuration</h3>
        <p>The config.xml file must contain valid username and password credentials.</p>
      </div>
    );
  }

  return null;
}