// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    document.body.classList.toggle('menu-open', links.classList.contains('open'));
  });

  // Sluit menu bij klik op een link binnen het menu
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      document.body.classList.remove('menu-open');
    });
  });

  // Sluit menu bij klik buiten het menu
  document.addEventListener('click', (e) => {
    if (!links.classList.contains('open')) return;
    if (!e.target.closest('.nav-inner')) {
      links.classList.remove('open');
      document.body.classList.remove('menu-open');
    }
  });
}

// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
if (reveals.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach(r => io.observe(r));
}
