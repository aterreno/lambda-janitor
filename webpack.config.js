const path = require('path')

const entries = {
  lambdaJanitor: './index',
}

module.exports = {
  context: __dirname,
  target: 'node',
  mode: 'production',
  devtool: 'source-map',
  entry: { ...entries },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'ts',
          target: 'node14.16',
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    plugins: [],
    extensions: ['.tsx', '.ts', '.js'],
    modules: ['node_modules'],
  },
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: '[name]/index.js',
    libraryTarget: 'commonjs2',
  }
}
