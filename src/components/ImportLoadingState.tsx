// ImportLoadingState.tsx

import { Loader2 } from 'lucide-react';

const ImportLoadingState = () => {
  return (
    <div className="bg-slate-50 rounded-lg p-8 space-y-6">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
          <Loader2 className="absolute inset-0 w-24 h-24 text-blue-500 animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-slate-700">Importing CSV File</h3>
        <p className="text-sm text-slate-500">Please wait while we process your data</p>
      </div>
    </div>
  );
};

export default ImportLoadingState;