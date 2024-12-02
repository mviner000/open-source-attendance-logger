// _components/steps/Step1StudentID.tsx
import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/id-input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// types for Step1StudentID
type Step1StudentIDProps = {
  setCurrentStep: (num: number) => void;
  setStudentDetails: (inputVal: string) => Promise<void>;
  studentDetails: {
    school_id: string;
    full_name: string;
  } | null;
  disabled?: boolean;
  // Optional callback if you want to pass verified school ID
  onStudentVerify?: (schoolId: string) => void;
};

const Step1StudentID: React.FC<Step1StudentIDProps> = ({
  setStudentDetails,
  studentDetails,
  disabled = false,
  onStudentVerify, // Make this optional in the destructuring
}) => {
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const { toast } = useToast();

  const inputRef = useRef<HTMLInputElement>(null);

  const handleVerify = async () => {
    setIsError(false);
    setIsLoading(true);

    try {
      await setStudentDetails(inputVal);
      
      // Only call onStudentVerify if it exists
      if (onStudentVerify) {
        onStudentVerify(inputVal);
      }
    } catch (error) {
      toast({
        title: "Uh oh! Something went wrong.",
        description: "There was a problem with your request.",
      });
      setIsError(true);
      console.log("Error verifying" + error);
      setInputVal("");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    const handleKeyPress = (_e: KeyboardEvent) => {
      // Check if any modal is currently open
      const isModalOpen = document.querySelector('[data-modal-open="true"]');
      
      if (!disabled && !isModalOpen && inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };
  
    document.addEventListener("keydown", handleKeyPress);
  
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [disabled]);

  useEffect(() => {
    if (!studentDetails) {
      setInputVal("");
    }
  }, [studentDetails]);

  return (
    <div className="mt-28 -ml-6">
      <Input
        ref={inputRef}
        placeholder={isError ? "ID Not Found. Please try again." : "Student ID"}
        className={cn(
          isError ? "placeholder:text-red-600" : "placeholder:text-[#CBD5E1]",
          "w-full max-w-[370px] border border-customGreen2 bg-black/45 py-6 text-center text-3xl text-white outline-none placeholder:font-3xl",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        maxLength={8}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && inputVal && !disabled) {
            handleVerify();
          }
        }}
        disabled={isLoading || inputVal === studentDetails?.school_id || disabled}
        autoFocus={!disabled}
      />
    </div>
  );
};

export default Step1StudentID;