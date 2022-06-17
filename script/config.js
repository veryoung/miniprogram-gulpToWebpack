const { configList } = require('../src/config') // 获取各环境下的配置文件
const { configM1, configN, configProd, configProdDebug } = configList
const packageJSON = require('../package.json')

/** 需要替换的全局变量 */
const gloablVal = ['APP_ID', 'MINI_VER', 'CDN_PREFIX']

/** 版本号 */
const version = packageJSON.version

/** 所有的默认配置 */
const allOptions = {
  app_id: {
    dev: configM1.appid || '',
    M1: configM1.appid || '',
    N: configN.appid || '',
    prod: configProd.appid || '',
    prodDebug: configProdDebug.appid || '',
  },
  cdn_prefix: {
    dev: 'http://127.0.0.1:8088',
    M1: '',
    N: '',
    prod: '',
    prodDebug: '',
  },
  output_dirs: {
    dev: 'build',
    M1: 'build', // 开发目录
    N: 'build', // 开发目录
    prod: 'dist', // 发布目录
    prodDebug: 'dist', // 发布目录
  },
  showDebugTools: {
    dev: true,
    M1: true,
    N: true,
    prod: false,
    prodDebug: true,
  },
  cdn_env: {
    dev: 'dev',
    M1: 'sit',
    N: 'sit',
    prod: 'prod',
    prodDebug: 'prod',
  },
}

/** 根据打包环境，打包模式,是否需要walog,获取所有打包配置 */
function getConfig(env, mode, isWalog = false) {
  const { app_id, cdn_prefix, output_dirs, showDebugTools, cdn_env } = allOptions
  const outputDir = mode === 'ci' ? './cibuild/' : `./${allOptions.output_dirs[env]}/`

  const context = {
    NET_ENV: env,
    CDN_ENV: cdn_env[env],
    CDN_PREFIX: cdn_prefix[env],
    APP_ID: app_id[env],
    MINI_VER: version,
    NO_WA_CONSOLE: isWalog, // 隐藏wa的console
    SHOW_DEBUG_TOOLS: showDebugTools[env],
    OUTPUT_DIR: output_dirs[env],
  }

  const options = {
    context,
    version,
    outputDir,
  }
  return options
}

/** 根据不同的文件类型返回loader所需的过滤配置 */
function getLoaderConfigByExtensions(config, type) {
  const defaultConfig = []
  for(let key in config) {
    if(gloablVal.includes(key)) {
      const defaultVal = {
        search: key,
        replace: config[key],
        attr: 'g',
      }
      switch(type) { 
        case 'js':
        case 'scss':
        case 'wxss':
          defaultConfig.push({
            ...defaultVal,
            configEcho: true,
          })
          break
        case 'wxml':
          defaultConfig.push({
            ...defaultVal,
            dataEcho: true,
          })
          break
      }
    }
  }
  return defaultConfig
}

module.exports = {
  getConfig,
  getLoaderConfigByExtensions
}
