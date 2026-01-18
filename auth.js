import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  setDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Redirect if already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = 'dashboard.html';
  }
});

// Show error/success messages
function showMessage(text, type = 'error') {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800');
  
  if (type === 'error') {
    messageEl.classList.add('bg-red-100', 'text-red-800');
  } else {
    messageEl.classList.add('bg-green-100', 'text-green-800');
  }
  
  setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 5000);
}

// Make simple hash from email + uid
function makeHash(email, uid) {
  // Just use first 8 chars of uid + first 4 of email
  return (uid.substring(0, 8) + email.substring(0, 4)).toLowerCase();
}

// Create user in Firestore after signup
async function createUserInFirestore(user, hash) {
  try {
    const userRef = doc(db, 'users', user.uid);
    
    await setDoc(userRef, {
      email: user.email,
      uid: user.uid,
      portalHash: hash,
      careBalance: 0,
      eggStatus: 'none',
      eggSessionsRemaining: 10,
      dragonId: null,
      dragonName: null,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
    
    console.log('✅ User created:', hash);
    return true;
    
  } catch (error) {
    console.error('❌ Firestore error:', error);
    throw error;
  }
}

// SIGNUP FORM
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
  
  if (password !== passwordConfirm) {
    showMessage('Passwords do not match', 'error');
    return;
  }
  
  try {
    console.log('Creating account...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const hash = makeHash(email, user.uid);
    await createUserInFirestore(user, hash);
    
    showMessage('Account created! Redirecting...', 'success');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 2000);
    
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      showMessage('Email already registered', 'error');
    } else if (error.code === 'auth/weak-password') {
      showMessage('Password too short', 'error');
    } else {
      showMessage('Error: ' + error.message, 'error');
    }
  }
});

// LOGIN FORM
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    console.log('Logging in...');
    await signInWithEmailAndPassword(auth, email, password);
    showMessage('Login successful!', 'success');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
    
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Invalid email or password', 'error');
  }
});