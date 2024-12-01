import { FC, useEffect, useState } from 'react';

interface Props {
  militaryTime: boolean;
}

const Clock: FC<Props> = ({ militaryTime }) => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const formatTime = (num: number) => num.toString().padStart(2, "0");
  const formatHour = (hour: number) => {
    if (militaryTime) {
      return formatTime(hour);
    }
    const adjustedHour = hour % 12 || 12;
    return formatTime(adjustedHour);
  };

  const displayHour = formatHour(time.getHours());
  const displayMin = formatTime(time.getMinutes());
  const displaySec = formatTime(time.getSeconds());

  const ampm = time.getHours() >= 12 ? "pm" : "am";

  return (
    <span className="text-7xl font-bold font-mono">
      {displayHour}
      <span className="text-gray-300 dark:text-white animate-blink">:</span>
      {displayMin}
      <span className="text-gray-300 dark:text-white animate-blink">:</span>
      {displaySec} {!militaryTime && <span className="-ml-8 text-7xl">{ampm}</span>}
    </span>
  );
};

export default Clock;