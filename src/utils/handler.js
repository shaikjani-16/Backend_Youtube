const handler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((err) => next(err));
  };
};
export default handler;
