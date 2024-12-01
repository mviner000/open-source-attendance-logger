import { useState } from "react";
import { Attendance, StudentInfo } from "@/types";
import axios from "axios";
import { env } from "@/env";

import Step1StudentID from "./steps/Step1StudentID";
import Step2ChoosePurpose from "./steps/Step2ChoosePurpose";
import FooterGreetings from "./FooterGreetings";
import Step3Confirmation from "./steps/Step3Confirmation";
import Step4QuoteOfTheDay from "./steps/Step4QuoteOfTheDay";

const InputScanner = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [studentDetails, setStudentDetails] = useState<StudentInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);
  const [responseData, setResponseData] = useState<Attendance | null>(null);

  const handleScan = async (purpose: string) => {
    setIsSubmitting(true);
    setIsError(false);

    try {
      const dataToSend = {
        school_id: studentDetails?.school_id,
        purpose: purpose,
        status: "time_in",
      };

      const response = await axios.post<Attendance>(
        `${env.VITE_API_URL!}/attendanceV2/`,
        dataToSend
      );

      setResponseData(response.data);
      setCurrentStep(4);

      setTimeout(() => {
        setCurrentStep(3);
        setStudentDetails(null);
        setResponseData(null);
      }, 7000);
    } catch (error) {
      setIsError(true);
      console.log("Invalid ID: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const QRCodeSection = () => (
    <div className="relative size-[316px] flex items-center justify-center">
      <div className="size-[316px] absolute left-1/2 top-0 z-10 -translate-x-1/2 transform font-oswald text-2xl font-bold">
        <div 
          style={{WebkitTextStroke: "1px #198835"}} 
          className="-ml-6 mb-4 font-oswald text-7xl font-bold"
        >
          WELCOME!
        </div>
        <img src={"/images/gjchomepagelink.png"} sizes="30vw" alt="Qr green" />
      </div>
    </div>
  );

  const renderStep2Content = () => (
    <div className="col-span-2 flex items-center justify-center">
      <Step2ChoosePurpose
        handleScan={handleScan}
        isSubmitting={isSubmitting}
      />
    </div>
  );

  const renderStep3Content = () => (
    <div className="col-span-2 flex items-center justify-center">
      <Step3Confirmation />
    </div>
  );

  const renderStep4Content = () => (
    <div className="col-span-2 flex items-center justify-center">
      <Step4QuoteOfTheDay />
    </div>
  );

  return (
    <>
      <div className="z-10 grid grid-cols-3 gap-16 px-16">
        <div className="col-span-1 flex items-center justify-center">
          <div className="flex flex-col">
            <QRCodeSection />
            <Step1StudentID
              studentDetails={studentDetails}
              setCurrentStep={setCurrentStep}
              setStudentDetails={setStudentDetails}
              disabled={currentStep !== 1}
            />
          </div>
        </div>
        
        {currentStep === 2 && renderStep2Content()}
        {currentStep === 3 && renderStep3Content()}
        {currentStep === 4 && renderStep4Content()}
      </div>

      <FooterGreetings
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        studentDetails={studentDetails}
        responseData={responseData}
      />
    </>
  );
};

export default InputScanner;