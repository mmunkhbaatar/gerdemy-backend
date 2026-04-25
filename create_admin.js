const fetch = require('node-fetch'); // we'll use global fetch available in node 18+

async function createAdmin() {
  const API_KEY = 'AIzaSyA7C1R9gTO6MXiv9rPpSzURgLd7ZRiuXLU';

  try {
    // 1. Create user in Firebase
    console.log('Sending request to Firebase to create user...');
    let res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gerdemy.com',
        password: '123456+',
        returnSecureToken: true
      })
    });
    
    let data = await res.json();
    
    if (data.error) {
      if (data.error.message === 'EMAIL_EXISTS') {
        console.log('User already exists in Firebase. Trying to login to get token...');
        res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@gerdemy.com',
            password: '123456+',
            returnSecureToken: true
          })
        });
        data = await res.json();
      } else {
        console.error('Firebase Error:', data.error);
        return;
      }
    }

    const idToken = data.idToken;
    console.log('Successfully got token from Firebase. Now registering/logging into our Backend as ADMIN...');

    // 2. Register via backend to insert into Prisma with role ADMIN
    res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ role: 'ADMIN' })
    });
    
    const backendData = await res.json();
    console.log('Backend Response:', backendData);

    // 3. Just to be absolutely sure, update the database directly using Prisma
    // (This works because this script runs from inside gerdemy-backend)
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.user.update({
      where: { email: 'admin@gerdemy.com' },
      data: { role: 'ADMIN' }
    });
    
    console.log('Successfully confirmed role is ADMIN in PostgreSQL!');
    await prisma.$disconnect();
    
  } catch (err) {
    console.error('Script Failed:', err);
  }
}

createAdmin();
