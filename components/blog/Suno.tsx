export default function Suno({ id }: { id: string }) {
  return (
    <div className="suno-embed">
      <iframe
        src={`https://suno.com/embed/${id}`}
        title="Listen on Suno"
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
