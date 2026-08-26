// Simple client-side pseudo-auth for demo purposes
const loginForm = document.getElementById('loginForm');
const loginSection = document.getElementById('login');
const homeSection = document.getElementById('home');
const errorEl = document.getElementById('error');
const logoutBtn = document.getElementById('btn-logout');

function showHome() {
  loginSection.style.display = 'none';
  homeSection.style.display = 'block';
  logoutBtn.style.display = 'inline-block';
}

function showLogin() {
  loginSection.style.display = 'block';
  homeSection.style.display = 'none';
  logoutBtn.style.display = 'none';
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  // fake check
  if (email === 'user@example.com' && password === 'password') {
    showHome();
  } else {
    errorEl.textContent = 'Credenciales inválidas';
  }
});

logoutBtn.addEventListener('click', () => {
  showLogin();
});

// Sticky header and back-to-top
const header = document.querySelector('.app-header');
const backBtn = document.createElement('button');
backBtn.className = 'back-to-top';
backBtn.textContent = '↑';
document.body.appendChild(backBtn);

window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    header.classList.add('sticky');
    backBtn.style.display = 'block';
  } else {
    header.classList.remove('sticky');
    backBtn.style.display = 'none';
  }
});

backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// Reveal elements on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Mark nav active on click
document.querySelectorAll('.main-nav a').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelectorAll('.main-nav a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
  });
});

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const mobileNav = document.getElementById('mobile-nav');
if (navToggle && mobileNav) {
  navToggle.addEventListener('click', () => {
    const open = mobileNav.style.display === 'block';
    mobileNav.style.display = open ? 'none' : 'block';
    navToggle.classList.toggle('open', !open);
  });
  // close when clicking a mobile link
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileNav.style.display = 'none'));
}
