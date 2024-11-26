import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <img
        src="/bg.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
};

export default HomePage;
