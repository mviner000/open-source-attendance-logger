// hooks/useNavbarColor.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SettingsStylesApi } from '../lib/settings_styles';
import { useToast } from './use-toast';

interface NavbarColorContextType {
  navbarColor: string;
  updateNavbarColor: (color: string) => void;
  saveNavbarColor: () => Promise<void>;
}

const NavbarColorContext = createContext<NavbarColorContextType | undefined>(undefined);

export const NavbarColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navbarColor, setNavbarColor] = useState('#0D2F16');
  const { toast } = useToast();

  const fetchNavbarColor = useCallback(async () => {
    try {
      const navbarStyleResponse = await SettingsStylesApi.getSettingsStyleByComponentName('navbar-color');
      const bgColorMatch = navbarStyleResponse.tailwind_classes.match(/bg-\[([^)]+)\]/);
      if (bgColorMatch) {
        setNavbarColor(bgColorMatch[1]);
      }
    } catch (error) {
      console.error('Failed to fetch navbar style', error);
    }
  }, []);

  useEffect(() => {
    fetchNavbarColor();
  }, [fetchNavbarColor]);

  const updateNavbarColor = useCallback((color: string) => {
    setNavbarColor(color);
  }, []);

  const saveNavbarColor = useCallback(async () => {
    try {
      await SettingsStylesApi.updateSettingsStyle(
        1, // Assuming the ID is 1, adjust if necessary
        { tailwind_classes: `bg-[${navbarColor}]` },
        'admin', // Replace with actual username
        'your_password'  // Replace with actual password
      );
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
  }, [navbarColor, toast, fetchNavbarColor]);

  return (
    <NavbarColorContext.Provider value={{ navbarColor, updateNavbarColor, saveNavbarColor }}>
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
