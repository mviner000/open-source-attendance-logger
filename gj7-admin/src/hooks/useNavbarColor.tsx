// hooks/useNavbarColor.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SettingsStylesApi } from '../lib/settings_styles';
import { useToast } from './use-toast';

interface NavbarColorContextType {
  navbarColor: string;
  tempNavbarColor: string;
  updateTempNavbarColor: (color: string) => void;
  saveNavbarColor: () => Promise<void>;
  cancelColorChange: () => void;
}

const NavbarColorContext = createContext<NavbarColorContextType | undefined>(undefined);

export const NavbarColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navbarColor, setNavbarColor] = useState('#0D2F16');
  const [tempNavbarColor, setTempNavbarColor] = useState('#0D2F16');
  const { toast } = useToast();

  const fetchNavbarColor = useCallback(async () => {
    try {
      const navbarStyleResponse = await SettingsStylesApi.getSettingsStyleByComponentName('navbar-color');
      const bgColorMatch = navbarStyleResponse.tailwind_classes.match(/bg-\[([^)]+)\]/);
      if (bgColorMatch) {
        const fetchedColor = bgColorMatch[1];
        setNavbarColor(fetchedColor);
        setTempNavbarColor(fetchedColor);
      }
    } catch (error) {
      console.error('Failed to fetch navbar style', error);
    }
  }, []);

  useEffect(() => {
    fetchNavbarColor();
  }, [fetchNavbarColor]);

  const updateTempNavbarColor = useCallback((color: string) => {
    setTempNavbarColor(color);
  }, []);

  const saveNavbarColor = useCallback(async () => {
    try {
      await SettingsStylesApi.updateSettingsStyle(
        1, // Assuming the ID is 1, adjust if necessary
        { tailwind_classes: `bg-[${tempNavbarColor}]` },
        'admin', // Replace with actual username
        'your_password' // Replace with actual password
      );
      
      // Update the actual navbar color after successful save
      setNavbarColor(tempNavbarColor);
      
      toast({
        title: 'Success',
        description: 'Successfully updated navbar color',
        variant: 'default',
      });
      
      // Fetch the updated color to ensure consistency
      fetchNavbarColor();
    } catch (error) {
      console.error('Failed to update navbar color', error);
      toast({
        title: 'Error',
        description: 'Failed to update navbar color',
        variant: 'destructive',
      });
    }
  }, [tempNavbarColor, toast, fetchNavbarColor]);

  const cancelColorChange = useCallback(() => {
    // Reset temp color to the current saved color
    setTempNavbarColor(navbarColor);
  }, [navbarColor]);

  return (
    <NavbarColorContext.Provider 
      value={{ 
        navbarColor, 
        tempNavbarColor, 
        updateTempNavbarColor, 
        saveNavbarColor, 
        cancelColorChange 
      }}
    >
      {children}
    </NavbarColorContext.Provider>
  );
};

export const useNavbarColor = () => {
  const context = useContext(NavbarColorContext);
  if (context === undefined) {
    throw new Error('useNavbarColor must be used within a NavbarColorProvider');
  }
  return context;
};