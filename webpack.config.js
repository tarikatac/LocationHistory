const path = require("path");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "development",
  entry: [
    "./src/js/app.js", "./src/scss/app.scss"
  ],
  output: {
    path: path.resolve(__dirname, "dist/js"),
    filename: "index.js"
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      },
    ]
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, './dist'),
    }
  },
  plugins: [
    new NodePolyfillPlugin({ excludeAliases: ['console'] }),
    new MiniCssExtractPlugin({ filename: '../css/app.css'})
  ]
};