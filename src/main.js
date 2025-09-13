import './style.css'
import { getRecordings } from './api.js'

let currentAudio = null;
let currentButton = null;

function formatName(name) {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function createCard(recording) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.audio = recording.audio.split('/').pop();

  // Store background image if available
  if (recording.backgroundImage) {
    card.dataset.backgroundImage = recording.backgroundImage;
  }

  // Add timestamp to image URL to prevent caching
  const timestamp = Date.now();
  const imageUrl = `${recording.image}?t=${timestamp}`;

  card.innerHTML = `
    <div class="card-shine"></div>
    <img src="${imageUrl}" alt="${formatName(recording.name)}">
    <button class="play-button" aria-label="Play">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="rgba(0, 0, 0, 0.5)"/>
        <path d="M15 12L28 20L15 28V12Z" fill="white"/>
      </svg>
    </button>
    <div class="location">${formatName(recording.name)}</div>
  `;

  return card;
}

async function loadRecordings() {
  try {
    const recordings = await getRecordings();
    const grid = document.getElementById('recordings-grid');

    recordings.forEach(recording => {
      const card = createCard(recording);
      grid.appendChild(card);
    });

    initializeAudioPlayers();
  } catch (error) {
    console.error('Failed to load recordings:', error);
  }
}

function initializeAudioPlayers() {
  const cards = document.querySelectorAll('.card');

  cards.forEach(card => {
    const playButton = card.querySelector('.play-button');
    const audioFile = card.dataset.audio;
    const audio = new Audio(`/recordings/${audioFile}`);
    audio.loop = true;
    audio.preload = 'metadata';

    audio.addEventListener('loadedmetadata', () => {
      console.log(`Audio loaded: ${audioFile}, duration: ${audio.duration}s`);
    });

    audio.addEventListener('canplay', () => {
      console.log(`Audio ready to play: ${audioFile}`);
    });

    audio.addEventListener('error', (e) => {
      console.error(`Audio error for ${audioFile}:`, e);
      if (audio.error) {
        console.error('Error code:', audio.error.code, 'Message:', audio.error.message);
      }
    });

    playButton.addEventListener('click', (e) => {
      e.stopPropagation();

      if (currentAudio && currentAudio !== audio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        if (currentButton) {
          currentButton.classList.remove('playing');
          const pausePath = currentButton.querySelector('svg path');
          pausePath.setAttribute('d', 'M15 12L28 20L15 28V12Z');
        }
      }

      if (audio.paused) {
        audio.play().then(() => {
          console.log(`Playing: ${audioFile}`);
          playButton.classList.add('playing');
          const playPath = playButton.querySelector('svg path');
          playPath.setAttribute('d', 'M13 12H16V28H13V12Z M24 12H27V28H24V12Z');
          currentAudio = audio;
          currentButton = playButton;

          // Handle dimming and background
          handlePlaybackVisuals(card, true);
        }).catch(err => {
          console.error(`Failed to play ${audioFile}:`, err);
        });
      } else {
        audio.pause();
        audio.currentTime = 0;
        playButton.classList.remove('playing');
        const pausePath = playButton.querySelector('svg path');
        pausePath.setAttribute('d', 'M15 12L28 20L15 28V12Z');
        currentAudio = null;
        currentButton = null;

        // Reset visuals
        handlePlaybackVisuals(null, false);
      }
    });

    card.addEventListener('click', () => {
      playButton.click();
    });

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;

      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;

      const shine = card.querySelector('.card-shine');
      const gradient = `radial-gradient(circle at ${xPercent}% ${yPercent}%,
        rgba(255, 255, 255, 0.5) 0%,
        rgba(255, 255, 255, 0.3) 20%,
        rgba(255, 255, 255, 0.1) 40%,
        transparent 70%)`;

      shine.style.background = gradient;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      const shine = card.querySelector('.card-shine');
      shine.style.background = '';
    });
  });
}

let currentBgLayer = 1;
let currentBgImage = null;

function handlePlaybackVisuals(activeCard, isPlaying) {
  const allCards = document.querySelectorAll('.card');
  const body = document.body;

  if (isPlaying && activeCard) {
    // Add playing class to body
    body.classList.add('playing');

    // Handle background image with crossfade
    const bgImage = activeCard.dataset.backgroundImage;
    console.log('Background image:', bgImage, 'Current:', currentBgImage);
    if (bgImage && bgImage !== currentBgImage) {
      // Crossfade between background layers
      const activeLayer = document.getElementById(`bg-layer-${currentBgLayer}`);
      const inactiveLayer = document.getElementById(`bg-layer-${currentBgLayer === 1 ? 2 : 1}`);

      console.log('Setting background on inactive layer:', inactiveLayer.id, bgImage);

      // Set the new image on the inactive layer
      inactiveLayer.style.backgroundImage = `url('${bgImage}')`;

      console.log('Background set. Computed style:', window.getComputedStyle(inactiveLayer).backgroundImage);

      // Fade in the new layer and fade out the old one
      setTimeout(() => {
        inactiveLayer.classList.add('active');
        activeLayer.classList.remove('active');
        console.log('Active classes toggled. Active layer:', inactiveLayer.id);
      }, 50);

      // Switch the current layer for next time
      currentBgLayer = currentBgLayer === 1 ? 2 : 1;
      currentBgImage = bgImage;
    } else if (bgImage && !currentBgImage) {
      // First time showing a background
      const layer = document.getElementById(`bg-layer-${currentBgLayer}`);
      layer.style.backgroundImage = `url('${bgImage}')`;
      layer.classList.add('active');
      currentBgImage = bgImage;
    }

    // Dim other cards
    allCards.forEach(card => {
      if (card === activeCard) {
        card.classList.add('playing');
        card.classList.remove('dimmed');
      } else {
        card.classList.add('dimmed');
        card.classList.remove('playing');
      }
    });
  } else {
    // Remove playing class from body
    body.classList.remove('playing');

    // Fade out all background layers
    document.getElementById('bg-layer-1').classList.remove('active');
    document.getElementById('bg-layer-2').classList.remove('active');
    currentBgImage = null;

    // Reset all cards
    allCards.forEach(card => {
      card.classList.remove('dimmed', 'playing');
    });
  }
}

document.addEventListener('DOMContentLoaded', loadRecordings);
