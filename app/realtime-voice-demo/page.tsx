'use client'

import React from 'react';
import { RealtimeVoiceChat } from '@/components/RealtimeVoiceChat';

const RealtimeVoiceDemoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <RealtimeVoiceChat />
    </div>
  );
};

export default RealtimeVoiceDemoPage;