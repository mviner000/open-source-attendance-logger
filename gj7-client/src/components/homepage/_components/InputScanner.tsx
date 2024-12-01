// _components/InputScanner.tsx

import { useState } from "react";
import { Attendance, CreateAttendanceRequest } from "@/types/attendance";
import { SchoolIdLookupResponse } from "@/types/school_accounts";
import axios from "axios";
import Step1StudentID from "./steps/Step1StudentID";
import Step2ChoosePurpose from "./steps/Step2ChoosePurpose";
import FooterGreetings from "./FooterGreetings";
import Step3Confirmation from "./steps/Step3Confirmation";
import Step4QuoteOfTheDay from "./steps/Step4QuoteOfTheDay";

const InputScanner = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [schoolInfo, setSchoolInfo] = useState<SchoolIdLookupResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);
  const [responseData, setResponseData] = useState<Attendance | null>(null);
  const [inputVal, setInputVal] = useState("");

  const fetchStudentDetails = async (inputVal: string) => {
    try {
      const response = await axios.get<SchoolIdLookupResponse>(
        `http://localhost:8080/school_id/${inputVal}`
      );
      setSchoolInfo(response.data);
      setCurrentStep(2);
    } catch (error) {
      setIsError(true);
      console.error("Invalid ID:", error);
    }
  };

  const handleScan = async (purposeLabel: string) => {
    if (!schoolInfo) return;
    
    setIsSubmitting(true);
    setIsError(false);
    try {
      const dataToSend: CreateAttendanceRequest = {
        school_id: inputVal,
        purpose_label: purposeLabel,
      };
      
      const response = await axios.post<Attendance>(
        'http://localhost:8080/attendance',
        dataToSend
      );
      
      setResponseData(response.data);
      setCurrentStep(4);
      
      setTimeout(() => {
        setCurrentStep(3);
        setSchoolInfo(null);
        setResponseData(null);
      }, 7000);
    } catch (error) {
      setIsError(true);
      console.error("Error creating attendance:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
            // Server responded with an error
            console.error("Server error:", error.response.data);
        } else if (error.request) {
            // Request was made but no response
            console.error("No response from server");
        } else {
            // Something else went wrong
            console.error("Error:", error.message);
        }
    }
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
        availablePurposes={schoolInfo?.purposes || {}}
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
              studentDetails={schoolInfo ? {
                school_id: inputVal,
                full_name: schoolInfo.full_name
              } : null}
              setCurrentStep={setCurrentStep}
              setStudentDetails={fetchStudentDetails}
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
        studentDetails={schoolInfo ? {
          school_id: inputVal,
          full_name: schoolInfo.full_name
        } : null}
        responseData={responseData}
      />
    </>
  );
};

export default InputScanner;