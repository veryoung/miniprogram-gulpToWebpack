const { getOptions } = require('loader-utils')

function getOptionsArray (config) {
  const rawOptions = getOptions(config)
  const optionsArray = []
  for (const optionsIndex in rawOptions.all) {
    optionsArray[optionsIndex] = Object.assign({}, rawOptions.all[optionsIndex])
  }
  return optionsArray
}

function replace (source, options, context) {
    const { attr, configEcho, dataEcho } = options
    let search
    if (options.search instanceof RegExp) {
      search = options.search
    } else if (attr !== null) {
        if(configEcho) {
            search= new RegExp(`/\\* @echo ${options.search} \\*/`, attr)
        } else if(dataEcho){
            search= new RegExp(`<!-- @echo ${options.search} -->`, attr)
        }else {
            search = new RegExp(options.search, attr)
        }
    } else {
      search = options.search
    }
  
    let replace
    if (typeof options.replace === 'function') {
      replace = options.replace.bind(context)
    } else {
      replace = options.replace
    }

    const newSource = source.replace(search, replace)
    return newSource
  }

function processChunk (source, map) {
  this.cacheable()

  const optionsArray = getOptionsArray(this)
  let newSource = source

  for (const options of optionsArray) {
    newSource = replace(newSource, options, this)
  }

  this.callback(null, newSource, map)
}

module.exports = processChunk
