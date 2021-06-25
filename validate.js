const schema = require('./schema.json')
const addFormats = require('ajv-formats').default
const Ajv = require('ajv')
const ajv = new Ajv({ allErrors: true })

addFormats(ajv)

function validate (tokenList) {
  const validate = ajv.compile(schema)
  const valid = validate(tokenList)

  if (!valid) {
    throw new Error(JSON.stringify(validate.errors))
  }

  return true
}

module.exports = validate