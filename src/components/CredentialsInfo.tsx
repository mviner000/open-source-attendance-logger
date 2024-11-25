import React from 'react';

interface Credentials {
  username: string;
  password: string;
}

interface DatabaseInfo {
  name: string;
  path: string;
}

interface CredentialsInfoProps {
  credentials: Credentials;
  dbInfo: DatabaseInfo | null;
}

const CredentialsInfo: React.FC<CredentialsInfoProps> = ({ credentials, dbInfo }) => {
  return (
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
  );
};

export default CredentialsInfo;

