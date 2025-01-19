import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css'; // Import the CSS file from the index folder
import './App.css'; // Include the styles from your CSS
import Profile from './components/Profile';

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
  category: 'study' | 'hangout' | 'event';
  user: string;
  timestamp: Timestamp;
  images?: string[]; // Array of image URLs
  audioNote?: string; // URL to audio file
  participants?: string[]; // Array of tagged friends
  location: string; // Specific building/location name
  isPublic: boolean; // Whether memory is public or private
  imageUrl?: string | null; // Add this line
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
          .setHTML(`
            <div class="memory-popup">
              <h3>${memory.title}</h3>
              <p>${memory.description}</p>
              ${memory.imageUrl ? `<img src="${memory.imageUrl}" alt="Memory" style="max-width: 200px; margin-top: 10px;">` : ''}
              <span class="category-tag">${memory.category}</span>
              <span class="author">By ${memory.user || 'Anonymous'}</span>
              <span class="date">${memory.timestamp?.toDate().toLocaleDateString()}</span>
            </div>
          `);

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

  const saveMemory = async ({
    lat, lng, title, description, category, image }: SaveMemoryParams): Promise<void> => {
    console.log('Starting memory save with image:', image);

    try {
      let imageUrl = null;
      
      // Convert image to base64 if one was selected
      if (image) {
        const reader = new FileReader();
        imageUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(image);
        });
      }

      // Create memory object
      const memoryData = {
        title,
        description,
        lat,
        lng,
        category,
        user: localStorage.getItem('userName') || 'Anonymous',
        timestamp: Timestamp.now(),
        imageUrl, // This will now be the base64 string
        location: 'Custom Location',
        isPublic: true
      };

      console.log('Saving memory data:', memoryData);

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'memories'), memoryData);
      console.log('Memory saved with ID:', docRef.id);

      return;
    } catch (error) {
      console.error('Error in saveMemory:', error);
      throw error;
    }
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
              <h1>Campus Chronicles</h1>
              <div className="controls">
                <select onChange={handleFilterChange}>
                  <option value="">All Memories</option>
                  <option value="study">Study</option>
                  <option value="hangout">Hangout</option>
                  <option value="event">Event</option>
                </select>
                <button 
                  className={`add-memory-btn ${isAddingMemory ? 'active' : ''}`}
                  onClick={() => setIsAddingMemory(!isAddingMemory)}
                >
                  {isAddingMemory ? 'Cancel' : 'Add Memory'}
                </button>
                <button 
                  className="profile-btn"
                  onClick={() => setShowProfile(true)}
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
