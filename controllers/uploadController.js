// Returns the URL of an uploaded file. Used by the REST upload endpoints.
exports.uploadPoster = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No poster file provided.' });
  res.json({ success: true, url: '/uploads/posters/' + req.file.filename });
};

exports.uploadBackdrop = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No backdrop file provided.' });
  res.json({ success: true, url: '/uploads/backdrops/' + req.file.filename });
};
