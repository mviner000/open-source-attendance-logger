import { lazy, Suspense, useEffect, useState } from "react";
import Gradient from "@/components/Gradient";
import { Attendance } from "@/types/attendance";
import { DURATIONS } from "./steps/config/durations";
import TypingText from "./TypingText";

const Clock = lazy(() => import("@/components/Clock"));

type Props = {
  studentDetails: { school_id: string; full_name: string } | null;
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

  const renderMessage = () => {
    if (currentStep === 4 && responseData) {
      return (
        <div className="h-[180px] w-4/6 ml-20">
          <TimedMessage
            message="Processing... Wait to finish loading..."
            duration={DURATIONS.PROCESSING_SCREEN}
            setCurrentStep={setCurrentStep}
          />
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="h-[180px] w-5/6 ml-20">
          <TimedMessage
            message="Your time is logged in. Enjoy your visit at GJC Library"
            duration={DURATIONS.SUCCESS_SCREEN}
            setCurrentStep={setCurrentStep}
          />
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div className="lg:ml-20 md:ml-56 w-full md:text-4xl lg:text-5xl xl:text-6xl">
          <TypingText
            text="Please input ID or scan QR" 
            className="font-extrabold drop-shadow"
          />
        </div>
      );
    }

    if (currentStep === 2 && studentDetails) {
      return (
        <div className="lg:ml-20 md:ml-56 -mr-2 w-full">
          Hello {studentDetails.full_name}! What brings you to the library today?
        </div>
      );
    }

    return null;
  };

  return (
    <div className="mt-20 flex w-full items-center gap-16 bg-gradient-to-r from-[#035A19] to-[#E0A000]/75 px-16 py-6 font-oswald">
      <p className="font-bold drop-shadow lg:w-1/2 md:w-4/5">
        <Gradient>
          <Suspense fallback={<span>Loading...</span>}>
            <Clock militaryTime={militaryTime} />
          </Suspense>
        </Gradient>
      </p>

      <div className="-ml-48 w-4/5 lg:text-6xl md:text-5xl font-extrabold drop-shadow">
        {renderMessage()}
      </div>
    </div>
  );
};

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
    }, DURATIONS.COUNTDOWN_INTERVAL);

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