import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css'; // Import the CSS file from the index folder
import './App.css'; // Include the styles from your CSS
import Profile from './Profile';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

// Your existing Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCfXEUFBvHSLpPfrY1Z5E_zZqI0FStFpls",
  authDomain: "campus-chronicles-f92a0.firebaseapp.com",
  projectId: "campus-chronicles-f92a0",
  storageBucket: "campus-chronicles-f92a0.firebasestorage.app",
  messagingSenderId: "534807817345",
  appId: "1:534807817345:web:85d07dc4cf1eacc256b180",
  measurementId: "G-R50PMVE7P8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

export interface Memory {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: 'study' | 'hangout' | 'event' | 'hackathon' | 'work' | 'friends' | 'food' | 'sports' | 'club' | 'research';
  user: {
    id: string;
    name: string;
    imageUrl?: string;
    email?: string;
  };
  timestamp: Timestamp;
  images?: string[];
  imageUrl: string | null;
  location: string;
  isPublic: boolean;
}

interface SaveMemoryParams {
  lat: number;
  lng: number;
  title: string;
  description: string;
  category: Memory['category'];
  image?: File;
}

mapboxgl.accessToken = 'pk.eyJ1Ijoic2hhaG1lZXI2LSIsImEiOiJjbTYyamhjN3MxMXp2MnFwdXZuYTRzM2F5In0.v4biqJhea9j7EmwSufszjA';

