'use client'

import React from 'react';
import { VoiceChat } from '@/components/VoiceChat';

const VoiceDemoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <VoiceChat />
    </div>
  );
};

export default VoiceDemoPage;