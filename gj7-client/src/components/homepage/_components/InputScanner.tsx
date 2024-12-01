import { useState } from "react";
import { Attendance, CreateAttendanceRequest } from "@/types/attendance";
import { SchoolIdLookupResponse } from "@/types/school_accounts";
import axios from "axios";
import Step1StudentID from "./steps/Step1StudentID";
import Step2ChoosePurpose from "./steps/Step2ChoosePurpose";
import FooterGreetings from "./FooterGreetings";
import Step3Confirmation from "./steps/Step3Confirmation";
import Step4QuoteOfTheDay from "./steps/Step4QuoteOfTheDay";
import { useToast } from "@/hooks/use-toast";

const InputScanner = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [schoolInfo, setSchoolInfo] = useState<SchoolIdLookupResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);
  const [responseData, setResponseData] = useState<Attendance | null>(null);
  const [inputVal, setInputVal] = useState(""); // Store school ID here
  const { toast } = useToast();

  const fetchStudentDetails = async (studentId: string) => {
    try {
      // Explicitly set the inputVal when fetching details
      setInputVal(studentId);

      console.log('Fetching details for school ID:', studentId);
      const response = await axios.get<SchoolIdLookupResponse>(
        `http://localhost:8080/school_id/${studentId}`
      );
      
      // Verify data before setting state
      if (response.data && response.data.full_name) {
        setSchoolInfo(response.data);
        setCurrentStep(2);
      } else {
        console.error('Invalid response structure');
        setIsError(true);
        toast({
          title: "Error",
          description: "Invalid student information",
          variant: "destructive"
        });
      }
    } catch (error) {
      setIsError(true);
      console.error("Invalid ID:", error);
      
      // Reset inputVal if fetch fails
      setInputVal("");
      
      // More detailed error logging
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
    // Comprehensive logging of inputs
    console.group('Attendance Creation Debug');
    console.log('School ID:', inputVal);
    console.log('Full Name:', schoolInfo?.full_name);
    console.log('Purpose Label:', purposeLabel);
    console.log('Complete School Info:', JSON.stringify(schoolInfo, null, 2));
  
    if (!schoolInfo || !inputVal) {
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
    setIsError(false);
    try {
      // Detailed data preparation logging
      const dataToSend: CreateAttendanceRequest = {
        school_id: inputVal,
        full_name: schoolInfo.full_name,
        purpose_label: purposeLabel,
      };
      
      console.log('Request Payload:', JSON.stringify(dataToSend, null, 2));
      
      const response = await axios.post<Attendance>(
        'http://localhost:8080/attendance',
        dataToSend
      );
      
      console.log('Attendance Response:', JSON.stringify(response.data, null, 2));
      
      setResponseData(response.data);
      
      // Log classification from response
      console.log('Attendance Classification:', response.data.classification);
      
      setCurrentStep(4);
      
      setTimeout(() => {
        setCurrentStep(3);
        setSchoolInfo(null);
        setResponseData(null);
        setInputVal(""); // Reset input value
      }, 7000);
    } catch (error) {
      setIsError(true);
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