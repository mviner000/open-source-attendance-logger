import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { env } from "@/env";
import { cn } from "@/lib/utils";
import { StudentInfo } from "@/types";
import axios from "axios";

type Step1StudentIDProps = {
  setCurrentStep: (num: number) => void;
  setStudentDetails: (detail: StudentInfo) => void;
  studentDetails: StudentInfo | null;
  disabled?: boolean;
};

const Step1StudentID: React.FC<Step1StudentIDProps> = ({
  setCurrentStep,
  setStudentDetails,
  studentDetails,
  disabled = false,
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
      const { data } = await axios.get<StudentInfo>(
        `${env.VITE_API_URL!}/accounts/${inputVal}/`,
      );

      setStudentDetails(data);
      setCurrentStep(2);
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
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!disabled && inputRef.current && document.activeElement !== inputRef.current) {
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