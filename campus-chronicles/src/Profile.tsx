import React, { useState, useMemo, useEffect } from 'react';
import { Memory } from './App.tsx'; // Assuming Memory interface is defined in App.tsx
import './Profile.css'; // Add this import
import { useUser, useClerk, SignedIn, RedirectToSignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

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

const Profile: React.FC<ProfileProps> = ({ userName, memories = [], onBack }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [suggestedMemories, setSuggestedMemories] = useState<Memory[]>([]);

  console.log('Profile rendering with:', {
    userName,
    memoriesLength: memories.length,
    user: user,
  });

  // Add safety check
  if (!user) {
    console.log('No user found, showing loading state');
    return (
      <div className="profile-page">
        <div className="profile-container">
          <button className="back-to-map" onClick={() => navigate('/app')}>Back to Map</button>
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  // Get the 3 most recent memories from the current user
  const recentMemories = useMemo(() => {
    if (!user?.primaryEmailAddress?.emailAddress) return [];
    
    return [...memories]
      .filter(memory => memory.user.email === user.primaryEmailAddress?.emailAddress)
      .sort((a, b) => {
        const timeA = a.timestamp?.toDate().getTime() || 0;
        const timeB = b.timestamp?.toDate().getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, 3);
  }, [memories, user]);

  // Get other users' memories for suggestions
  useEffect(() => {
    const fetchSuggestedMemories = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) return;

      const otherUsersMemories = memories.filter(
        memory => memory.user.email !== user.primaryEmailAddress?.emailAddress
      );

      const selectedMemories: Memory[] = [];
      const usedEmails = new Set<string>();

      while (selectedMemories.length < 3 && otherUsersMemories.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherUsersMemories.length);
        const memory = otherUsersMemories[randomIndex];
        
        if (!usedEmails.has(memory.user.email || '')) {
          selectedMemories.push(memory);
          usedEmails.add(memory.user.email || '');
          otherUsersMemories.splice(randomIndex, 1);
        }
      }

      setSuggestedMemories(selectedMemories);
    };

    fetchSuggestedMemories();
  }, [memories, user]);

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
    <SignedIn>
      <div className="profile-page">
        <div className="profile-container">
          <button 
            className="back-to-map"
            onClick={() => navigate('/app')}
          >
            Back to Map
          </button>

          <button 
            className="sign-out-btn"
            onClick={() => signOut()}
          >
            Sign Out
          </button>

          <div className="profile-header">
            <div className="profile-avatar">
              {user?.imageUrl ? (
                <div className="avatar-circle">
                  <img 
                    src={user.imageUrl} 
                    alt={`${userName}'s profile`}
                    className="avatar-image"
                  />
                </div>
              ) : (
                <div className="avatar-circle">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {user && <p className="user-email">{user.primaryEmailAddress?.emailAddress}</p>}
          </div>

          <div className="content-wrapper">
            <div className="memories-section">
              <h2>Your Recent Memories</h2>
              <div className="memories-grid">
                {recentMemories.map((memory, index) => (
                  <div 
                    key={memory.id || index} 
                    className="memory-card"
                    onClick={() => setSelectedMemory(memory)}
                  >
                    {memory.imageUrl ? (
                      <img 
                        src={memory.imageUrl} 
                        alt={memory.title}
                        className="memory-image"
                      />
                    ) : (
                      <div className="memory-placeholder">
                        <span className="memory-category">{memory.category}</span>
                      </div>
                    )}
                    <div className="memory-info">
                      <h3>{memory.title}</h3>
                      <p>{memory.description}</p>
                      <div className="memory-metadata">
                        <span className="memory-date">
                          {memory.timestamp?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="memories-section">
              <h2>Suggested Posts</h2>
              <div className="memories-grid">
                {suggestedMemories.map((memory, index) => (
                  <div 
                    key={memory.id || index} 
                    className="memory-card"
                    onClick={() => setSelectedMemory(memory)}
                  >
                    {memory.imageUrl ? (
                      <img 
                        src={memory.imageUrl} 
                        alt={memory.title}
                        className="memory-image"
                      />
                    ) : (
                      <div className="memory-placeholder">
                        <span className="memory-category">{memory.category}</span>
                      </div>
                    )}
                    <div className="memory-info">
                      <h3>{memory.title}</h3>
                      <p>{memory.description}</p>
                      <div className="memory-metadata">
                        <div className="memory-author">
                          <span className="author-email">{memory.user.email}</span>
                        </div>
                        <span className="memory-date">
                          {memory.timestamp?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedMemory && (
            <MemoryModal 
              memory={selectedMemory} 
              onClose={() => setSelectedMemory(null)} 
            />
          )}
        </div>
      </div>
    </SignedIn>
  );
};

export default Profile; 