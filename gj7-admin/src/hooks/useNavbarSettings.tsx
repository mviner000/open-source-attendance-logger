// hooks/useNavbarSettings.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SettingsStylesApi } from '../lib/settings_styles';
import { useToast } from './use-toast';

interface NavbarSettingsContextType {
  navbarColor: string;
  tempNavbarColor: string;
  brandLabel: string;
  navbarColorStyleId: number | null;
  updateTempNavbarColor: (color: string) => void;
  saveNavbarColor: (color?: string) => Promise<void>;
  updateBrandLabel: (newLabel: string) => Promise<void>;
  cancelColorChange: () => void;
}

const NavbarSettingsContext = createContext<NavbarSettingsContextType | undefined>(undefined);

export const NavbarSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navbarColor, setNavbarColor] = useState('#0D2F16');
  const [tempNavbarColor, setTempNavbarColor] = useState('#0D2F16');
  const [brandLabel, setBrandLabel] = useState('Your Brand');
  const [navbarColorStyleId, setNavbarColorStyleId] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchNavbarSettings = useCallback(async () => {
    try {
      // Fetch navbar color
      const navbarStyleResponse = await SettingsStylesApi.getSettingsStyleByComponentName('navbar-color');
      const bgColorMatch = navbarStyleResponse.tailwind_classes.match(/bg-\[([^)]+)\]/);
      if (bgColorMatch) {
        const fetchedColor = bgColorMatch[1];
        setNavbarColor(fetchedColor);
        setTempNavbarColor(fetchedColor);
        
        // Store the style ID for later updates
        setNavbarColorStyleId(navbarStyleResponse.id || null);
      }

      // Fetch brand label
      const brandNameStyleResponse = await SettingsStylesApi.getSettingsStyleByComponentName('brand-name');
      setBrandLabel(brandNameStyleResponse.label || 'Your Brand');
    } catch (error) {
      console.error('Failed to fetch navbar settings', error);
    }
  }, []);

  useEffect(() => {
    fetchNavbarSettings();
  }, [fetchNavbarSettings]);

  const updateTempNavbarColor = useCallback((color: string) => {
    setTempNavbarColor(color);
  }, []);

  const saveNavbarColor = useCallback(async (color?: string) => {
    try {
      // Use the provided color or the current temp color
      const colorToSave = color || tempNavbarColor;

      // Ensure we have a style ID
      if (!navbarColorStyleId) {
        throw new Error('No navbar color style ID found');
      }

      // Update the settings style
      await SettingsStylesApi.updateSettingsStyle(
        navbarColorStyleId, 
        { tailwind_classes: `bg-[${colorToSave}]` },
        'admin', // Replace with actual authentication method
        'your_password' // Replace with secure authentication
      );
      
      // Update the actual navbar color
      setNavbarColor(colorToSave);
      setTempNavbarColor(colorToSave);
      
      toast({
        title: 'Success',
        description: 'Successfully updated navbar color',
        variant: 'default',
      });
      
      // Fetch the updated settings to ensure consistency
      fetchNavbarSettings();
    } catch (error) {
      console.error('Failed to update navbar color', error);
      toast({
        title: 'Error',
        description: 'Failed to update navbar color',
        variant: 'destructive',
      });
    }
  }, [tempNavbarColor, navbarColorStyleId, toast, fetchNavbarSettings]);


  const updateBrandLabel = useCallback(async (newLabel: string) => {
    try {
      // Fetch the brand name style to get its ID
      const brandNameStyleResponse = await SettingsStylesApi.getSettingsStyleByComponentName('brand-name');
      
      if (!brandNameStyleResponse.id) {
        throw new Error('No brand name style ID found');
      }

      // Update the brand label
      await SettingsStylesApi.updateSettingsStyle(
        brandNameStyleResponse.id,
        { label: newLabel },
        'admin', // Replace with actual username
        'your_password' // Replace with actual password
      );
      
      // Update local state
      setBrandLabel(newLabel);
      
      toast({
        title: 'Success',
        description: 'Successfully updated brand label',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to update brand label', error);
      toast({
        title: 'Error',
        description: 'Failed to update brand label',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const cancelColorChange = useCallback(() => {
    // Reset temp color to the current saved color
    setTempNavbarColor(navbarColor);
  }, [navbarColor]);

  return (
    <NavbarSettingsContext.Provider 
      value={{ 
        navbarColor, 
        tempNavbarColor, 
        brandLabel,
        navbarColorStyleId,
        updateTempNavbarColor, 
        saveNavbarColor, 
        updateBrandLabel,
        cancelColorChange 
      }}
    >
      {children}
    </NavbarSettingsContext.Provider>
  );
};

export const useNavbarSettings = () => {
  const context = useContext(NavbarSettingsContext);
  if (context === undefined) {
    throw new Error('useNavbarSettings must be used within a NavbarSettingsProvider');
  }
  return context;
};