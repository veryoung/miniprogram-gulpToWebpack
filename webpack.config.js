const { resolve } = require('path')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MinaWebpackPlugin = require('./script/MinaWebpackPlugin')
const MinaRuntimePlugin = require('./script/MinaRuntimePlugin')
const { getConfig, getLoaderConfigByExtensions } = require('./script/config')
const entry = resolve(__dirname, 'src', 'app.js')
const include = new RegExp('src')
const valReplaceloader = resolve(__dirname, 'script', 'replace-val-loader.js')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
// 打包模式 ci | develop
const env = process.env.NODE_ENV
const mode = process.env.BUILD_TYPE
const envMode = mode === 'ci' ? 'production' : 'development'
const envConfig = getConfig(env, mode, isNoWaConsole)

// 提取环境配置
const { context } = envConfig

const { NO_WA_CONSOLE, CDN_ENV, OUTPUT_DIR } = context
console.log(`环境：${env} 构建类型：${mode} 构建模式：${envMode}`)

/** 注入条件编译的环境变量 */
const conditionalCompiler = {
  loader: 'js-conditional-compile-loader',
  options: {
    isDebug: envMode === 'development',
    isEnv: CDN_ENV !== 'prod',
    isProd: CDN_ENV === 'prod',
    isM1: env === 'M1',
    isN: env === 'N',
    isProdDebug: env === 'productDebug',
    isNoWaConsole: NO_WA_CONSOLE,
  },
}

module.exports = {
  mode: envMode,
  context: resolve('src'),
  entry: {
    app: entry,
  },
  output: {
    path: resolve(OUTPUT_DIR),
    filename: '[name].js',
    publicPath: resolve(OUTPUT_DIR),
    globalObject: 'wx',
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      '@': resolve('src'),
      'mobx-miniprogram': resolve('src/miniprogram_npm/mobx-miniprogram/index.js'),
      'miniprogram-computed': resolve('src/miniprogram_npm/miniprogram-computed/index.js'),
      'mobx-miniprogram-bindings': resolve('src/miniprogram_npm/mobx-miniprogram-bindings/index.js'),
      rfdc: resolve('src/miniprogram_npm/rfdc/index.js'),
      'fast-deep-equal': resolve('src/miniprogram_npm/fast-deep-equal/index.js'),
      'miniprogram-api-promise': resolve('src/miniprogram_npm/miniprogram-api-promise/index.js'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js)x?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: valReplaceloader,
            options: {
              all: getLoaderConfigByExtensions(context, 'js'),
            },
          },
          'babel-loader',
          conditionalCompiler,
        ],
      },
      {
        test: /\.(scss)$/,
        include: /src/,
        use: [
          {
            loader: 'file-loader',
            options: {
              useRelativePath: true,
              name: '[path][name].wxss',
              context: resolve('src'),
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                includePaths: [resolve('src', 'styles'), resolve('src')],
              },
            },
          },
          {
            loader: valReplaceloader,
            options: {
              all: getLoaderConfigByExtensions(context, 'scss'),
            },
          },
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|svg|png|gif|jpeg|jpg|wxs|wxss)\??.*$/,
        include,
        type: 'javascript/auto',
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 50000,
            },
          },
        ],
      },
      {
        test: /\.wxml$/,
        include: /src/,
        use: [
          {
            loader: 'file-loader',
            options: {
              useRelativePath: true,
              name: '[path][name].wxml',
              context: resolve('src'),
            },
          },
          {
            loader: valReplaceloader,
            options: {
              all: getLoaderConfigByExtensions(context, 'wxml'),
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanStaleWebpackAssets: false,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: '**/*',
          to: './',
          filter: (resourcePath) => !['.js', '.scss'].some((item) => resourcePath.endsWith(item)),
        },
      ],
    }),
    new MinaWebpackPlugin({
      scriptExtensions: ['.js'],
      assetExtensions: ['.scss', '.png', '.wxss', '.wxml'],
    }),
    new MinaRuntimePlugin(),
    new webpack.DefinePlugin({
      __WEBPACK__ENV: JSON.stringify(process.env.NODE_ENV) || 'M1',
      BUILDTYPE: JSON.stringify(process.env.BUILD_TYPE) || 'develop',
    }),
    // new BundleAnalyzerPlugin({
    //   analyzerMode: 'static',
    //   analyzerPort: 8091, // 运行后的端口号 可以修改
    //   generateStatsFile: true,
    //   statsOptions: { source: false },
    // }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 30000,
      minChunks: 1,
      name: false,
      cacheGroups: {
        lib: {
          test: resolve('src/lib'),
          priority: -20,
          name: 'lib',
        },
        miniProgram: {
          test: resolve('src/miniprogram_npm'),
          priority: -20,
          name: 'miniProgram',
        },
        service: {
          name: 'service',
          test: resolve('src/service'),
          priority: -25,
          minChunks: 3,
        },
        api: {
          name: 'api',
          test: resolve('src/api'),
          priority: -25,
          minChunks: 3,
        },
        default: {
          test: function (module) {
            if (module.resource) {
              if (
                module.resource.match('package[a-zA-Z]*/service') ||
                module.resource.match('package[a-zA-Z]*/store') ||
                module.resource.match('package[a-zA-Z]*/config')
              ) {
                return false
              }
            }
            return true
          },
          minChunks: 2,
          priority: -30,
          reuseExistingChunk: true,
          name: 'common',
        },
      },
    },
    runtimeChunk: {
      name: 'runtime',
    },
    usedExports: true,
  },
  devtool: mode !== 'ci' ? 'cheap-module-source-map' : 'source-map',
}
