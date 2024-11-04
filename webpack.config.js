// webpack.config.js
import path from 'path'
import nodeExternals from 'webpack-node-externals'
import { fileURLToPath } from 'url'
const __filenameNew = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filenameNew)
export default {
  target: 'node',
  entry: './app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
}
