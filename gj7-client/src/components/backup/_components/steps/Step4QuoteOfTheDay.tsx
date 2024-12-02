// _components/steps/Step4QuoteOfTheDay.tsx

import React from 'react';

const Step4QuoteOfTheDay: React.FC = () => {
  return (
    <div className="text-center text-2xl font-bold text-customGold">
      <div className="p-5 border inline-flex items-center justify-center mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-green-400 to-blue-600 dark:text-white focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 left-[530px]">
        <div className="w-[520px] px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md animate-fade-in-up">
            <p className="text-2xl italic">Your Quote for the day:</p>
            <p className="font-bold text-3xl">“Quality is more important than quantity. One home run is much better than two doubles.</p>
            <p className="text-lg justify-end text-right">Author: Steve Jobs</p>
            <p className="text-base justify-end text-right">Posted By: admin</p>
        </div>
    </div>
    </div>
  );
};

export default Step4QuoteOfTheDay;