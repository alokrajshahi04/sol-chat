const joi = require("joi");

module.exports.validateInput = function (validationSchema) {
  return (req, res, next) => {
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    req.body = value;
    next();
  };
};
