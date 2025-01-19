import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/analytics';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'; // Include the styles from your CSS

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCfXEUFBvHSLpPfrY1Z5E_zZqI0FStFpls",
  authDomain: "campus-chronicles-f92a0.firebaseapp.com",
  projectId: "campus-chronicles-f92a0",
  storageBucket: "campus-chronicles-f92a0.firebaseapp.com",
  messagingSenderId: "534807817345",
  appId: "1:534807817345:web:85d07dc4cf1eacc256b180",
  measurementId: "G-R50PMVE7P8"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

interface Memory {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: 'study' | 'hangout' | 'event';
  user: string;
  timestamp: firebase.firestore.Timestamp;
  images?: string[]; // Array of image URLs
  audioNote?: string; // URL to audio file
  participants?: string[]; // Array of tagged friends
  location: string; // Specific building/location name
  isPublic: boolean; // Whether memory is public or private
}

interface SaveMemoryParams {
  lat: number;
  lng: number;
  title: string;
  description: string;
  category: Memory['category'];
}

const db = firebase.firestore();

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
    category: 'study' as Memory['category']
  });

  useEffect(() => {
    const initMap = () => {
      const mapInstance = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-79.3957, 43.6629], // Centered on UofT St. George campus
        zoom: 15.5,
        pitch: 45,
        bearing: -17.6,
        antialias: true
      });

      // Add click handler for adding new memories
      mapInstance.on('click', (e) => {
        if (!isAddingMemory) return;
        setSelectedLocation([e.lngLat.lng, e.lngLat.lat]);
        openMemoryForm();
      });

      mapInstance.on('load', () => {
        mapInstance.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': '#aaa',
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
            'fill-extrusion-opacity': 0.6
          }
        });

        loadMemories(mapInstance);
      });

      mapInstance.addControl(new mapboxgl.NavigationControl());

      setMap(mapInstance);
    };

    initMap();
  }, [isAddingMemory]);

  const handleMemorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) return;

    try {
      const [lng, lat] = selectedLocation;
      await saveMemory({
        lat,
        lng,
        title: memoryForm.title,
        description: memoryForm.description,
        category: memoryForm.category
      });
      
      // Reset form and state
      setMemoryForm({ title: '', description: '', category: 'study' });
      setSelectedLocation(null);
      setIsAddingMemory(false);
      
      // Reload memories to show new marker
      await loadMemories();
    } catch (error) {
      console.error('Error saving memory:', error);
      alert('Failed to save memory');
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
          <button type="submit" className="save-memory-btn">Save Memory</button>
        </form>
      </div>
    );
  };

  const loadMemories = async (mapInstance?: mapboxgl.Map): Promise<void> => {
    try {
      const snapshot = await db.collection('memories').get();
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
    lat, lng, title, description, category }: SaveMemoryParams): Promise<void> => {
    try {
      await db.collection('memories').add({
        title,
        description,
        lat,
        lng,
        category,
        user: localStorage.getItem('userName') || 'Anonymous',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
      alert('Memory saved successfully!');
      loadMemories();
    } catch (error) {
      console.error('Error saving memory:', error);
      alert('Error saving memory: ' + (error as Error).message);
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
          </div>
        </div>
      </div>
      
      <div id="map" className="map-container"></div>
      
      {selectedLocation && isAddingMemory && openMemoryForm()}
    </div>
  );
};

export default App;
