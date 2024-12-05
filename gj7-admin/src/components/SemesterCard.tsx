import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SquarePen, Search, ChevronDown } from 'lucide-react';

interface Semester {
  label: string;
}

interface AccountCounts {
  active_count: number;
  inactive_count: number;
}

interface SemesterCardProps {
  activeSemester: Semester | null;
  setIsSemesterModalOpen: (isOpen: boolean) => void;
  accountCounts: AccountCounts;
  setIsSearchModalOpen: (isOpen: boolean) => void;
}

export default function SemesterCard({ 
  activeSemester, 
  setIsSemesterModalOpen, 
  accountCounts, 
  setIsSearchModalOpen 
}: SemesterCardProps) {
  // Common card content rendering function
  const renderCardContent = (isActiveSemester: boolean) => (
    <>
      <CardHeader className={isActiveSemester ? '' : 'relative'} style={!isActiveSemester ? { zIndex: 1 } : {}}>
        <div className="flex justify-between items-center w-full">
          <CardTitle>
            <div className='flex items-center'>
              <span className='font-light mr-1'>Current Sem:</span>
              <span>
                {activeSemester 
                  ? activeSemester.label 
                  : 'No Active Semester'}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSemesterModalOpen(true)}
                className="-ml-2 -mt-1 hover:bg-transparent"
              >
                <SquarePen className='w-6 h-6'/>
              </Button>
            </div>
          </CardTitle>
          <div className="text-right flex items-center">
            <p className="text-sm font-medium">
              Total: <span className='font-bold'>
                {accountCounts.active_count + accountCounts.inactive_count}
              </span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className={isActiveSemester ? '' : 'relative'} style={!isActiveSemester ? { zIndex: 1 } : {}}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium">Active Accounts</p>
            <p className="text-2xl font-bold">{accountCounts.active_count}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Inactive Accounts</p>
            <p className="text-2xl font-bold">{accountCounts.inactive_count}</p>
          </div>
        </div>
        <Button 
          onClick={() => setIsSearchModalOpen(true)}
          className='w-full rounded-full border border-green-600'
          size="lg"
          variant="outline"
        >
          <div className='flex items-center justify-center'>
            <Search className="mr-1.5 h-4" />
            <span className='mt-1'>Search</span>
          </div>
        </Button>
      </CardContent>
    </>
  );

  return (
    <>
      {activeSemester ? (
        <Card>
          {renderCardContent(true)}
        </Card>
      ) : (
        <div style={{
          position: 'relative',
          borderRadius: '0.75rem',
          padding: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-150%',
            left: '-150%',
            height: '400%',
            width: '400%',
            background: 'conic-gradient(transparent, gold, transparent 30%)',
            animation: 'rotate 4s linear infinite'
          }} />
          <motion.div
            animate={{
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Card className="relative overflow-hidden border-2 border-red-500">
              <div className="text-center pt-4 lg:pt-4">
                <div onClick={() => setIsSemesterModalOpen(true)} className="cursor-pointer p-2 bg-red-800 items-center text-red-100 leading-none lg:rounded-full flex lg:inline-flex" role="alert">
                  <span className="flex rounded-full bg-red-500 uppercase px-2 py-1 text-xs font-bold mr-3">Important</span>
                  <span className="font-semibold mr-2 text-left flex-auto">Please select semester</span>
                  <ChevronDown size="15" className='-ml-1 -mt-1' />
                </div>
              </div>
              {renderCardContent(false)}
            </Card>
          </motion.div>
          <style>
            {`
              @keyframes rotate {
                from {
                  transform: rotate(0deg);
                }
                to {
                  transform: rotate(360deg);
                }
              }
            `}
          </style>
        </div>
      )}
    </>
  );
}