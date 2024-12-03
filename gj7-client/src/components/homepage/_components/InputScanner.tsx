// src/InputScanner.tsx

import { useState, useEffect } from "react";
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
import { ServerConfigModal } from "./ServerConfigModal";
import { useAttendanceWebSocket } from "@/utils/websocket";

const InputScanner = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [accountInfo, setAccountInfo] = useState<SchoolIdLookupResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseData, setResponseData] = useState<Attendance | null>(null);
  const [inputVal, setInputVal] = useState(""); 
  const { toast } = useToast();
  const [serverIp, setServerIp] = useState('');
  const { sendAttendance, isConnected } = useAttendanceWebSocket();

  useEffect(() => {
    const savedIp = localStorage.getItem('app_server_ip') || '';
    setServerIp(savedIp);
  }, []);

  useEffect(() => {
    console.log('WebSocket Connection Status:', isConnected);
  }, [isConnected]);

  const fetchStudentDetails = async (schoolId: string) => {
    try {
      setInputVal(schoolId);
      console.log('Fetching details for school ID:', schoolId);
      
      // Use the serverIp state here
      const response = await axios.get<SchoolIdLookupResponse>(
        `http://${serverIp}:8080/school_id/${schoolId}`
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
      console.error('Error fetching student details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch student information",
        variant: "destructive"
      });
    }
  };  

  const handleScan = async (purposeLabel: string) => {

    console.group('Attendance Creation Debug');
    console.log('School ID:', inputVal);
    console.log('Full Name:', accountInfo?.full_name);
    console.log('Classification:', accountInfo?.classification);
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
        classification: accountInfo.classification, // Added this field
        purpose_label: purposeLabel || undefined,
      };
      
      // Send via WebSocket
      sendAttendance(dataToSend);
      
      setCurrentStep(4);
      
      setTimeout(() => {
        setCurrentStep(3);
      }, DURATIONS.PROCESSING_SCREEN * 1000);

      setTimeout(() => {
        setAccountInfo(null);
        setResponseData(null);
        setInputVal(""); 
        setCurrentStep(1);
      }, (DURATIONS.PROCESSING_SCREEN + DURATIONS.SUCCESS_SCREEN) * 1000);
    } catch (error) {
      console.error("Error creating attendance:", error);
  
      toast({
        title: "Attendance Error",
        description: "Failed to create attendance",
        variant: "destructive"
      });
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
    <div className="col-span-2 flex -ml-40 w-full">
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
      <div className="absolute top-4 right-4 z-50">
        <ServerConfigModal />
      </div>
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