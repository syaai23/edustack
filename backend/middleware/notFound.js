const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    error: 'ROUTE_NOT_FOUND'
  });
};

module.exports = notFound;
