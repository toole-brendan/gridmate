import { useState, useEffect, useRef } from 'react';

export interface ButtonStyles {
  backgroundColor: string;
  color: string;
  border: string;
  transition?: string;
  ':hover'?: {
    backgroundColor: string;
  };
}

export interface AcceptRejectButtonStyles {
  acceptAllStyle: ButtonStyles;
  rejectAllStyle: ButtonStyles;
  acceptAllClasses: string;
  rejectAllClasses: string;
  acceptAllAnimationClass: string;
  rejectAllAnimationClass: string;
}

export const useAcceptRejectButtonStyles = (
  aiIsGenerating: boolean,
  hasPendingActions: boolean
): AcceptRejectButtonStyles => {
  const [shouldFillButtons, setShouldFillButtons] = useState(false);
  const [showAttentionAnimation, setShowAttentionAnimation] = useState(false);
  const hasShownAttention = useRef(false);
  
  useEffect(() => {
    // Fill buttons when AI is done and there are pending actions
    const newShouldFill = !aiIsGenerating && hasPendingActions;
    
    // Trigger attention animation when buttons first become filled
    if (newShouldFill && !shouldFillButtons && !hasShownAttention.current) {
      setShowAttentionAnimation(true);
      hasShownAttention.current = true;
      
      // Remove attention animation after it completes
      setTimeout(() => {
        setShowAttentionAnimation(false);
      }, 500);
    }
    
    // Reset the attention flag when conditions change
    if (!newShouldFill) {
      hasShownAttention.current = false;
    }
    
    setShouldFillButtons(newShouldFill);
  }, [aiIsGenerating, hasPendingActions, shouldFillButtons]);
  
  // Common transition for smooth animation
  const transition = 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.3s ease';
  
  // Animation classes
  const acceptAllAnimationClass = shouldFillButtons 
    ? `accept-all-filled ${showAttentionAnimation ? 'button-attention' : ''}`
    : '';
  const rejectAllAnimationClass = shouldFillButtons 
    ? `reject-all-filled ${showAttentionAnimation ? 'button-attention' : ''}`
    : '';
  
  return {
    acceptAllStyle: shouldFillButtons ? {
      backgroundColor: '#10b981', // green-500
      color: 'white',
      border: '1px solid #10b981',
      transition,
      ':hover': {
        backgroundColor: '#059669' // green-600
      }
    } : {
      backgroundColor: 'transparent',
      color: '#10b981',
      border: '1px solid #10b981',
      transition,
      ':hover': {
        backgroundColor: 'rgba(16, 185, 129, 0.1)' // green-500 with 10% opacity
      }
    },
    rejectAllStyle: shouldFillButtons ? {
      backgroundColor: '#ef4444', // red-500
      color: 'white',
      border: '1px solid #ef4444',
      transition,
      ':hover': {
        backgroundColor: '#dc2626' // red-600
      }
    } : {
      backgroundColor: 'transparent',
      color: '#ef4444',
      border: '1px solid #ef4444',
      transition,
      ':hover': {
        backgroundColor: 'rgba(239, 68, 68, 0.1)' // red-500 with 10% opacity
      }
    },
    // Tailwind classes for components using className
    acceptAllClasses: shouldFillButtons
      ? 'bg-green-500 text-white border-green-500 hover:bg-green-600 transition-all duration-300'
      : 'bg-transparent text-green-500 border-green-500 hover:bg-green-500/10 transition-all duration-300',
    rejectAllClasses: shouldFillButtons
      ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 transition-all duration-300'
      : 'bg-transparent text-red-500 border-red-500 hover:bg-red-500/10 transition-all duration-300',
    acceptAllAnimationClass,
    rejectAllAnimationClass
  };
};