if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => console.log('SW зарегистрирован, scope:', reg.scope))
      .catch((err) => console.error('Ошибка регистрации SW:', err));
  });
}
