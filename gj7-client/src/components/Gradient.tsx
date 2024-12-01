import { FC, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

const Gradient: FC<Props> = ({ children }) => {
  return (
    <span className="text-7xl bg-gradient-to-r from-[#00cc66] to-[#00ffd9] bg-clip-text text-transparent">
      {children}
    </span>
  );
};

export default Gradient;