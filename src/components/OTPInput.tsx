'use client';

import { useRef, useState, useEffect } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  numDigits?: number;
  disabled?: boolean;
}

export default function OTPInput({ value, onChange, numDigits = 6, disabled = false }: OTPInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(numDigits).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const valueDigits = value.split('').slice(0, numDigits);
    const newDigits = [...valueDigits, ...Array(numDigits - valueDigits.length).fill('')];
    setDigits(newDigits);
  }, [value, numDigits]);

  const handleChange = (index: number, digit: string) => {
    if (disabled) return;

    if (digit.length > 1) {
      const pastedData = digit.slice(0, numDigits - index);
      const newDigits = [...digits];
      for (let i = 0; i < pastedData.length; i++) {
        if (index + i < numDigits) {
          newDigits[index + i] = pastedData[i];
        }
      }
      setDigits(newDigits);
      onChange(newDigits.join(''));
      
      const nextIndex = Math.min(index + pastedData.length, numDigits - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(digit)) return;

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    onChange(newDigits.join(''));

    if (digit && index < numDigits - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      
      if (digits[index]) {
        newDigits[index] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        newDigits[index - 1] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < numDigits - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex justify-center space-x-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            if (el) {
              inputRefs.current[index] = el;
            }
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={`
            w-14 h-16 text-2xl font-bold text-center rounded-xl border-2 
            transition-all duration-200 outline-none
            ${digit ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-white'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-200'}
          `}
        />
      ))}
    </div>
  );
}