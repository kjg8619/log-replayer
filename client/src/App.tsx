import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useTimelineStore } from './stores/timelineStore';
import { UploadZone } from './components/UploadZone';
import { Timeline } from './components/Timeline';
import { ControlBar } from './components/ControlBar';
import { StateSnapshot } from './components/StateSnapshot';
import { EventDetail } from './components/EventDetail';

function AppContent() {
  const { session, currentStep } = useTimelineStore();
  
  if (!session) {
    return (
      <div className="app-container full-width">
        <div className="upload-container">
          <h1>Log Replayer</h1>
          <p className="app-description">
            Upload your log files to replay and analyze events step by step
          </p>
          <UploadZone />
        </div>
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <div className="timeline-panel">
        <Timeline />
      </div>
      
      <div className="snapshot-panel">
        <StateSnapshot 
          sessionId={session.id} 
          sequence={currentStep} 
        />
      </div>
      
      <div className="detail-panel">
        <EventDetail />
      </div>
      
      <div className="control-bar-wrapper">
        <ControlBar />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
