import React from "react";
import { Check } from "lucide-react";

export interface StepItem {
  id: string | number;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number; // 0-indexed
  onStepClick?: (index: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = ""
}) => {
  return (
    <nav aria-label="Folyamat lépései" className={`w-full ${className}`}>
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isClickable = onStepClick && isCompleted;

          return (
            <li
              key={step.id}
              className={`relative flex items-center ${
                idx !== steps.length - 1 ? "flex-1" : ""
              }`}
            >
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick(idx)}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-12 font-semibold transition-all duration-200 ${
                    isCompleted
                      ? "bg-brand text-white shadow-sm"
                      : isActive
                      ? "bg-bg-elevated border-2 border-brand text-brand shadow-sm"
                      : "bg-bg-surface border border-border-hairline text-text-tertiary"
                  } ${isClickable ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </button>

                <span
                  className={`mt-2 text-12 font-medium truncate max-w-[80px] text-center ${
                    isActive
                      ? "text-text-primary font-semibold"
                      : isCompleted
                      ? "text-text-secondary"
                      : "text-text-tertiary"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting Line */}
              {idx !== steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 -mt-5 transition-colors duration-200 ${
                    idx < currentStep ? "bg-brand" : "bg-border-hairline"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
