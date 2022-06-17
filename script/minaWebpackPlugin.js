/* eslint-disable no-use-before-define */
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin')
const path = require('path')
const fs = require('fs')
const replaceExt = require('replace-ext')

const assetsChunkName = '__assets_chunk_name__'

/** 动态的遍历入口文件下所有子引用 */
function _inflateEntries(entries = [], dirname, entry) {
  const configFile = replaceExt(entry, '.json')
  const content = fs.readFileSync(configFile, 'utf8')
  const config = JSON.parse(content)

  const { pages, usingComponents, subPackages } = config
  pages && pages.forEach((item) => inflateEntries(entries, dirname, item))
  usingComponents && Object.values(usingComponents).forEach((item) => inflateEntries(entries, dirname, item))
  subPackages &&
    subPackages.forEach((subpackage) => {
      if(!subpackage.pages) {
        return 
      }
      return subpackage.pages.forEach((item) => inflateEntries(entries, dirname + `/${subpackage.root}`, item))
    })
}

function inflateEntries(entries, dirname, entry) {
  if (/plugin:\/\//.test(entry)) {
    console.log(`发现插件 ${entry}`)
    return
  }

  if (typeof entry === 'object') {
    entry = entry.app.import[0]
  }

  if (typeof entry !== 'string') {
    throw new Error('入口文件位置获取有误')
  }

  entry = path.resolve(dirname, entry)
  if (entry != null && !entries.includes(entry)) {
    entries.push(entry)
    _inflateEntries(entries, path.dirname(entry), entry)
  }
}

function first(entry, extensions) {
  for (const ext of extensions) {
    const file = replaceExt(entry, ext)
    if (fs.existsSync(file)) {
      return file
    }
  }
  return null
}

function all(entry, extensions) {
  const items = []
  for (const ext of extensions) {
    const file = replaceExt(entry, ext)
    if (fs.existsSync(file)) {
      items.push(file)
    }
  }
  return items
}

class MinaWebpackPlugin {
  constructor(options = {}) {
    this.scriptExtensions = options.scriptExtensions || ['.ts', '.js']
    this.assetExtensions = options.assetExtensions || []
    this.entries = []
  }

  applyEntry(compiler, done) {
    const { context } = compiler.options

    /**
     * 1. 替换扩展名
     * 2. 跟换文件路径为上下文路径
     * 3. 应用于每一个入口文件
     */
    this.entries
      .map((item) => first(item, this.scriptExtensions))
      .map((item) => path.relative(context, item))
      .forEach((item) => new SingleEntryPlugin(context, './' + item, replaceExt(item, '')).apply(compiler))

    this.entries
      .reduce((items, item) => [...items, ...all(item, this.assetExtensions)], [])
      .map((item) => './' + path.relative(context, item))
      .forEach((item) => new SingleEntryPlugin(context, item, item + assetsChunkName).apply(compiler))

    if (done) {
      done()
    }
  }

  apply(compiler) {
    const { context, entry } = compiler.options
    // 找到所有的入口文件，存放在 entries 里面
    inflateEntries(this.entries, context, entry)

    // 初始化options
    // 只要有一个插件返回了 true, 注册在这个钩子上的后续插件代码，将不会被调用
    compiler.hooks.entryOption.tap('MinaWebpackPlugin', () => {
      this.applyEntry(compiler)
      return true
    })

    // 监听编译过程
    compiler.hooks.watchRun.tap('MinaWebpackPlugin', (_compiler, done) => {
      this.applyEntry(_compiler, done)
    })

    // 生成好了 compilation 对象，可以在这里操作
    compiler.hooks.compilation.tap('MinaWebpackPlugin', (compilation) => {
      compilation.hooks.beforeChunkAssets.tap('MinaWebpackPlugin', () => {
        // beforeChunkAssets 事件在 compilation.createChunkAssets 方法之前被触发

        compilation.chunks.forEach((chunk) => {
          if (chunk.name.includes(assetsChunkName)) {
            // 移除该 chunk, 使之不会生成对应的 asset，也就不会输出文件
            compilation.chunks.delete(chunk)
          }
        })
      })
    })
  }
}

module.exports = MinaWebpackPlugin
