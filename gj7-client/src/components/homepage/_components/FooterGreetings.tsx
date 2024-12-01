import Gradient from "@/components/Gradient";
import { StudentInfo, Attendance } from "@/types";
import { useEffect, useState, lazy, Suspense } from "react";

// Replace next/dynamic with React.lazy
const Clock = lazy(() => import("@/components/Clock"));

type Props = {
  studentDetails: StudentInfo | null;
  currentStep: number;
  setCurrentStep: (num: number) => void;
  responseData: Attendance | null;
};

const FooterGreetings = ({
  studentDetails,
  currentStep,
  setCurrentStep,
  responseData,
}: Props) => {
  const [militaryTime, setMilitaryTime] = useState<boolean>(false);

  useEffect(() => {
    setMilitaryTime(localStorage.getItem("militaryTime") === "true");
  }, []);

  const text = studentDetails
    ? `Hello ${studentDetails?.first_name}! What brings you to the library today?`
    : "Please input ID or scan  QR Code";

  return (
    <div className="z-10 mt-20 flex w-full items-center gap-16 bg-gradient-to-r from-[#035A19] to-[#E0A000]/75 px-16 py-4 font-oswald">
      <p className="text-5xl font-bold drop-shadow w-1/2">
        <Gradient>
          <Suspense fallback={<span>Loading...</span>}>
            <Clock militaryTime={militaryTime} />
          </Suspense>
        </Gradient>
      </p>

      <div className="-ml-48 text-6xl font-semibold drop-shadow">
        {currentStep === 4 && responseData ? (
          <TimedMessage
            message="Your quote of the day. Wait to finish loading..."
            duration={8}
            setCurrentStep={setCurrentStep}
          />
        ) : currentStep === 3 ? (
          <TimedMessage
            message="Your time is logged in. Enjoy your visit at GJC Library"
            duration={2}
            setCurrentStep={setCurrentStep}
          />
        ) : (
          text
        )}
      </div>
    </div>
  );
};

// TimedMessage component remains the same
type TimedMessageProps = {
  message: string;
  duration: number;
  setCurrentStep: (num: number) => void;
};

const TimedMessage = ({ message, duration, setCurrentStep }: TimedMessageProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    const timeout = setTimeout(() => {
      setCurrentStep(1);
    }, duration * 1000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [duration, setCurrentStep]);

  return `${message} (${timeLeft})`;
};

export default FooterGreetings;