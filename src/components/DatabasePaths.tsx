import React from 'react';

interface DatabasePathsProps {
  dbPath: string;
  configPath: string;
  dbNamePath: string;
}

const DatabasePaths: React.FC<DatabasePathsProps> = ({ dbPath, configPath, dbNamePath }) => {
  return (
    <div className="p-4 bg-blue-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-2">
          <h3 className="font-semibold text-blue-800 mb-2">Expected Database Locations:</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <span className="font-semibold">Database Directory:</span>
              <br />
              <span className="font-mono">{dbPath}</span>
              <br />
              <span className="text-xs text-blue-600">(Your .db file should be here)</span>
            </p>
            <p>
              <span className="font-semibold">Config Directory:</span>
              <br />
              <span className="font-mono">{configPath}</span>
              <br />
              <span className="text-xs text-blue-600">(Configuration files are stored here)</span>
            </p>
            <p>
              <span className="font-semibold">Database Name File:</span>
              <br />
              <span className="font-mono">{dbNamePath}</span>
              <br />
              <span className="text-xs text-blue-600">(database_name.txt location)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabasePaths;
