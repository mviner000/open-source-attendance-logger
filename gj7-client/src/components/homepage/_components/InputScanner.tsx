import { useState } from "react";
import { Attendance, CreateAttendanceRequest } from "@/types/attendance";
import { SchoolIdLookupResponse } from "@/types/school_accounts";
import axios from "axios";
import Step1SchoolID from "./steps/Step1SschoolID";
import Step2ChoosePurpose from "./steps/Step2ChoosePurpose";
import FooterGreetings from "./FooterGreetings";
import Step3Confirmation from "./steps/Step3Confirmation";
import Step4QuoteOfTheDay from "./steps/Step4QuoteOfTheDay";
import { useToast } from "@/hooks/use-toast";
import { DURATIONS } from "./steps/config/durations";

const InputScanner = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [accountInfo, setAccountInfo] = useState<SchoolIdLookupResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseData, setResponseData] = useState<Attendance | null>(null);
  const [inputVal, setInputVal] = useState(""); 
  const { toast } = useToast();

  const fetchStudentDetails = async (schoolId: string) => {
    try {
      setInputVal(schoolId);

      console.log('Fetching details for school ID:', schoolId);
      const response = await axios.get<SchoolIdLookupResponse>(
        `http://localhost:8080/school_id/${schoolId}`
      );
      
      if (response.data && response.data.full_name) {
        setAccountInfo(response.data);
        setCurrentStep(2);
      } else {
        console.error('Invalid response structure');
        toast({
          title: "Error",
          description: "Invalid student information",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Invalid ID:", error);
      
      setInputVal("");
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error response:', error.response.data);
          console.error('Error status:', error.response.status);
          
          toast({
            title: "Error",
            description: error.response.data?.message || "Failed to fetch student details",
            variant: "destructive"
          });
        }
      }
    }
  };

  const handleScan = async (purposeLabel: string) => {
    console.group('Attendance Creation Debug');
    console.log('School ID:', inputVal);
    console.log('Full Name:', accountInfo?.full_name);
    console.log('Purpose Label:', purposeLabel);
    console.log('Complete School Info:', JSON.stringify(accountInfo, null, 2));
  
    if (!accountInfo || !inputVal) {
      console.error('Missing school information or input value');
      toast({
        title: "Error",
        description: "Please scan your ID again",
        variant: "destructive"
      });
      console.groupEnd();
      return;
    }
    
    setIsSubmitting(true);
    try {
      const dataToSend: CreateAttendanceRequest = {
        school_id: inputVal,
        full_name: accountInfo.full_name,
        purpose_label: purposeLabel,
      };
      
      console.log('Request Payload:', JSON.stringify(dataToSend, null, 2));
      
      const response = await axios.post<Attendance>(
        'http://localhost:8080/attendance',
        dataToSend
      );
      
      console.log('Attendance Response:', JSON.stringify(response.data, null, 2));
      
      setResponseData(response.data);
      
      console.log('Attendance Classification:', response.data.classification);
      
      // Move to Quote of the Day screen
      setCurrentStep(4);
      
      // Dynamic timeout to move to success screen and reset
      setTimeout(() => {
        setCurrentStep(3);
      }, DURATIONS.PROCESSING_SCREEN * 1000);

      // Additional timeout to reset entire state
      setTimeout(() => {
        setAccountInfo(null);
        setResponseData(null);
        setInputVal(""); 
        setCurrentStep(1);
      }, (DURATIONS.PROCESSING_SCREEN + DURATIONS.SUCCESS_SCREEN - 2) * 1000);
    } catch (error) {
      console.error("Error creating attendance:", error);
  
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Server Error Details:", JSON.stringify(error.response.data, null, 2));
          console.error("Error Status:", error.response.status);
          
          toast({
            title: "Attendance Error",
            description: error.response.data?.message || "Failed to create attendance",
            variant: "destructive"
          });
        }
      }
    } finally {
      setIsSubmitting(false);
      console.groupEnd();
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
        availablePurposes={accountInfo?.purposes || {}}
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
            <Step1SchoolID
              studentDetails={accountInfo ? {
                school_id: inputVal,
                full_name: accountInfo.full_name
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
        studentDetails={accountInfo ? {
          school_id: inputVal,
          full_name: accountInfo.full_name
        } : null}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        responseData={responseData}
      />
    </>
  );
};

export default InputScanner;