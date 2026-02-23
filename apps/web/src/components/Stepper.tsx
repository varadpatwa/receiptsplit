import React from 'react';

interface StepperProps {
  currentStep: 'receipt' | 'people' | 'assign' | 'summary' | 'export';
}

const steps = [
  { id: 'receipt', label: 'Receipt' },
  { id: 'people', label: 'People' },
  { id: 'assign', label: 'Assign' },
  { id: 'summary', label: 'Summary' },
  { id: 'export', label: 'Export' }
];

export const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  index <= currentIndex
                    ? 'bg-white text-black'
                    : 'border border-white/20 text-white/40'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  index === currentIndex ? 'text-white' : 'text-white/60'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mb-6 h-[2px] flex-1 transition-colors ${
                  index < currentIndex ? 'bg-white' : 'bg-white/10'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
