"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number; // 0.5 a 5.0
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  label?: string;
}

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  showValue = false,
  label,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const handleClick = (starIndex: number, isHalf: boolean) => {
    if (readonly || !onChange) return;
    const newValue = isHalf ? starIndex + 0.5 : starIndex + 1;
    onChange(newValue);
  };

  const handleMouseMove = (starIndex: number, isHalf: boolean) => {
    if (readonly) return;
    const newValue = isHalf ? starIndex + 0.5 : starIndex + 1;
    setHoverValue(newValue);
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  const renderStar = (starIndex: number) => {
    const fillPercentage =
      displayValue >= starIndex + 1
        ? 100
        : displayValue > starIndex
        ? (displayValue - starIndex) * 100
        : 0;

    return (
      <div
        key={starIndex}
        className={`relative ${sizeClasses[size]} ${
          readonly ? "cursor-default" : "cursor-pointer"
        }`}
        onMouseLeave={handleMouseLeave}
      >
        {/* Metade esquerda (meio) */}
        <div
          className="absolute left-0 top-0 w-1/2 h-full z-10"
          onClick={() => handleClick(starIndex, true)}
          onMouseMove={() => handleMouseMove(starIndex, true)}
        />
        {/* Metade direita (inteiro) */}
        <div
          className="absolute right-0 top-0 w-1/2 h-full z-10"
          onClick={() => handleClick(starIndex, false)}
          onMouseMove={() => handleMouseMove(starIndex, false)}
        />

        {/* Estrela vazia (fundo) */}
        <svg
          className="absolute top-0 left-0 text-gray-300 dark:text-gray-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>

        {/* Estrela preenchida (com gradiente para meio) */}
        <svg
          className="absolute top-0 left-0 text-yellow-400"
          style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5">
          {[0, 1, 2, 3, 4].map(renderStar)}
        </div>
        {showValue && (
          <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            {displayValue.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}
