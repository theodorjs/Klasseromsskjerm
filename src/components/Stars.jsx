import { useEffect, useRef } from 'react';

function generateStarShadows(n) {
  const shadows = [];
  for (let i = 0; i < n; i++) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * 2000;
    shadows.push(`${x}px ${y}px #FFF`);
  }
  return shadows.join(', ');
}

export default function Stars() {
  const s1 = useRef(null);
  const s2 = useRef(null);
  const s3 = useRef(null);

  function updateStars() {
    if (!s1.current || !s2.current || !s3.current) return;
    const shadow1 = generateStarShadows(700);
    const shadow2 = generateStarShadows(200);
    const shadow3 = generateStarShadows(100);
    s1.current.style.boxShadow = shadow1;
    s2.current.style.boxShadow = shadow2;
    s3.current.style.boxShadow = shadow3;
    s1.current.style.setProperty('--after-shadow', generateStarShadows(700));
    s2.current.style.setProperty('--after-shadow', generateStarShadows(200));
    s3.current.style.setProperty('--after-shadow', generateStarShadows(100));
  }

  useEffect(() => {
    updateStars();
    window.addEventListener('resize', updateStars);
    return () => window.removeEventListener('resize', updateStars);
  }, []);

  return (
    <>
      <div id="stars" ref={s1}></div>
      <div id="stars2" ref={s2}></div>
      <div id="stars3" ref={s3}></div>
    </>
  );
}
