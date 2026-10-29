import { useEffect, useState } from 'react';

/** Slow crossfading photo carousel in a tilted polaroid frame. */
export function Carousel({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % photos.length), 5000);
    return () => clearInterval(id);
  }, [photos.length]);
  if (photos.length === 0) return null;
  return (
    <div className="carousel" aria-hidden="true">
      <div className="frame">
        {photos.map((src, i) => (
          <img key={src} src={`${import.meta.env.BASE_URL}${src}`} alt="" className={i === index ? 'on' : ''} />
        ))}
      </div>
      <div className="caption">🍀 🍺 🎰 🍀</div>
    </div>
  );
}
