export function notFound(_request, response, _next) {
  response.status(404).json({ message: 'The requested API route was not found.' });
}

// Express recognizes this as error middleware because it has four parameters.
export function errorHandler(error, _request, response, _next) {
  console.error(error);
  response.status(error.status || 500).json({
    message: error.status && error.status < 500 ? error.message : 'An unexpected server error occurred.',
  });
}