const App = () => {
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<Memory['category'] | ''>();
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [memoryForm, setMemoryForm] = useState({
    title: '',
    description: '',
    category: 'study' as Memory['category'],
    image: null as File | null,
    imagePreview: '' as string
  });
  const [showProfile, setShowProfile] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const initMap = () => {
      const mapInstance = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-79.3957, 43.6629],
        zoom: 15.5,
        pitch: 45,
        bearing: -17.6,
        antialias: true
      });

      mapInstance.on('click', (e) => {
        if (isAddingMemory) {
          setSelectedLocation([e.lngLat.lng, e.lngLat.lat]);
        }
      });

      mapInstance.on('load', () => {
        // Add 3D buildings
        mapInstance.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': '#EBEBEB',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.8,
            'fill-extrusion-vertical-gradient': true
          }
        });

        // Add light
        mapInstance.setLight({
          anchor: 'viewport',
          color: '#ffffff',
          intensity: 0.55,
          position: [1.5, 90, 80]
        });

        loadMemories(mapInstance);
      });

      mapInstance.addControl(new mapboxgl.NavigationControl());

      setMap(mapInstance);
    };

    if (!showProfile) {
      initMap();
    }
  }, [isAddingMemory, showProfile]);

  const handleMemorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      alert('Please select a location on the map');
      return;
    }

    console.log('Form submission started');
    console.log('Memory form state:', memoryForm);
    console.log('Image file:', memoryForm.image);

    const submitButton = (e.target as HTMLFormElement).querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Saving...';
    }

    try {
      const [lng, lat] = selectedLocation;
      
      if (memoryForm.image) {
        console.log('Image selected:', {
          name: memoryForm.image.name,
          size: memoryForm.image.size,
          type: memoryForm.image.type
        });
      }

      await saveMemory({
        lat,
        lng,
        title: memoryForm.title,
        description: memoryForm.description,
        category: memoryForm.category,
        image: memoryForm.image || undefined
      });

      // Reset form
      setMemoryForm({ 
        title: '', 
        description: '', 
        category: 'study',
        image: null,
        imagePreview: ''
      });
      setSelectedLocation(null);
      setIsAddingMemory(false);
      
      await loadMemories();
      alert('Memory saved successfully!');
    } catch (error) {
      console.error('Error in form submission:', error);
      alert('Failed to save memory: ' + (error as Error).message);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Memory';
      }
    }
  };

  const openMemoryForm = () => {
    return (
      <div className="memory-form">
        <div className="form-header">
          <h2 className="">Add a Memory</h2>
          <button 
            className="close-btn"
            onClick={() => {
              setSelectedLocation(null);
              setIsAddingMemory(false);
            }}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleMemorySubmit}>
          <input
            type="text"
            placeholder="Title"
            value={memoryForm.title}
            onChange={(e) => setMemoryForm(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          <textarea
            placeholder="Describe your memory..."
            value={memoryForm.description}
            onChange={(e) => setMemoryForm(prev => ({ ...prev, description: e.target.value }))}
            required
          />
          <select
            value={memoryForm.category}
            onChange={(e) => setMemoryForm(prev => ({ 
              ...prev, 
              category: e.target.value as Memory['category'] 
            }))}
          >
            <option value="study">Study</option>
            <option value="hangout">Hangout</option>
            <option value="event">Event</option>
            <option value="hackathon">Hackathon</option>
            <option value="work">Work</option>
            <option value="friends">Friends</option>
            <option value="food">Food</option>
            <option value="sports">Sports</option>
            <option value="club">Club</option>
            <option value="research">Research</option>
          </select>
          <div className="form-group">
            <label htmlFor="image">Upload Image (optional)</label>
            {memoryForm.imagePreview && (
              <div className="image-preview">
                <img 
                  src={memoryForm.imagePreview} 
                  alt="Preview" 
                  style={{ maxWidth: '100%', maxHeight: '200px', marginBottom: '10px' }}
                />
              </div>
            )}
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Create preview URL
                  const previewUrl = URL.createObjectURL(file);
                  setMemoryForm(prev => ({ 
                    ...prev, 
                    image: file,
                    imagePreview: previewUrl
                  }));
                }
              }}
            />
            {memoryForm.image && (
              <div className="selected-file">
                Selected: {memoryForm.image.name}
              </div>
            )}
          </div>
          <button type="submit" className="save-memory-btn">Save Memory</button>
        </form>
      </div>
    );
  };

  const loadMemories = async (mapInstance?: mapboxgl.Map): Promise<void> => {
    try {
      const snapshot = await getDocs(collection(db, 'memories'));
      const loadedMemories = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Memory));
      setMemories(loadedMemories);

      const currentMap = mapInstance || map;
      if (!currentMap) return;

      // Clear existing markers
      document.querySelectorAll('.mapboxgl-marker').forEach(marker => marker.remove());

      // Add markers to the map
      loadedMemories.forEach(memory => {
        const el = document.createElement('div');
        el.className = `custom-marker marker-${memory.category}`;

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(createPopupContent(memory));

        // Add marker to map
        new mapboxgl.Marker(el)
          .setLngLat([memory.lng, memory.lat])
          .setPopup(popup)
          .addTo(currentMap);
      });
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress and convert to base64
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const saveMemory = async ({
    lat, lng, title, description, category, image
  }: SaveMemoryParams): Promise<void> => {
    try {
      if (!user) {
        throw new Error('User must be logged in to save memories');
      }

      let imageUrl: string | null = null;
      
      if (image) {
        try {
          const compressedImage = await compressImage(image);
          imageUrl = compressedImage;
          console.log('Image compressed and converted successfully');
        } catch (error) {
          console.error('Error processing image:', error);
          throw new Error('Failed to process image');
        }
      }

      const userEmail = user.primaryEmailAddress?.emailAddress;
      if (!userEmail) {
        throw new Error('User email not found');
      }

      const memoryData = {
        title,
        description,
        lat,
        lng,
        category,
        user: {
          id: user.id,
          name: user.fullName || 'Unknown',
          email: userEmail,
          imageUrl: user.imageUrl
        },
        timestamp: Timestamp.now(),
        imageUrl: imageUrl, // This will now be the base64 string
        location: 'Custom Location',
        isPublic: true,
        userEmail: userEmail
      };

      // Log the memory data before saving (without the full image string for clarity)
      console.log('Saving memory data:', {
        ...memoryData,
        imageUrl: imageUrl ? 'base64_string_present' : null
      });

      await addDoc(collection(db, 'memories'), memoryData);
      
      // Refresh memories after saving
      await loadMemories();
      
    } catch (error) {
      console.error('Error in saveMemory:', error);
      throw error;
    }
  };

  const createPopupContent = (memory: Memory) => {
    return `
      <div class="memory-popup">
        <h3>${memory.title}</h3>
        <p>${memory.description}</p>
        ${memory.imageUrl ? `<img src="${memory.imageUrl}" alt="${memory.title}" style="max-width: 100%; margin: 10px 0;">` : ''}
        <span class="category-tag">${memory.category}</span>
        <span class="date">${memory.timestamp.toDate().toLocaleDateString()}</span>
        <span class="author">By: ${memory.user.email || 'Anonymous'}</span>
      </div>
    `;
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setCategoryFilter(e.target.value as Memory['category'] | '');
    loadMemories();
  };

  const saveUserProfile = (name: string): void => {
    localStorage.setItem('userName', name);
    alert(`Profile saved for ${name}`);
  };

  return (
    <div className="app-container">
      {showProfile ? (
        <Profile 
          userName={localStorage.getItem('userName') || 'User'}
          memories={memories}
          onBack={() => setShowProfile(false)}
        />
      ) : (
        <>
          <div className="map-overlay">
            <div className="header">
              <h1 className="title-gradient font-inter">Campus Chronicles</h1>
              <div className="controls">
                <select onChange={handleFilterChange}>
                  <option value="">All Memories</option>
                  <option value="study">Study</option>
                  <option value="hangout">Hangout</option>
                  <option value="event">Event</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="work">Work</option>
                  <option value="friends">Friends</option>
                  <option value="food">Food</option>
                  <option value="sports">Sports</option>
                  <option value="club">Club</option>
                  <option value="research">Research</option>
                </select>
                <button 
                  className={`add-memory-btn ${isAddingMemory ? 'active' : ''}`}
                  onClick={() => setIsAddingMemory(!isAddingMemory)}
                >
                  {isAddingMemory ? 'Cancel' : 'Add Memory'}
                </button>
                <button 
                  className="profile-btn"
                  onClick={() => navigate('/profile')}
                >
                  Profile
                </button>
              </div>
            </div>
          </div>
          
          <div id="map" className="map-container"></div>
          
          {selectedLocation && isAddingMemory && (
            <div className="memory-form">
              <div className="form-header">
                <h2>Add a Memory</h2>
                <button 
                  className="close-btn"
                  onClick={() => {
                    setSelectedLocation(null);
                    setIsAddingMemory(false);
                  }}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleMemorySubmit}>
                <input
                  type="text"
                  placeholder="Title"
                  value={memoryForm.title}
                  onChange={(e) => setMemoryForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
                <textarea
                  placeholder="Describe your memory..."
                  value={memoryForm.description}
                  onChange={(e) => setMemoryForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
                <select
                  value={memoryForm.category}
                  onChange={(e) => setMemoryForm(prev => ({ 
                    ...prev, 
                    category: e.target.value as Memory['category'] 
                  }))}
                >
                  <option value="study">Study</option>
                  <option value="hangout">Hangout</option>
                  <option value="event">Event</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="work">Work</option>
                  <option value="friends">Friends</option>
                  <option value="food">Food</option>
                  <option value="sports">Sports</option>
                  <option value="club">Club</option>
                  <option value="research">Research</option>
                </select>
                <div className="form-group">
                  <label htmlFor="image">Upload Image (optional)</label>
                  {memoryForm.imagePreview && (
                    <div className="image-preview">
                      <img 
                        src={memoryForm.imagePreview} 
                        alt="Preview" 
                        style={{ maxWidth: '100%', maxHeight: '200px', marginBottom: '10px' }}
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        setMemoryForm(prev => ({ 
                          ...prev, 
                          image: file,
                          imagePreview: previewUrl
                        }));
                      }
                    }}
                  />
                  {memoryForm.image && (
                    <div className="selected-file">
                      Selected: {memoryForm.image.name}
                    </div>
                  )}
                </div>
                <button type="submit" className="save-memory-btn">Save Memory</button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;
