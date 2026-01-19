import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let userData = null;

// Load user data from Firestore
async function loadUserData(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      userData = data;
      
      document.getElementById('userEmail').textContent = data.email;
      document.getElementById('careBalance').textContent = (data.careBalance || 0).toLocaleString();
      
      // Update dragon status
      if (data.eggStatus === 'hatched') {
        document.getElementById('dragonStatus').textContent = `Dragon: ${data.dragonName || 'Unnamed Dragon'}`;
      } else if (data.eggStatus === 'incubating') {
        document.getElementById('dragonStatus').textContent = `Egg Incubating (${data.eggSessionsRemaining || 10} sessions)`;
      }
      
      console.log('User loaded:', data.email);
    }
  } catch (error) {
    console.error('Error loading user:', error);
  }
}

// Load campaigns
async function loadCampaigns() {
  try {
    const campaignsRef = collection(db, 'campaigns');
    const q = query(campaignsRef, where('userId', '==', currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    const campaignsGrid = document.getElementById('campaignsGrid');
    const noCampaigns = document.getElementById('noCampaigns');
    
    document.getElementById('campaignsLoading').classList.add('hidden');
    
    document.getElementById('campaignCount').textContent = querySnapshot.size;
    
    if (querySnapshot.empty) {
      noCampaigns.classList.remove('hidden');
      return;
    }
    
    campaignsGrid.classList.remove('hidden');
    campaignsGrid.innerHTML = '';
    
    querySnapshot.forEach((doc) => {
      const campaign = doc.data();
      const card = createCampaignCard(doc.id, campaign);
      campaignsGrid.appendChild(card);
    });
    
  } catch (error) {
    console.error('Error loading campaigns:', error);
  }
}

// Create campaign card
function createCampaignCard(id, campaign) {
  const card = document.createElement('a');
  card.href = 'campaign.html?id=' + id;
  card.className = 'card-document';
  
  const iconMap = {
    'Fantasy': '[Fantasy]',
    'Sci-Fi': '[Sci-Fi]',
    'Cyberpunk': '[Cyber]',
    'Horror': '[Horror]',
    'Cozy': '[Cozy]',
    'Custom': '[Custom]'
  };

  const icon = iconMap[campaign.system] || '[Game]';
  
  card.innerHTML = `
    <div class="flex justify-between items-start mb-4">
      <div>
        <div class="text-4xl mb-2">${icon}</div>
        <h3 class="text-xl font-bold">${campaign.name}</h3>
        <p class="text-sm text-gray-600">${campaign.system}</p>
      </div>
      <div class="text-right">
        <p class="text-sm text-gray-600">CARE Earned</p>
        <p class="text-2xl font-bold text-emerald-600">${campaign.careEarned || 0}</p>
      </div>
    </div>
    ${campaign.description ? `<p class="text-sm text-gray-700 mb-3">${campaign.description}</p>` : ''}
    <div class="flex justify-between text-xs text-gray-500">
      <span>View Campaign</span>
      <span>→</span>
    </div>
  `;
  
  return card;
}

// Check if logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadUserData(user.uid);
    loadCampaigns();
  } else {
    window.location.href = 'auth.html';
  }
});

// Logout button
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = 'auth.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
});

// Create Campaign Modal
const createBtn = document.getElementById('createCampaignBtn');
const createModal = document.getElementById('createCampaignModal');
const createForm = document.getElementById('createCampaignForm');

createBtn.addEventListener('click', () => {
  createModal.classList.remove('hidden');
});

createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const name = document.getElementById('campaignNameInput').value;
    const system = document.getElementById('campaignSystemInput').value;
    const description = document.getElementById('campaignDescriptionInput').value;
    
    if (!name || !system) {
      alert('Please fill in all required fields');
      return;
    }
    
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';
    
    const campaignRef = await addDoc(collection(db, 'campaigns'), {
      userId: currentUser.uid,
      name: name,
      system: system,
      description: description,
      careEarned: 0,
      createdAt: serverTimestamp(),
      lastSession: null
    });
    
    console.log('Campaign created:', campaignRef.id);
    
    // Close modal and refresh
    createModal.classList.add('hidden');
    createForm.reset();
    createBtn.disabled = false;
    createBtn.textContent = 'Create Campaign';
    
    loadCampaigns();
    
  } catch (error) {
    console.error('Error creating campaign:', error);
    alert('Error creating campaign. Please try again.');
    createBtn.disabled = false;
    createBtn.textContent = 'Create Campaign';
  }
});

// Close modal when clicking outside
createModal.addEventListener('click', (e) => {
  if (e.target === createModal) {
    createModal.classList.add('hidden');
  }
});