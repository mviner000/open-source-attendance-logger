// PinCodeModal.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from '@/hooks/use-toast';

interface PinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (success: boolean) => void;
  attemptsRemaining: number;
  locked: boolean;
  remainingTime: number;
}

const PinCodeModal: React.FC<PinCodeModalProps> = ({ 
  isOpen, 
  onClose, 
  onVerify, 
  attemptsRemaining,
  locked,
  remainingTime
}) => {
  const [pinCode, setPinCode] = useState('');
  const verifyButtonRef = useRef<HTMLButtonElement>(null);

  const handlePinSubmit = () => {
    if (pinCode === '1234') {
      onVerify(true);
      toast({
        title: "Success",
        description: "Parallel import enabled.",
        duration: 3000,
      });
    } else {
      setPinCode('');
      onVerify(false);
      toast({
        title: "Error",
        description: `Incorrect PIN. ${attemptsRemaining - 1} attempts remaining.`,
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (!locked && pinCode.length === 4) {
          handlePinSubmit();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pinCode, locked]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] flex flex-col items-center p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-semibold">Enter Pincode</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Please enter the 4-digit security pincode (contact admin).
          </p>
        </DialogHeader>
        <div className="my-6">
          <InputOTP
            value={pinCode}
            onChange={setPinCode}
            maxLength={4}
            className="gap-4 mb-2"
          >
            <InputOTPGroup className='space-x-2'>
              {[0, 1, 2, 3].map((index) => (
                <InputOTPSlot 
                  key={index}
                  index={index} 
                  className="w-14 h-14 text-xl border-2 border-blue-500 focus:border-blue-600 rounded-md" 
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        {locked && (
          <div className="text-red-500 text-sm text-center mb-4">
            Parallel import locked. Try again in {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
          </div>
        )}
        <DialogFooter className="w-full">
          <Button 
            ref={verifyButtonRef}
            onClick={handlePinSubmit} 
            disabled={pinCode.length !== 4 || locked}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
          >
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PinCodeModal;

