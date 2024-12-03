import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LockKeyhole } from 'lucide-react';

const SERVER_IP_KEY = 'app_server_ip';

export const useServerConfig = () => {
  const [serverIp, setServerIp] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const savedIp = localStorage.getItem(SERVER_IP_KEY) || '';
    setServerIp(savedIp);
  }, []);

  const saveServerIp = (ip: string) => {
    const ipRegex = /^(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
    if (!ipRegex.test(ip)) {
      toast({
        title: "Invalid IP Address",
        description: "Please enter a valid IP address or localhost",
        variant: "destructive"
      });
      return false;
    }

    localStorage.setItem(SERVER_IP_KEY, ip);
    setServerIp(ip);
    
    toast({
      title: "Server Configuration",
      description: `Server IP set to ${ip}`,
      variant: "default"
    });
    return true;
  };

  return { serverIp, saveServerIp };
};

export const ServerConfigModal = () => {
  const [inputIp, setInputIp] = useState('');
  const { serverIp, saveServerIp } = useServerConfig();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSave = useCallback(() => {
    if (saveServerIp(inputIp)) {
      setIsOpen(false);
    }
  }, [inputIp, saveServerIp]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [handleSave]);

  useEffect(() => {
    setInputIp(serverIp);
  }, [serverIp, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className='text-black'><LockKeyhole />Configure LAN</Button>
      </DialogTrigger>
      <DialogContent data-modal-open="true" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Server Configuration</DialogTitle>
          <DialogDescription>
            Enter the IP address or localhost of your server
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="serverIp" className="text-right">
              Server IP
            </Label>
            <Input
              id="serverIp"
              placeholder="e.g., localhost or 192.168.1.100"
              className="col-span-3"
              value={inputIp}
              onChange={(e) => setInputIp(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Current saved IP: {serverIp || 'Not set'}
          </div>
        </div>
        <div className="flex justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="mr-2">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerConfigModal;
