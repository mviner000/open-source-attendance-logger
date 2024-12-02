import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
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
    // Load saved IP from localStorage on component mount
    const savedIp = localStorage.getItem(SERVER_IP_KEY) || '';
    setServerIp(savedIp);
  }, []);

  const saveServerIp = (ip: string) => {
    // Enhanced validation to accept localhost and IP addresses with optional port
    const ipRegex = /^(localhost|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(:\d+)?$/;
    if (!ipRegex.test(ip)) {
      toast({
        title: "Invalid IP Address",
        description: "Please enter a valid IP address or localhost (optional port)",
        variant: "destructive"
      });
      return false;
    }

    // Save to localStorage
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
  
  const handleSave = () => {
    if (saveServerIp(inputIp)) {
      // Close dialog logic would go here if using controlled dialog
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className='text-black'><LockKeyhole />Configure LAN</Button>
      </DialogTrigger>
      <DialogContent data-modal-open="true">
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
              placeholder="e.g., localhost:8080 or 127.0.0.1:8080"
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
          <Button type="button" onClick={handleSave}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerConfigModal;