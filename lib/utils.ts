// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generatePin(length: number = 6): string {
  const digits = '0123456789';
  let pin = '';
  
  // Asegurarnos que el primer dígito no sea 0
  pin += digits.slice(1)[Math.floor(Math.random() * 9)];
  
  // Generar el resto del PIN
  for (let i = 1; i < length; i++) {
    pin += digits[Math.floor(Math.random() * 10)];
  }
  
  return pin;
}

export function generateTemporaryPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}