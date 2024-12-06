import React from 'react';

const MelvinQuotes: React.FC = () => {
  return (
    <div className="text-center text-2xl font-bold">
      <div className="p-3 border inline-flex items-center justify-center mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-green-400 to-blue-600 dark:text-white focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 left-[530px]">
        <div className="max-w-screen-xl px-20 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md animate-fade-in-up">
            <p className="font-bold text-3xl mt-4">“Most of the time, <span className='text-blue-700'>other people</span> around you serves as the <span className='text-amber-600'>igniter,</span> your <span className='text-red-600'>own passion</span> is the fuel, and your own <span className='text-2xl font-extrabold uppercase'>deepest why </span>is the reason that makes the <span className='underline'>flame bigger and louder</span>🔥.“</p>
            <p className="text-lg justify-end text-right">Author:</p>
            <p className="text-base justify-end text-right -mt-1.5">Posted By: Melvin Nogoy</p>
        </div>
    </div>
    </div>
  );
};

export default MelvinQuotes;