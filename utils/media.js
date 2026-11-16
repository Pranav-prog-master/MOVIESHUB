// Helpers for deciding whether a URL can be safely embedded (YouTube / Vimeo)
// and for turning a provider URL into an embeddable iframe src.

function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function vimeoId(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

// Returns an embeddable iframe URL, or null when embedding is not permitted.
function getEmbedUrl(url) {
  if (!url) return null;
  const yt = youtubeId(url);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const v = vimeoId(url);
  if (v) return `https://player.vimeo.com/video/${v}`;
  return null;
}

function isYouTube(url) {
  return Boolean(youtubeId(url));
}

module.exports = { getEmbedUrl, isYouTube, youtubeId, vimeoId };
