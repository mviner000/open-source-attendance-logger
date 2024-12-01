// src/components/homepage/HomePage.tsx
import InputScanner2 from "./_components/InputScanner2";

// Remove async since this is a client component
function HomePage() {
  return (
    <div className="z-[1]">
      <InputScanner2 />
    </div>
  );
}

export default HomePage;