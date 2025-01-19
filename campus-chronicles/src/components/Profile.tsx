import React, { useState } from 'react';
import { Memory } from '../App.tsx'; // Assuming Memory interface is defined in App.tsx
import './Profile.css'; // Add this import

interface ProfileProps {
  userName: string;
  memories: Memory[];
  userGroups?: string[];
  onBack: () => void;
}

interface MemoryModalProps {
  memory: Memory;
  onClose: () => void;
}

const Profile: React.FC<ProfileProps> = ({ userName, memories, userGroups, onBack }) => {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  const suggestedGroups = [
    { name: 'Hackathons', description: 'Tech events and competitions' },
    { name: 'Work', description: 'Campus jobs and work experiences' },
    { name: 'Clubs', description: 'Student organizations and activities' },
    { name: 'Sports', description: 'Athletic events and activities' },
    { name: 'Research', description: 'Academic research experiences' },
    { name: 'Food', description: 'Campus dining experiences' }
  ];

  const MemoryModal: React.FC<MemoryModalProps> = ({ memory, onClose }) => (
    <div className="memory-modal-overlay" onClick={onClose}>
      <div className="memory-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        {memory.imageUrl && (
          <img 
            src={memory.imageUrl} 
            alt={memory.title}
            className="modal-image"
          />
        )}
        <div className="modal-info">
          <h2>{memory.title}</h2>
          <p>{memory.description}</p>
          <div className="modal-metadata">
            <span className="memory-category">{memory.category}</span>
            <span className="memory-date">
              {memory.timestamp?.toDate().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="profile-container">
      <button 
        className="back-to-map"
        onClick={onBack}
      >
        Back to Map
      </button>
      <div className="profile-header">
        <div className="profile-avatar">
          {/* Placeholder avatar */}
          <div className="avatar-circle">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
        <h1>{userName}'s Campus Chronicles</h1>
      </div>

      <div className="memories-section">
        <h2>Memories</h2>
        <div className="memories-grid">
          {memories.map((memory, index) => (
            <div 
              key={memory.id || index} 
              className="memory-card"
              onClick={() => setSelectedMemory(memory)}
              style={{ cursor: 'pointer' }}
            >
              {memory.imageUrl ? (
                <img 
                  src={memory.imageUrl} 
                  alt={memory.title}
                  style={{ 
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div className="memory-placeholder">
                  <span className="memory-category">{memory.category}</span>
                </div>
              )}
              <div className="memory-info">
                <h3>{memory.title}</h3>
                <p>{memory.description}</p>
                <span className="memory-date">
                  {memory.timestamp?.toDate().toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedMemory && (
        <MemoryModal 
          memory={selectedMemory} 
          onClose={() => setSelectedMemory(null)} 
        />
      )}

      <div className="groups-section">
        <h2>Suggested Groups</h2>
        <div className="groups-grid">
          {suggestedGroups.map((group, index) => (
            <div key={index} className="group-card">
              <h3>{group.name}</h3>
              <p>{group.description}</p>
              <button className="join-group-btn">Join Group</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile; 