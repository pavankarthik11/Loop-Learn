const url = 'https://loop-learn-2i8o.vercel.app/api/users/register';

const testRegistration = async () => {
  const formData = new FormData();
  formData.append('fullName', 'Test User');
  formData.append('email', 'karthiktellakula11@gmail.com');
  formData.append('username', 'testuser_' + Date.now());
  formData.append('password', 'password123');
  formData.append('phone', '1234567890');
  
  // Create a dummy file
  const blob = new Blob(['dummy content'], { type: 'image/png' });
  formData.append('avatar', blob, 'avatar.png');

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    const text = await res.text();
    console.log('Status code:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
};

testRegistration();
